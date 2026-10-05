"""
Vérifier qu'un commit se reconstruit à l'identique
===================================================

    git commit ...
    python source/verifier.py
    git push

L'action quotidienne (.github/workflows/publier.yml) travaille dans un dépôt
PROPRE : elle clone l'historique complet, reconstruit le site, l'audite, puis
publie ce qui diffère du dernier commit. Un build fait sur un poste de travail
n'a pas cette garantie, et deux incidents l'ont montré :

- le 2 et le 4 octobre 2026, un ``index.html`` construit en local référençait
  des ``.png`` que le dépôt ne contient pas : neuf logos d'écoles en 404
  pendant une vingtaine d'heures. Des PNG non suivis par Git traînaient dans
  ``source/static/img/`` et le build les préférait aux WebP ;
- une page d'article construite mais jamais ajoutée au commit : le sitemap
  l'annonçait, le serveur répondait 404.

Dans les deux cas le dossier de travail paraissait correct. Ce script ne le
regarde donc PAS : il clone le dernier commit, reconstruit dans ce clone avec
le script de construction du commit lui-même, et compare. Ce qu'il vérifie est
exactement ce que l'action verrait.

Ce qu'il contrôle, dans l'ordre :

1. la reconstruction aboutit ;
2. l'audit passe (sinon l'action s'arrête et rien n'est publié) ;
3. la sortie est identique au commit : aucun fichier au contenu différent,
   aucun fichier produit mais absent du commit, aucun fichier du commit que le
   build ne produit plus ;
4. aucune page ne référence un fichier local qui n'existe pas.

Ce qu'il ne contrôle pas : le dossier de travail (commitez d'abord), le site
en ligne, le déploiement chez Cloudflare.

Codes de sortie : 0 identique, 1 écart ou audit en échec, 2 erreur d'exécution.
"""

import argparse
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import time
from pathlib import Path

# La console Windows est en cp1252 : un accent ou une flèche y fait planter
# print(). On force UTF-8 plutôt que de s'interdire le français.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):  # sortie redirigée, déjà correcte
    pass

RACINE_PAR_DEFAUT = Path(__file__).resolve().parent.parent

# Dossiers du dépôt qui ne sont pas du site servi : on n'y cherche pas de
# pages à contrôler.
IGNORES = {".git", "source", "node_modules"}

# Une référence locale vers une ressource : src="/img/x.webp?v=ab12cd34".
# Seules les valeurs qui sont UNE adresse sont lues ; les srcset à plusieurs
# adresses, rares ici, sont laissés de côté.
REFERENCE = re.compile(
    r'(?:src|href|content)="(/[^"#? ]+\.'
    r'(?:png|webp|jpe?g|svg|css|js|json|ico|woff2?|xml|txt))(?:\?[^"]*)?"')


class ErreurExecution(Exception):
    """Quelque chose a empêché de vérifier : ce n'est pas un écart du site."""


# --- Git ----------------------------------------------------------------

def git(arguments, cwd):
    """Une commande Git, sortie décodée en UTF-8.

    core.quotePath=false : sans lui, Git entoure d'octal tout chemin qui
    contient un caractère non ASCII, et les comparaisons de noms échouent.
    """
    return subprocess.run(
        ["git", "-c", "core.quotePath=false", *arguments],
        cwd=str(cwd), capture_output=True, text=True,
        encoding="utf-8", errors="replace")


def racine_du_depot(chemin: Path) -> Path:
    resultat = git(["rev-parse", "--show-toplevel"], chemin)
    if resultat.returncode != 0:
        raise ErreurExecution(f"{chemin} n'est pas dans un dépôt Git.")
    return Path(resultat.stdout.strip())


def avertissements_du_poste(depot: Path) -> list:
    """Ce qui rend le dossier de travail différent de ce qui sera vérifié.

    Ce ne sont pas des échecs : la vérification porte sur le commit. Mais
    quelqu'un qui lit « identique » doit savoir que cela ne dit rien de ce
    qu'il a modifié depuis.
    """
    notes = []
    modifie = git(["diff", "--ignore-cr-at-eol", "--quiet"], depot).returncode
    indexe = git(["diff", "--cached", "--quiet"], depot).returncode
    if modifie != 0 or indexe != 0:
        notes.append(
            "Des modifications ne sont pas commitées : cette vérification "
            "porte sur le DERNIER COMMIT, pas sur le dossier de travail.")

    non_suivis = git(
        ["ls-files", "--others", "--exclude-standard", "--", "source/static"],
        depot).stdout.split("\n")
    non_suivis = [chemin for chemin in non_suivis if chemin]
    if non_suivis:
        notes.append(
            f"{len(non_suivis)} fichier(s) non suivi(s) dans source/static "
            f"(par exemple {non_suivis[0]}). Ils n'entrent pas dans cette "
            "vérification, mais faussent un build local : des .png absents du "
            "dépôt ont ainsi pris la place des .webp commités.")
    return notes


