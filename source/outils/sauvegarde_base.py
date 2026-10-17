"""
Sauvegarde chiffrée de la base de données, sur votre poste
===========================================================

    python source/outils/sauvegarde_base.py                    sauvegarder
    python source/outils/sauvegarde_base.py --verifier F.pcbak vérifier un fichier
    python source/outils/sauvegarde_base.py --dechiffrer F.pcbak [--sortie f.json]

Ce que ça fait : lit chaque table du projet (par l'API, avec la clé
service_role) ainsi que la liste des comptes d'authentification, assemble le
tout en un JSON, le compresse et le CHIFFRE (scrypt + Fernet) avec un mot de
passe que vous seul connaissez. Le fichier peut donc être posé sur un disque
externe ou un stockage en ligne sans exposer vos utilisateurs.

Ce que ça ne fait PAS, et vaut mieux savoir :
  - ce n'est pas une sauvegarde « à un instant précis » : les tables sont lues
    l'une après l'autre. Pour une restauration à la minute près, il faut les
    sauvegardes Supabase (offre Pro) ;
  - les mots de passe des utilisateurs n'en font pas partie : l'API ne les
    donne pas, et c'est tant mieux. Restaurer des comptes suppose de les
    recréer ou de s'appuyer sur la sauvegarde Supabase ;
  - rien ne s'exécute tout seul : planifiez-le (voir A-FAIRE-PAR-VOUS.md).

Si l'outil pg_dump est installé ET que SUPABASE_DB_URL est défini, un export
natif PostgreSQL (format custom) est aussi chiffré et conservé à côté du JSON.

Variables d'environnement :
  SUPABASE_SERVICE_ROLE_KEY            obligatoire (voir _commun.py)
  PREPACARDS_SAUVEGARDE_MOT_DE_PASSE   mot de passe de chiffrement (12 caractères
                                       au moins) ; sinon il est demandé
  PREPACARDS_SAUVEGARDE_DOSSIER        destination (défaut : ~/PrepaCards-sauvegardes)
  SUPABASE_DB_URL                      facultatif, pour pg_dump
Prérequis Python : pip install cryptography
"""

from __future__ import annotations

import argparse
import base64
import getpass
import gzip
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _commun as c

ENTETE = b"PCBAK1"
TAILLE_SEL = 16
PAGE = 1000
DEFAUT_GARDER = 30

# table -> colonnes de tri (ordre stable pour la pagination)
TABLES = {
    "profiles": "id",
    "sauvegardes": "compte_id",
    "evenements_stripe": "id",
    "usages_scan": "compte_id,mois",
    "liste_attente": "id",
    "rapports_erreurs": "id",
    "emails_envoyes": "user_id,type",
}


# --- Chiffrement ----------------------------------------------------------

def _cle(mot_de_passe: str, sel: bytes) -> bytes:
    from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

    brut = Scrypt(salt=sel, length=32, n=2 ** 15, r=8, p=1).derive(
        mot_de_passe.encode("utf-8"))
    return base64.urlsafe_b64encode(brut)


def chiffrer(donnees: bytes, mot_de_passe: str) -> bytes:
    from cryptography.fernet import Fernet

    sel = os.urandom(TAILLE_SEL)
    return ENTETE + sel + Fernet(_cle(mot_de_passe, sel)).encrypt(donnees)


def dechiffrer(contenu: bytes, mot_de_passe: str) -> bytes:
    from cryptography.fernet import Fernet, InvalidToken

    if not contenu.startswith(ENTETE):
        raise c.OutilErreur("Ce fichier n'est pas une sauvegarde PrépaCards.")
    sel = contenu[len(ENTETE):len(ENTETE) + TAILLE_SEL]
    try:
        return Fernet(_cle(mot_de_passe, sel)).decrypt(contenu[len(ENTETE) + TAILLE_SEL:])
    except InvalidToken as e:
        raise c.OutilErreur("Mot de passe incorrect, ou fichier altéré.") from e


def mot_de_passe_chiffrement(confirmer: bool) -> str:
    mdp = os.environ.get("PREPACARDS_SAUVEGARDE_MOT_DE_PASSE", "")
    if not mdp:
        mdp = getpass.getpass("Mot de passe de chiffrement : ")
        if confirmer and getpass.getpass("Retapez-le : ") != mdp:
            raise c.OutilErreur("Les deux mots de passe diffèrent.")
    if confirmer and len(mdp) < 12:
        raise c.OutilErreur("Mot de passe trop court : 12 caractères au moins.")
    return mdp


# --- Lecture de la base ---------------------------------------------------

def lire_table(nom: str, tri: str, appeler=c.appeler) -> list:
    lignes, depart = [], 0
    while True:
        chemin = (f"/rest/v1/{nom}?select=*&order={urllib.parse.quote(tri, safe=',')}"
                  f"&limit={PAGE}&offset={depart}")
        page = appeler(chemin) or []
        lignes.extend(page)
        if len(page) < PAGE:
            return lignes
        depart += PAGE


