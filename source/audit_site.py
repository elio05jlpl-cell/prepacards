"""
Controle technique du site avant mise en ligne
===============================================

A lancer apres build_site.py :

    python build_site.py
    python audit_site.py

Verifie les points qui cassent reellement le referencement ou l'affichage :
titres et descriptions uniques et de bonne longueur, liens internes valides,
images presentes et pourvues d'un attribut alt, un seul H1 par page, JSON-LD
analysable, et Markdown effectivement interprete.

Ce ne sont pas des regles inventees : Google tronque les titres au-dela d'une
soixantaine de caracteres et les descriptions autour de 160, des titres
dupliques empechent les pages de se distinguer, et un JSON-LD invalide est
simplement ignore.
"""

import html as html_lib
import json
import re
import struct
import os
import sys
import xml.etree.ElementTree as ET
from datetime import date, timedelta
from pathlib import Path

# Meme reglage que build_site.py, et pour la meme raison : l'action planifiee
# construit depuis source/ vers la racine du depot. Sans cette variable,
# l'audit cherchait source/public/, qui n'existe pas, et echouait chaque nuit
# — ce qui bloquait la publication des articles au lieu de la proteger.
PUBLIC = Path(os.environ.get("PREPACARDS_SORTIE")
              or (Path(__file__).parent / "public")).resolve()

TITRE_MAX = 65
# Google affiche environ 155 caracteres. En dessous de 140 on laisse
# de la place inutilisee dans le resultat de recherche ; au-dela de
# 165 la phrase est coupee au milieu.
DESCRIPTION_MIN = 140
DESCRIPTION_MAX = 165

# Extensions servies telles quelles : le lien pointe vers un fichier, pas vers
# un dossier contenant un index.html.
FICHIERS = re.compile(
    r"\.(css|js|png|jpg|jpeg|svg|ico|xml|txt|zip|webp|woff2|pcards)$")

# Cloudflare Pages et Netlify refusent tout fichier de plus de 25 Mo. Un
# echec d'upload a reellement eu lieu parce que l'archive d'installation
# (258 Mo) se trouvait dans le dossier depose : mieux vaut le detecter ici que
# devant le message d'erreur de l'hebergeur.
TAILLE_MAX_FICHIER = 25 * 1024 * 1024

# Extensions qui n'ont rien a faire dans un site publie : sources, archives,
# scripts. Les publier exposerait le code du generateur et les fichiers de
# travail.
EXTENSIONS_INTERDITES = {".md", ".py", ".zip", ".db", ".spec", ".bat", ".ps1"}

MESSAGE_TABLEAU = (
    'tableau Markdown non interprete, ajouter markdown="1" '
    "au bloc HTML qui l'entoure"
)


def dimensions_png(chemin: Path):
    """Largeur et hauteur reelles d'un PNG, lues dans son en-tete IHDR.

    Aucune bibliotheque n'est necessaire : les huit octets qui suivent la
    signature et le marqueur IHDR portent les deux entiers, en gros-boutiste.
    """
    entete = chemin.read_bytes()[:24]
    if len(entete) < 24 or entete[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", entete[16:24])


def url_de(page: Path) -> str:
    relatif = page.parent.relative_to(PUBLIC).as_posix()
    return "/" if relatif == "." else f"/{relatif}/"


def texte_visible(html: str) -> str:
    """Texte reellement affiche, balises et scripts retires.

    Sert a detecter du Markdown non interprete : la page reste un HTML
    valide, donc aucune autre verification ne l'attrape.
    """
    sans_script = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.S)
    return re.sub(r"<[^>]+>", " ", sans_script)



def verifier_plan_du_site(pages: list) -> list:
    """Le plan du site doit lister exactement les pages indexables.

    Deux erreurs opposees, aussi couteuses l'une que l'autre : une page
    absente du plan met plus longtemps a etre decouverte ; une page listee
    mais inexistante fait remonter une erreur dans la Search Console, et
    quelques-unes suffisent a ce que Google cesse de relire le fichier.
    """
    problemes = []
    plan = PUBLIC / "sitemap.xml"
    robots = PUBLIC / "robots.txt"
    if not plan.exists():
        return problemes

    try:
        racine = ET.parse(plan).getroot()
    except ET.ParseError as erreur:
        return [f"sitemap.xml illisible : {erreur}"]

    espace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    listees, dates = set(), {}
    for noeud in racine.findall("s:url", espace):
        adresse = noeud.find("s:loc", espace)
        if adresse is None or not adresse.text:
            problemes.append("sitemap.xml : une entree sans adresse")
            continue
        chemin = adresse.text.split("prepacards.fr", 1)[-1] or "/"
        listees.add(chemin)
        modif = noeud.find("s:lastmod", espace)
        if modif is not None and modif.text:
            dates[chemin] = modif.text

    # Les pages reellement produites, hors pages en noindex.
    produites = set()
    for page in pages:
        html = page.read_text(encoding="utf-8")
        if "noindex" in (re.search(r'name="robots" content="([^"]*)"', html)
                         or [None, ""])[1]:
            continue
        relatif = page.parent.relative_to(PUBLIC).as_posix()
        produites.add("/" if relatif == "." else f"/{relatif}/")

    for manquante in sorted(produites - listees):
        problemes.append(f"{manquante} : page indexable absente du sitemap")
    for fantome in sorted(listees - produites):
        problemes.append(f"{fantome} : listee au sitemap mais n'existe pas")

    # Une date de modification dans le futur decredibilise tout le fichier.
    #
    # Sauf en mode verification de la file d'attente : on construit alors
    # deliberement des articles a paraitre, et leur date EST dans le futur.
    # Sans cette exception, le controle utile - titres, descriptions, liens -
    # serait noye sous des signalements attendus.
    if not os.environ.get("PREPACARDS_TOUT"):
        demain = (date.today() + timedelta(days=1)).isoformat()
        for chemin, quand in dates.items():
            if quand >= demain:
                problemes.append(f"{chemin} : lastmod dans le futur ({quand})")

    if robots.exists():
        contenu = robots.read_text(encoding="utf-8")
        if "sitemap.xml" not in contenu.lower():
            problemes.append(
                "robots.txt ne declare pas le sitemap : ajoutez une ligne "
                "« Sitemap: https://.../sitemap.xml »"
            )
        if re.search(r"^\s*Disallow:\s*/\s*$", contenu, re.M):
            problemes.append(
                "robots.txt interdit tout le site (Disallow: /)"
            )

    return problemes