# --- Étapes ---------------------------------------------------------------

def supprimer(chemin: Path):
    """Supprime un clone, fichiers en lecture seule compris.

    Git écrit ses objets en lecture seule : sous Windows, rmtree échoue
    dessus et laisse un dossier de plusieurs dizaines de mégaoctets.
    """
    def retirer(fonction, cible, *_):
        os.chmod(cible, stat.S_IWRITE)
        fonction(cible)

    if sys.version_info >= (3, 12):
        shutil.rmtree(chemin, onexc=retirer)
    else:
        shutil.rmtree(chemin, onerror=retirer)


def cloner(depot: Path, destination: Path) -> int:
    """Clone l'historique COMPLET, comme le fait l'action avec fetch-depth: 0.

    --no-local : sans lui, Git clone un dépôt local par liens physiques et
    ignore toute limite de profondeur. Ici la profondeur est entière, mais on
    veut le même chemin de code que pour un dépôt distant.
    """
    resultat = git(["clone", "--no-local", "--quiet", str(depot),
                    str(destination)], depot)
    if resultat.returncode != 0:
        raise ErreurExecution(f"Le clone a échoué : {resultat.stderr.strip()}")
    compte = git(["rev-list", "--count", "HEAD"], destination)
    return int(compte.stdout.strip() or 0)


def lancer(script: str, clone: Path, delai: int = 900):
    """Exécute un script du CLONE, avec la sortie dirigée vers le clone.

    C'est le script du commit qui tourne, pas celui du poste : vérifier un
    commit avec un build plus récent que lui ne vérifierait rien.
    """
    environnement = dict(os.environ, PREPACARDS_SORTIE=str(clone),
                         PYTHONIOENCODING="utf-8")
    # PREPACARDS_TOUT sortirait la file d'attente entière : l'action ne le
    # pose jamais, la vérification non plus.
    environnement.pop("PREPACARDS_TOUT", None)
    try:
        return subprocess.run(
            [sys.executable, str(clone / "source" / script)], cwd=str(clone),
            env=environnement, capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=delai)
    except subprocess.TimeoutExpired as erreur:
        raise ErreurExecution(
            f"{script} n'a pas fini en {delai} s.") from erreur


def ecarts(clone: Path):
    """(contenu différent, produits mais absents du commit, disparus).

    --ignore-cr-at-eol : Windows écrit en CRLF, Git range en LF. Sans lui,
    une cinquantaine de fichiers apparaissent « modifiés » sans l'être. Il ne
    touche pas aux fichiers binaires, comparés tels quels.
    """
    modifies, supprimes = [], []
    resultat = git(["diff", "--ignore-cr-at-eol", "--name-status"], clone)
    for ligne in resultat.stdout.splitlines():
        statut, _, chemin = ligne.partition("\t")
        (supprimes if statut.startswith("D") else modifies).append(chemin)

    nouveaux = git(["ls-files", "--others", "--exclude-standard"],
                   clone).stdout.splitlines()
    return modifies, nouveaux, supprimes


def references_cassees(clone: Path) -> dict:
    """Références locales vers un fichier qui n'existe pas dans la sortie."""
    cassees = {}
    for dossier, sous_dossiers, fichiers in os.walk(clone):
        if Path(dossier) == clone:
            sous_dossiers[:] = [d for d in sous_dossiers if d not in IGNORES]
        for nom in fichiers:
            if not nom.endswith(".html"):
                continue
            page = Path(dossier) / nom
            texte = page.read_text(encoding="utf-8", errors="replace")
            for reference in set(REFERENCE.findall(texte)):
                if not (clone / reference.lstrip("/")).exists():
                    cassees.setdefault(reference, []).append(
                        page.relative_to(clone).as_posix())
    return cassees