def lire_comptes(appeler=c.appeler) -> list:
    comptes, page = [], 1
    while True:
        reponse = appeler(f"/auth/v1/admin/users?page={page}&per_page={PAGE}") or {}
        utilisateurs = reponse.get("users", []) if isinstance(reponse, dict) else []
        for u in utilisateurs:
            comptes.append({k: u.get(k) for k in (
                "id", "email", "created_at", "email_confirmed_at",
                "last_sign_in_at", "app_metadata", "user_metadata")})
        if len(utilisateurs) < PAGE:
            return comptes
        page += 1


def exporter_json(appeler=c.appeler) -> bytes:
    contenu = {"genere_le": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
               "comptes_auth": lire_comptes(appeler), "tables": {}}
    for nom, tri in TABLES.items():
        contenu["tables"][nom] = lire_table(nom, tri, appeler)
        print(f"  {nom:<20} {len(contenu['tables'][nom]):>7} lignes")
    print(f"  {'comptes_auth':<20} {len(contenu['comptes_auth']):>7} comptes")
    return gzip.compress(json.dumps(contenu, ensure_ascii=False).encode("utf-8"), 9)


# --- Rotation -------------------------------------------------------------

def faire_tourner(dossier: Path, garder: int) -> list:
    """Ne garde que les `garder` dernieres sauvegardes de chaque genre."""
    supprimes = []
    for motif in ("base-*-pgdump.pcbak", "base-*.pcbak"):
        fichiers = sorted(f for f in dossier.glob(motif)
                          if motif != "base-*.pcbak" or not f.name.endswith("-pgdump.pcbak"))
        for ancien in fichiers[:-garder] if garder > 0 else []:
            ancien.unlink()
            supprimes.append(ancien.name)
    return supprimes


# --- Commandes ------------------------------------------------------------

def sauvegarder(args) -> int:
    dossier = Path(os.environ.get("PREPACARDS_SAUVEGARDE_DOSSIER")
                   or Path.home() / "PrepaCards-sauvegardes")
    dossier.mkdir(parents=True, exist_ok=True)
    mdp = mot_de_passe_chiffrement(confirmer=True)
    horodatage = time.strftime("%Y%m%d-%H%M%S")

    print("Lecture de la base…")
    sortie = dossier / f"base-{horodatage}.pcbak"
    sortie.write_bytes(chiffrer(exporter_json(), mdp))
    print(f"\nÉcrit : {sortie} ({sortie.stat().st_size / 1024:.0f} Ko)")

    url_pg = os.environ.get("SUPABASE_DB_URL", "").strip()
    if url_pg and shutil.which("pg_dump"):
        print("pg_dump…")
        with tempfile.TemporaryDirectory() as tmp:
            brut = Path(tmp) / "base.dump"
            code = subprocess.call(["pg_dump", "--no-owner", "--format=custom",
                                    "--file", str(brut), url_pg])
            if code == 0:
                natif = dossier / f"base-{horodatage}-pgdump.pcbak"
                natif.write_bytes(chiffrer(brut.read_bytes(), mdp))
                print(f"Écrit : {natif}")
            else:
                print("pg_dump a échoué : seul l'export JSON est conservé.",
                      file=sys.stderr)

    for nom in faire_tourner(dossier, args.garder):
        print(f"Ancienne sauvegarde retirée : {nom}")
    print("\nConservez le mot de passe EN LIEU SÛR et séparé du fichier : sans lui, "
          "la sauvegarde est illisible, et personne ne peut le retrouver.")
    return 0


def dechiffrer_fichier(args) -> int:
    contenu = Path(args.fichier).read_bytes()
    brut = dechiffrer(contenu, mot_de_passe_chiffrement(confirmer=False))
    try:
        brut = gzip.decompress(brut)
    except OSError:
        pass   # un export pg_dump n'est pas compresse en gzip
    if args.verifier:
        donnees = json.loads(brut.decode("utf-8"))
        print(f"Fichier lisible, généré le {donnees.get('genere_le')}.")
        for nom, lignes in donnees.get("tables", {}).items():
            print(f"  {nom:<20} {len(lignes):>7} lignes")
        print(f"  {'comptes_auth':<20} {len(donnees.get('comptes_auth', [])):>7} comptes")
        return 0
    sortie = Path(args.sortie or (Path(args.fichier).stem + ".json"))
    sortie.write_bytes(brut)
    print(f"Écrit : {sortie}")
    return 0


def principal() -> int:
    ap = argparse.ArgumentParser(description="Sauvegarde chiffrée de la base")
    ap.add_argument("--verifier", metavar="FICHIER", help="vérifie qu'un fichier se relit")
    ap.add_argument("--dechiffrer", metavar="FICHIER", help="déchiffre vers un JSON")
    ap.add_argument("--sortie", help="fichier de sortie pour --dechiffrer")
    ap.add_argument("--garder", type=int, default=DEFAUT_GARDER,
                    help=f"nombre de sauvegardes conservées (défaut {DEFAUT_GARDER})")
    args = ap.parse_args()
    if args.verifier:
        args.fichier = args.verifier
        return dechiffrer_fichier(args)
    if args.dechiffrer:
        args.fichier, args.verifier = args.dechiffrer, None
        return dechiffrer_fichier(args)
    return sauvegarder(args)


if __name__ == "__main__":
    sys.exit(c.executer(principal))