def verifier_redirections() -> list:
    """Le fichier _redirects ne doit contenir que des adresses relatives.

    Cloudflare Workers refuse les adresses absolues et fait echouer le
    deploiement ENTIER - pas seulement la redirection fautive. Une seule
    ligne mal formee laisse donc l'ancienne version en ligne, sans que rien
    ne le signale ailleurs que dans le journal de construction.
    """
    fichier = PUBLIC / "_redirects"
    if not fichier.exists():
        return []

    problemes = []
    for numero, ligne in enumerate(fichier.read_text(encoding="utf-8").splitlines(), 1):
        ligne = ligne.strip()
        if not ligne or ligne.startswith("#"):
            continue
        for champ in ligne.split()[:2]:
            if champ.startswith(("http://", "https://", "//")):
                problemes.append(
                    f"_redirects ligne {numero} : adresse absolue « {champ} ». "
                    "Cloudflare Workers n'accepte que des chemins relatifs et "
                    "rejette tout le deploiement."
                )
    return problemes


# Dossiers presents dans public/ mais qui ne sont pas le site : ils
# figurent dans .assetsignore et ne sont jamais servis.
HORS_SITE = (".git/", "source/", ".github/")


def auditer() -> list:
    problemes = []
    titres, descriptions = {}, {}
    pages = sorted(PUBLIC.rglob("index.html"))

    if not pages:
        return ["Aucune page dans public/ : lancez d'abord build_site.py"]

    for page in pages:
        url = url_de(page)
        html = page.read_text(encoding="utf-8")

        # On mesure le texte tel que Google l'affiche, donc apres avoir
        # rendu les entites HTML : « l&#x27;oral » compte 7 caracteres, pas
        # 12, et une description juste paraissait trop longue.
        titre = html_lib.unescape(
            (re.search(r"<title>(.*?)</title>", html, re.S) or [None, ""])[1].strip())
        description = html_lib.unescape((
            re.search(r'name="description" content="(.*?)"', html, re.S) or [None, ""]
        )[1].strip())

        if not titre:
            problemes.append(f"{url} : titre manquant")
        elif len(titre) > TITRE_MAX:
            problemes.append(f"{url} : titre de {len(titre)} caracteres (max {TITRE_MAX})")

        if not description:
            problemes.append(f"{url} : description manquante")
        elif not DESCRIPTION_MIN <= len(description) <= DESCRIPTION_MAX:
            problemes.append(
                f"{url} : description de {len(description)} caracteres "
                f"(viser {DESCRIPTION_MIN}-{DESCRIPTION_MAX})"
            )

        if titre in titres:
            problemes.append(f"{url} : titre identique a {titres[titre]}")
        titres[titre] = url
        if description in descriptions:
            problemes.append(f"{url} : description identique a {descriptions[description]}")
        descriptions[description] = url

        if not re.search(r'rel="canonical"', html):
            problemes.append(f"{url} : balise canonical manquante")

        nombre_h1 = len(re.findall(r"<h1[ >]", html))
        if nombre_h1 != 1:
            problemes.append(f"{url} : {nombre_h1} balise(s) H1, il en faut exactement 1")

        for bloc in re.findall(r'type="application/ld\+json">(.*?)</script>', html, re.S):
            try:
                json.loads(bloc)
            except json.JSONDecodeError as erreur:
                problemes.append(f"{url} : JSON-LD invalide ({erreur})")

        for lien in re.findall(r'href="(/[^"#?]*)"', html):
            if FICHIERS.search(lien):
                cible = PUBLIC / lien.lstrip("/")
            else:
                cible = PUBLIC / lien.strip("/") / "index.html"
            if not cible.exists():
                problemes.append(f"{url} : lien interne casse vers {lien}")

        for source in re.findall(r'<img[^>]+src="(/[^"]+)"', html):
            # Les images portent une empreinte « ?v=... » pour forcer les
            # navigateurs a les recharger : elle ne fait pas partie du chemin
            # sur le disque et doit etre retiree avant de chercher le fichier.
            chemin = source.split("?", 1)[0]
            if not (PUBLIC / chemin.lstrip("/")).exists():
                problemes.append(f"{url} : image absente {source}")

        for balise in re.findall(r"<img[^>]*>", html):
            if 'alt="' not in balise:
                problemes.append(f"{url} : image sans attribut alt")

        # Proportions annoncees contre proportions reelles. Une valeur fausse
        # ne casse pas l'affichage : elle deforme l'image et fait sauter la
        # page au chargement, ce qui se voit mais ne leve aucune erreur. Le
        # defaut etait bien present sur trois captures de l'accueil.
        #
        # On compare le rapport, pas les pixels : servir une image en 60 px
        # pour l'afficher en 30 est correct, c'est ce qui la rend nette sur
        # un ecran a haute densite. Seule une hauteur annoncee qui s'ecarte
        # de plus d'un pixel de la hauteur proportionnee est une erreur.
        for balise in re.findall(r"<img[^>]*>", html):
            source = re.search(r'src="(/[^"?]+\.png)(?:\?[^"]*)?"', balise)
            largeur = re.search(r'width="(\d+)"', balise)
            hauteur = re.search(r'height="(\d+)"', balise)
            if not (source and largeur and hauteur):
                continue
            fichier = PUBLIC / source.group(1).lstrip("/")
            if not fichier.exists():
                continue
            reelles = dimensions_png(fichier)
            if reelles is None:
                continue
            large, haut = int(largeur.group(1)), int(hauteur.group(1))
            attendue = large * reelles[1] / reelles[0]
            if abs(haut - attendue) > 1:
                problemes.append(
                    f"{url} : {source.group(1)} annoncee en {large}x{haut} "
                    f"alors que le fichier fait {reelles[0]}x{reelles[1]} "
                    f"(hauteur attendue : {round(attendue)})"
                )

        # Markdown non interprete. Cas reellement rencontre sur ce site : un
        # tableau place dans un <div> sans markdown="1" ressortait en texte
        # brut, barres verticales comprises.
        visible = texte_visible(html)
        if any(ligne.count("|") >= 3 for ligne in visible.splitlines()):
            problemes.append(f"{url} : {MESSAGE_TABLEAU}")
        if re.search(r"(?:^|\s)#{2,4}\s+\w", visible, re.M):
            problemes.append(f"{url} : titre Markdown non interprete (## visible)")

        # Du HTML affiche comme du code. Cas reellement rencontre : dans un
        # bloc markdown="1", une balise indentee de quatre espaces est prise
        # pour un bloc de code et s'affiche telle quelle au visiteur.
        if re.search(r"<code>&lt;\s*/?\s*[a-zA-Z]", html):
            problemes.append(
                f"{url} : balise HTML affichee comme du code "
                "(indentation de 4 espaces dans un bloc markdown=1 ?)"
            )

    for fichier in ("sitemap.xml", "robots.txt"):
        if not (PUBLIC / fichier).exists():
            problemes.append(f"{fichier} manquant")

    problemes += verifier_plan_du_site(pages)
    problemes += verifier_redirections()

    # Taille des fichiers et nature de ce qui part en ligne
    for fichier in PUBLIC.rglob("*"):
        if not fichier.is_file():
            continue
        relatif = fichier.relative_to(PUBLIC).as_posix()
        # public/ est aussi le depot Git pousse en ligne : son historique,
        # les fichiers de construction et les actions planifiees n'en sont
        # pas le contenu. Rien de tout cela n'est servi (.assetsignore), et
        # rien ne doit donc etre ni compte ni verifie comme une page.
        if any(relatif.startswith(p) for p in HORS_SITE):
            continue
        taille = fichier.stat().st_size
        if taille > TAILLE_MAX_FICHIER:
            problemes.append(
                f"{relatif} pese {taille / 1024 / 1024:.0f} Mo : au-dela des "
                "25 Mo par fichier acceptes par Cloudflare Pages, l'upload "
                "echouera. Hebergez ce fichier ailleurs."
            )
        if fichier.suffix.lower() in EXTENSIONS_INTERDITES:
            problemes.append(
                f"{relatif} ne devrait pas etre publie "
                f"(extension {fichier.suffix})"
            )

    poids = sum(
        f.stat().st_size for f in PUBLIC.rglob("*")
        if f.is_file()
        and not any(f.relative_to(PUBLIC).as_posix().startswith(p)
                    for p in HORS_SITE))
    print(f"{len(pages)} pages verifiees, {poids / 1024:.0f} Ko au total")
    return problemes


if __name__ == "__main__":
    problemes = auditer()
    if problemes:
        print(f"\n{len(problemes)} point(s) a corriger :")
        for probleme in problemes:
            print(f"  - {probleme}")
        sys.exit(1)
    print("\nAucun probleme detecte. Le site est pret a etre mis en ligne.")