def lister(chemins, limite=12):
    for chemin in chemins[:limite]:
        print(f"      {chemin}")
    if len(chemins) > limite:
        print(f"      … et {len(chemins) - limite} autre(s)")


# --- Programme --------------------------------------------------------------

def analyser(argv):
    parseur = argparse.ArgumentParser(
        description="Vérifie que le dernier commit se reconstruit à "
                    "l'identique dans un clone propre, comme le fait l'action.")
    parseur.add_argument(
        "depot", nargs="?", default=str(RACINE_PAR_DEFAUT),
        help="dépôt à vérifier (par défaut : celui de ce script)")
    parseur.add_argument(
        "--garder", action="store_true",
        help="conserver le clone reconstruit pour l'examiner")
    parseur.add_argument(
        "--sans-audit", action="store_true",
        help="ne pas lancer audit_site.py")
    return parseur.parse_args(argv)


def main(argv=None) -> int:
    arguments = analyser(argv)
    debut = time.monotonic()
    clone = None
    try:
        depot = racine_du_depot(Path(arguments.depot).resolve())
        sommet = git(["log", "-1", "--format=%h %s"], depot).stdout.strip()
        print(f"Vérification de {depot.name} — {sommet}")
        for note in avertissements_du_poste(depot):
            print(f"  ! {note}")
        print()

        clone = Path(tempfile.mkdtemp(prefix="prepacards_verif_")) / "depot"
        nombre = cloner(depot, clone)
        print(f"  1. clone complet ({nombre} commits)")

        construction = lancer("build_site.py", clone)
        if construction.returncode != 0:
            print("  2. construction : ÉCHEC")
            print(construction.stdout[-1500:] + construction.stderr[-1500:])
            return 1
        print("  2. construction réussie")

        echecs = 0

        if not arguments.sans_audit:
            audit = lancer("audit_site.py", clone)
            if audit.returncode != 0:
                echecs += 1
                print("  3. audit : ÉCHEC — l'action s'arrêterait ici et "
                      "rien ne serait publié")
                for ligne in audit.stdout.strip().splitlines()[-8:]:
                    print(f"      {ligne}")
            else:
                print("  3. audit : aucun problème")

        modifies, nouveaux, supprimes = ecarts(clone)
        if modifies or nouveaux or supprimes:
            echecs += 1
            print("  4. comparaison au commit : ÉCART")
            if modifies:
                print(f"    {len(modifies)} fichier(s) au contenu différent. "
                      "Le commit contient une version que le dépôt ne produit "
                      "pas :")
                print("      typiquement un build local avec des fichiers non "
                      "suivis.")
                lister(modifies)
            if nouveaux:
                print(f"    {len(nouveaux)} fichier(s) produits par le build "
                      "mais ABSENTS du commit (git add manquant) :")
                lister(nouveaux)
                parutions = [c for c in nouveaux
                             if re.fullmatch(r"blog/[^/]+/index\.html", c)]
                if parutions:
                    print("      Si une parution est due aujourd'hui, c'est "
                          "attendu : l'action la publiera, et le sitemap, rss "
                          "et le sommaire du blog changent avec elle.")
            if supprimes:
                print(f"    {len(supprimes)} fichier(s) du commit que le "
                      "build ne produit plus (périmés) :")
                lister(supprimes)
        else:
            print("  4. comparaison au commit : identique")

        cassees = references_cassees(clone)
        if cassees:
            echecs += 1
            print(f"  5. références : {len(cassees)} fichier(s) référencé(s) "
                  "mais absent(s)")
            lister([f"{ref}  <- {pages[0]}" for ref, pages in cassees.items()])
        else:
            print("  5. références : tous les fichiers référencés existent")

        duree = time.monotonic() - debut
        print()
        if echecs:
            print(f"ÉCART ({duree:.0f} s) — ne poussez pas avant d'avoir "
                  "compris pourquoi.")
            return 1
        print(f"IDENTIQUE ({duree:.0f} s) — l'action reconstruira exactement "
              "ce qui est commité.")
        return 0

    except ErreurExecution as erreur:
        print(f"Impossible de vérifier : {erreur}", file=sys.stderr)
        return 2
    finally:
        if clone is not None:
            if arguments.garder:
                print(f"\nClone conservé : {clone}")
            else:
                supprimer(clone.parent)


if __name__ == "__main__":
    sys.exit(main())
