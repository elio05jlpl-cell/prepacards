"""
Generateur du site prepacards.fr
=================================

Transforme les fichiers Markdown de content/ en un site statique complet dans
public/, pret a etre deverse sur Cloudflare Pages, Netlify ou un hebergeur
classique.

Pourquoi un generateur maison plutot qu'Astro, Hugo ou WordPress
----------------------------------------------------------------
    - aucun outil a installer : il n'utilise que Python, deja present sur la
      machine, et la bibliotheque markdown ;
    - le HTML produit est entierement maitrise, ce qui compte pour le
      referencement : balises title et description uniques, canonical,
      Open Graph, donnees structurees JSON-LD, sitemap ;
    - pas de JavaScript de framework, donc des pages qui s'affichent
      instantanement - c'est un critere de classement reel, contrairement a
      beaucoup de "trucs SEO".

Ajouter un article de blog
--------------------------
Creer un fichier content/blog/mon-article.md commencant par :

    ---
    title: Titre de l'article
    description: Une phrase qui donne envie de cliquer dans Google.
    date: 2026-09-15
    ---

    Le texte de l'article en Markdown.

Puis lancer :  python build_site.py

Le sommaire du blog, le plan du site et les liens internes se mettent a jour
tout seuls.

File d'attente
--------------
Une date POSTERIEURE a aujourd'hui met l'article en attente : il reste dans
le depot sans etre construit, ni indexe, ni liste. Il parait tout seul le
jour dit, quand l'action planifiee reconstruit le site
(.github/workflows/publier.yml).

Avant de livrer des articles en attente, verifiez-les TOUS :

    PREPACARDS_TOUT=1 python build_site.py && PREPACARDS_TOUT=1 python audit_site.py

Un titre trop long dans un article qui parait dans dix jours fera echouer
l'audit ce jour-la, donc bloquera le push - et avec lui tous les articles
qui attendent derriere. L'erreur serait alors silencieuse et differee de
dix jours. Ce controle a deja rattrape quatre articles sur huit.

N'utilisez jamais PREPACARDS_TOUT pour publier : cela sortirait la file
entiere d'un coup.
"""

import hashlib
import html
import json
import re
import sys
import os
import shutil
import struct
from datetime import date, datetime
from pathlib import Path
from urllib.parse import quote

import markdown

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
STATIC = ROOT / "static"
TEMPLATES = ROOT / "templates"
# Dossier ou le site est ecrit. Reglable par PREPACARDS_SORTIE : l'action
# planifiee construit depuis source/ vers la racine du depot, ou ROOT /
# "public" n'aurait aucun sens.
OUTPUT = Path(os.environ.get("PREPACARDS_SORTIE") or (ROOT / "public")).resolve()

SITE_URL = "https://prepacards.fr"
SITE_NAME = "PrépaCards"
SITE_TAGLINE = "Flashcards pour les classes préparatoires"
DEFAULT_OG = "/img/og-prepacards.png"

# Adresse du fichier d'installation. Elle ne peut PAS pointer vers une page du
# site : Cloudflare Pages refuse les fichiers de plus de 25 Mo, et l'archive
# de PrepaCards en fait environ 260. Il faut donc l'heberger ailleurs - une
# "release" GitHub est gratuite et accepte jusqu'a 2 Go par fichier.
# A remplacer par l'adresse reelle avant la mise en ligne.
DOWNLOAD_URL = (
    "https://github.com/elio05jlpl-cell/prepacards/releases/latest/download/"
    "PrepaCards-installateur.zip"
)

# Marqueur laisse dans DOWNLOAD_URL tant que l'archive n'est pas hebergee.
# Tant qu'il est present, la page de telechargement affiche un encadre honnete
# au lieu d'un bouton qui menerait a une erreur 404 : un lien mort sur la page
# la plus importante du site coute plus cher que l'absence de bouton.
DOWNLOAD_PLACEHOLDER = "VOTRE-COMPTE"

BLOC_TELECHARGEMENT_PRET = """<p>
  <a class="bouton" href="{url}">Télécharger pour Windows (285 Mo)</a>
</p>
<p class="sous-bouton">Version 1.0 · Windows 10 et 11 (64 bits) ·
   Prévoir environ 1,5 Go d'espace disque une fois les modèles installés</p>"""

BLOC_TELECHARGEMENT_ATTENTE = """<div class="encart encart-attention">
  <p><strong>Le téléchargement ouvre très bientôt.</strong> L'application est
  terminée et fonctionnelle ; il reste à finaliser sa mise en ligne. Laissez
  votre adresse et vous serez prévenu dès qu'elle est disponible.</p>
  <p><a class="bouton" href="mailto:contact@prepacards.fr?subject=Me%20pr%C3%A9venir%20du%20lancement">Me prévenir du lancement</a></p>
</div>
<p class="sous-bouton">Version 1.0 · Windows 10 et 11 (64 bits) ·
   Prévoir environ 1,5 Go d'espace disque une fois les modèles installés</p>"""


# Marqueurs dont la valeur est un bloc HTML, et non du texte en
# ligne : ils ne doivent jamais rester enfermes dans un <p>.
MARQUEURS_DE_BLOC = ("{{bloc_telechargement}}", "{{bandeau_ecoles}}",
                     "{{bloc_decks}}", "{{bloc_paiement}}",
                     "{{bouton_mensuel}}", "{{bouton_annuel}}")


def transformer_faq(corps: str) -> str:
    """Transforme la liste de questions en accordeon depliable.

    En Markdown, une FAQ s'ecrit naturellement en « ### question » suivi de
    sa reponse. C'est confortable a rediger et brut a lire : dix questions
    ouvertes d'affilee font un mur de texte ou l'oeil ne se pose nulle part.

    On la replie donc ici, a la construction, plutot que de demander a
    chaque page d'ecrire son propre balisage. Toutes les pages portant
    « faq: true » en profitent sans etre retouchees.

    Le pliage utilise <details>/<summary>, pas du JavaScript : l'accordeon
    fonctionne sans script, se replie correctement a l'impression, et la
    recherche du navigateur (Ctrl+F) ouvre d'elle-meme la bonne reponse.

    Attention a l'ordre d'appel : faq_jsonld() lit les paires <h3>/<p> du
    corps d'origine. Cette transformation doit donc intervenir APRES, au
    moment du rendu, sinon le balisage structure disparaitrait.
    """
    entete = re.search(r"<h2[^>]*>\s*Questions fr[^<]*</h2>", corps)
    if not entete:
        return corps

    avant, reste = corps[:entete.start()], corps[entete.end():]

    # Ce qui suit la derniere reponse n'appartient pas a la FAQ : sur ces
    # pages, c'est l'encadre de telechargement. On le met de cote pour le
    # remettre apres l'accordeon.
    queue = ""
    fin = re.search(r'<(?:div|section)\s+class="(?:encart|section)', reste)
    if fin:
        reste, queue = reste[:fin.start()], reste[fin.start():]

    morceaux = re.split(r"<h3[^>]*>(.*?)</h3>", reste, flags=re.DOTALL)
    if len(morceaux) < 3:
        return corps          # pas de question : on ne touche a rien

    intro = morceaux[0].strip()
    items = []
    for index in range(1, len(morceaux) - 1, 2):
        question = morceaux[index].strip()
        reponse = morceaux[index + 1].strip()
        items.append(
            '  <details class="faq-item">\n'
            f'    <summary><span>{question}</span>'
            '<svg class="faq-chevron" viewBox="0 0 24 24" fill="none" '
            'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
            'stroke-linejoin="round" aria-hidden="true">'
            '<path d="m6 9 6 6 6-6"/></svg></summary>\n'
            '    <div class="faq-enveloppe">'
            f'<div class="faq-reponse">{reponse}</div></div>\n'
            '  </details>'
        )

    bloc = (
        '<section class="faq">\n'
        '  <p class="faq-eyebrow">FAQ</p>\n'
        '  <h2>Questions fréquentes</h2>\n'
        + (f'  <p class="faq-chapeau">{intro}</p>\n' if intro else "")
        + '  <div class="faq-liste">\n'
        + "\n".join(items)
        + '\n  </div>\n</section>\n'
    )
    return avant + bloc + queue


def desenvelopper_blocs(html: str) -> str:
    """Sort les marqueurs de bloc du paragraphe ou Markdown les a mis.

    Markdown enveloppe dans un <p> tout marqueur seul sur sa ligne, et la
    substitution n'a lieu qu'ensuite : le bloc atterrissait donc a
    l'interieur d'un paragraphe, ce qu'aucune specification n'autorise
    (<p><div>, ou <p><p>). Les navigateurs referment le paragraphe tout
    seuls et l'affichage restait correct, mais le document ne l'etait pas.
    """
    for marqueur in MARQUEURS_DE_BLOC:
        html = html.replace(f"<p>{marqueur}</p>", marqueur)
    return html


def scripts_animes(corps: str) -> str:
    """Les scripts d'animation, et seulement sur les pages qui en ont.

    Deux morceaux independants : la demonstration de l'en-tete, et la
    section « Comment ca marche ». Les poser dans le gabarit commun
    coutait plusieurs kilo-octets sur chacune des 27 pages, dont 26 qui
    n'en ont aucun usage - ce qui pese reellement sur le referencement,
    l'argument meme avance ailleurs dans ce fichier.

    Le declencheur est la presence du balisage, et non le nom de la page :
    si un bloc est repris ailleurs un jour, son script suivra.
    """
    dossier = Path(__file__).parent / "templates"
    morceaux = []
    for marqueur, fichier in (('class="mot-anime"', "mot-anime.js"),
                              ('id="demo-app"', "demo-accueil.js"),
                              ("data-anim=", "etapes.js"),
                              ('class="feuille-texte"', "pages-vivantes.js"),
                              ('id="compte-app"', "compte.js"),
                              ('id="mdp-app"', "mot-de-passe.js"),
                              # Le marqueur, et non l'adresse Stripe : a ce
                              # stade les boutons sont encore
                              # « {{bouton_mensuel}} », et chercher
                              # « buy.stripe.com » n'aurait jamais rien
                              # trouve — ce qui n'aurait casse aucun test,
                              # la page se construisant tres bien sans le
                              # script.
                              ("{{bloc_paiement}}", "paiement.js")):
        chemin = dossier / fichier
        if marqueur in corps and chemin.exists():
            morceaux.append("<script>" + chr(10)
                            + chemin.read_text(encoding="utf-8") + "</script>")
    return chr(10).join(morceaux)


def ancre_matiere(nom: str) -> str:
    """Identifiant d'ancre pour une matiere : « Maths approfondies » ->
    « maths-approfondies ».

    Le menu des matieres pointe vers ces ancres : sans elles, choisir
    « Espagnol » ouvrirait la page des paquets tout en haut, et il faudrait
    faire defiler quatre langues pour trouver la sienne.
    """
    import unicodedata

    nu = "".join(c for c in unicodedata.normalize("NFD", nom)
                 if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", nu.lower()).strip("-")


def bloc_decks() -> str:
    """La liste des paquets telechargeables, batie sur le manifeste.

    Le manifeste est ecrit par _generer_decks.py, qui fabrique les fichiers
    depuis les listes de vocabulaire. Rien n'est saisi deux fois : ajouter
    un paquet, c'est ajouter un fichier source et relancer le generateur.

    Si le manifeste est absent, la page affiche une attente plutot qu'une
    liste vide - un tableau de zero ligne ressemble a une panne.
    """
    manifeste = STATIC / "decks" / "decks.json"
    if not manifeste.exists():
        return ('<div class="encart encart-attention"><p>Les paquets sont en '
                'cours de préparation.</p></div>')

    fiches = json.loads(manifeste.read_text(encoding="utf-8"))
    if not fiches:
        return ('<div class="encart encart-attention"><p>Les paquets sont en '
                'cours de préparation.</p></div>')

    # Regroupement : matiere, puis annee, puis groupe. L'ordre des annees
    # est numerique et non alphabetique - « 10 » viendrait avant « 2 ».
    arbre = {}
    for fiche in fiches:
        annee = arbre.setdefault(fiche["matiere"], {}).setdefault(
            str(fiche["annee"]), {})
        annee.setdefault(fiche["groupe"], []).append(fiche)

    total_cartes = sum(f["cartes"] for f in fiches)
    morceaux = [
        '<p class="decks-compte">'
        f'<strong>{len(fiches)} paquets</strong> · '
        f'<strong>{total_cartes:,} cartes</strong> · gratuits et sans compte'
        '</p>'.replace(",", " ")
    ]

    for matiere in sorted(arbre):
        premiere_annee = True
        for annee in sorted(arbre[matiere], key=lambda a: int(a or 0)):
            # L'ancre est posee sur la PREMIERE annee de la matiere : c'est
            # la que doit arriver quelqu'un qui clique « Espagnol ».
            ancre = (f' id="{ancre_matiere(matiere)}"' if premiere_annee else "")
            premiere_annee = False
            morceaux.append(
                f'<h2 class="decks-annee"{ancre}>{html.escape(matiere)} — '
                f'{annee}<sup>re</sup> année</h2>'
                if annee == "1" else
                f'<h2 class="decks-annee"{ancre}>{html.escape(matiere)} — '
                f'{annee}<sup>e</sup> année</h2>'
            )
            for groupe in sorted(arbre[matiere][annee]):
                morceaux.append(
                    f'<h3 class="decks-groupe">{html.escape(groupe)}</h3>')
                morceaux.append('<div class="decks-grille">')
                for fiche in sorted(arbre[matiere][annee][groupe],
                                    key=lambda f: f["titre"]):
                    poids = f'{fiche["octets"] / 1024:.0f} ko'
                    morceaux.append(
                        '<a class="deck-carte" '
                        f'href="/decks/{html.escape(fiche["fichier"])}" '
                        f'download>'
                        f'<span class="deck-titre">{html.escape(fiche["titre"])}</span>'
                        f'<span class="deck-desc">{html.escape(fiche["description"])}</span>'
                        f'<span class="deck-pied">'
                        f'<span class="deck-nombre">{fiche["cartes"]} cartes</span>'
                        f'<span class="deck-poids">{poids}</span></span>'
                        '</a>'
                    )
                morceaux.append('</div>')

    return "\n".join(morceaux)


def bloc_telechargement() -> str:
    """Bouton reel, ou encadre d'attente si l'adresse n'est pas renseignee."""
    if DOWNLOAD_PLACEHOLDER in DOWNLOAD_URL:
        return BLOC_TELECHARGEMENT_ATTENTE
    return BLOC_TELECHARGEMENT_PRET.format(url=DOWNLOAD_URL)


# ------------------------------------------------------------------
# Bandeau des concours prepares
# ------------------------------------------------------------------

# Nom affiche, et nom de fichier attendu pour le logo. Deposer
# static/img/ecoles/hec.svg suffit a remplacer le texte par l'image : rien
# d'autre n'est a modifier. Formats acceptes, par ordre de preference.
ECOLES = [
    ("HEC Paris", "hec"),
    ("ESSEC", "essec"),
    ("ESCP", "escp"),
    ("EM Lyon", "em-lyon"),
    ("EDHEC", "edhec"),
    ("Polytechnique", "polytechnique"),
    ("CentraleSupélec", "centrale"),
    ("Mines&nbsp;Paris", "mines"),
    ("ENS", "ens"),
]
FORMATS_LOGO = (".svg", ".png", ".webp")
DOSSIER_LOGOS = "img/ecoles"


SIGNATURE_PNG = bytes((137, 80, 78, 71, 13, 10, 26, 10))


def dimensions_png(chemin: Path):
    """Largeur et hauteur d'un PNG, lues dans son en-tete IHDR."""
    entete = chemin.read_bytes()[:24]
    # Signature PNG, en valeurs numeriques plutot qu'en sequences
    # d'echappement : plus lisible, et rien a mal recopier.
    if len(entete) < 24 or entete[:8] != SIGNATURE_PNG:
        return None
    return struct.unpack(">II", entete[16:24])


def logo_ecole(nom: str, fichier: str) -> str:
    """Le logo si le fichier est present, sinon le nom en typographie.

    Les logos ne sont pas fournis : ce sont des marques deposees, et chaque
    ecole diffuse ses fichiers dans son propre kit media, avec ses conditions.
    Le site fonctionne donc entierement sans eux, et les affiche des qu'ils
    sont deposes dans static/img/ecoles/.
    """
    for extension in FORMATS_LOGO:
        chemin = STATIC / DOSSIER_LOGOS / f"{fichier}{extension}"
        if chemin.exists():
            # L'alt reprend le nom : si l'image ne se charge pas, ou pour un
            # lecteur d'ecran, l'information reste la meme.
            alt = html.escape(nom.replace("&nbsp;", " "))
            # Les PNG sont exportes au double de leur taille d'affichage pour
            # rester nets sur un ecran a haute densite. On affichait la
            # moitie exacte ; le bandeau les rendait trop discrets, ils sont
            # donc agrandis d'un cinquieme. A 0,6 fois la taille du fichier,
            # la densite reste de 1,67x : les logos ne perdent pas leur nettete.
            taille = dimensions_png(chemin)
            mesures = ""
            if taille:
                mesures = (f' width="{round(taille[0] * 0.6)}"'
                           f' height="{round(taille[1] * 0.6)}"')
            return (f'<li class="logo-ecole">'
                    f'<img src="/{DOSSIER_LOGOS}/{fichier}{extension}"{mesures} '
                    f'alt="{alt}" loading="lazy"></li>')
    return f"<li>{nom}</li>"


def bandeau_ecoles() -> str:
    """Les trois pistes du bandeau defilant.

    Trois copies et non deux : une piste est plus etroite qu'un grand ecran,
    et avec deux seulement le bandeau se vidait sur la droite a chaque fin
    de cycle.
    """
    items = "\n      ".join(logo_ecole(nom, fichier) for nom, fichier in ECOLES)
    pistes = []
    for index in range(3):
        cache = "" if index == 0 else ' aria-hidden="true"'
        pistes.append(f'    <ul class="defile-piste"{cache}>\n      {items}\n    </ul>')
    return "\n".join(pistes)


# Barre de navigation. L'ordre compte : les pages les plus utiles d'abord,
# c'est ce que suivent les visiteurs comme les robots d'indexation.
# Barre de navigation. Une entree peut porter un sous-menu : (adresse,
# libelle, sous-entrees). Le parent reste cliquable et mene a une page reelle
# - un menu dont le titre ne mene nulle part oblige a survoler pour decouvrir
# ce qu'il contient, et ne fonctionne pas au clavier.
NAV = [
    ("/", "Accueil", None),
    ("/prepa/", "Pour les prépas", [
        ("/prepa-scientifique/", "Prépas scientifiques",
         "MPSI, PCSI, PTSI, MPI, BCPST"),
        ("/prepa-commerciale/", "Prépas commerciales", "ECG et ECT"),
        ("/prepa-litteraire/", "Prépas littéraires", "Khâgnes A/L et B/L"),
    ]),
    ("/decks/", "Paquets gratuits", None),
    ("/importer-anki-quizlet/", "Importer", None),
    ("/fonctionnalites/", "Fonctionnalités", None),
    ("/tarifs/", "Tarifs", None),
]

# Paiement : liens Stripe (« Payment Links »).
#
# C'est la forme la plus simple : le lien se cree dans le tableau de bord
# Stripe, il n'y a ni serveur, ni cle d'API, ni webhook a heberger. Stripe
# s'occupe de la page de paiement, de la TVA, des relances et des factures.
#
# Tant qu'une adresse est vide, la page des tarifs continue d'afficher la
# liste d'attente : un bouton « S'abonner » qui n'ouvre rien coute plus
# qu'il ne rapporte.
# Duree de l'essai gratuit, telle que configuree DANS STRIPE. Releve sur
# les deux pages de paiement le 19/09/2026. A tenir a jour a la main :
# rien ici ne peut la deviner, et une page qui promet trente jours quand
# Stripe n'en accorde plus serait une promesse non tenue au moment du
# paiement.
ESSAI_JOURS = 30

PAIEMENT = {
    "mensuel": "https://buy.stripe.com/aFa6oH6954kbaS467H7Re00",
    "annuel": "https://buy.stripe.com/dRmbJ17d94kbd0c0Nn7Re01",
}


def paiement_ouvert() -> bool:
    """Au moins une offre est-elle achetable ?

    Chaque offre est independante de l'autre : attendre d'avoir les deux
    liens pour ouvrir la vente retarderait la premiere sans rien y gagner.
    """
    return any(PAIEMENT.get(cle, "").strip() for cle in ("mensuel", "annuel"))


def bouton_abonnement(offre: str, principal: bool) -> str:
    """Bouton d'une offre payante : vers Stripe, ou vers la liste d'attente."""
    classe = "bouton" if principal else "bouton-secondaire"
    adresse = PAIEMENT.get(offre, "").strip()
    if not adresse:
        # Vers l'adresse e-mail directement, et non vers l'encadre du bas :
        # celui-ci renvoie a son tour vers ce bouton des qu'une autre offre
        # est ouverte, et le visiteur tourne en rond.
        # « mensuel » + « e » donnerait « mensuele » : le feminin est ecrit
        # en toutes lettres plutot que fabrique par concatenation.
        libelle = {"mensuel": "mensuelle", "annuel": "annuelle"}.get(offre, offre)
        sujet = f"Offre {libelle} - me prevenir de l'ouverture"
        lien = ("mailto:contact@prepacards.fr?subject="
                + quote(sujet, safe=""))
        return f'<a class="{classe}" href="{lien}">Être prévenu</a>'

    # Le libelle annonce l'essai plutot que l'abonnement : c'est ce que
    # montre la page de paiement, et promettre moins que ce qui attend le
    # visiteur fait perdre des essais pour rien.
    if ESSAI_JOURS:
        return (f'<a class="{classe}" href="{adresse}" rel="noopener">'
                f'Essayer {ESSAI_JOURS} jours gratuitement</a>')
    return (f'<a class="{classe}" href="{adresse}"'
            f' rel="noopener">S\'abonner</a>')


def bloc_paiement() -> str:
    """L'encadre sous les offres : liste d'attente, ou mode d'emploi."""
    if not paiement_ouvert():
        return (
            '<div class="encart encart-attention" id="liste-attente">\n'
            '  <p><strong>Les offres payantes ne sont pas encore ouvertes à '
            'la vente.</strong>\n'
            '  L\'application est téléchargeable et pleinement utilisable dès '
            'maintenant.\n'
            '  Laissez votre e-mail pour être prévenu de l\'ouverture — et '
            'bénéficier du\n'
            '  tarif de lancement.</p>\n'
            '  <p><a class="bouton" href="mailto:contact@prepacards.fr?'
            'subject=Offre%20compl%C3%A8te%20-%20me%20prevenir">Me prévenir '
            'par e-mail</a></p>\n'
            '</div>')
    # L'adresse est le SEUL lien entre le paiement et le compte : c'est par
    # elle que le service reconnait l'abonne. Payer avec une autre adresse
    # que celle de son compte laisse l'abonnement sans destinataire, et
    # personne ne peut le deviner depuis l'application. Le dire ici, au
    # moment ou l'adresse se saisit, plutot que sur une page d'aide lue
    # apres coup.
    return (
        '<div class="encart" id="liste-attente">\n'
        '  <p><strong><a href="/compte/">Connectez-vous</a> avant de payer.'
        '</strong>\n'
        '  Votre abonnement rejoindra alors votre compte quelle que soit '
        'l\'adresse\n'
        '  utilisée chez Stripe — celle de votre carte, celle de vos parents. '
        'Sans\n'
        '  compte ouvert, le rattachement se fait par l\'adresse : payez avec '
        'celle\n'
        '  que vous utiliserez dans l\'application.</p>\n'
        '  <p><strong>Le paiement est traité par Stripe.</strong> Vos '
        'coordonnées bancaires\n'
        '  ne transitent jamais par PrépaCards et ne sont pas conservées par '
        'nos soins.\n'
        '  L\'abonnement se résilie à tout moment depuis le lien reçu par '
        'e-mail.</p>\n'
        + _reserve_offres() +
        '</div>')


def _reserve_offres() -> str:
    """Signale les formules pas encore ouvertes, quand il en reste.

    Sans cette phrase, une offre mise en avant comme « la plus avantageuse »
    mais dont le bouton dit « Être prévenu » passe pour un defaut du site.
    """
    manquantes = [nom for cle, nom in (("mensuel", "mensuelle"),
                                       ("annuel", "annuelle"))
                  if not PAIEMENT.get(cle, "").strip()]
    if not manquantes:
        return ""
    return ('  <p>La formule ' + " et ".join(manquantes)
            + ' ouvre très bientôt. En attendant, laissez votre adresse par le'
              ' bouton de cette offre et vous serez prévenu.</p>\n')


# Reseaux sociaux de la barre sombre.
#
# Les adresses sont DEDUITES du nom de marque, pas verifiees : un pseudo qui
# ne serait pas le votre enverrait vos visiteurs chez un inconnu. A corriger
# ici, en un seul endroit, des que les comptes sont ouverts.
#
# Les pictogrammes sont dessines en SVG plutot que charges en image : trois
# fichiers pour trois icones de vingt pixels, c'est trois requetes de plus
# sur chaque page, et ils resteraient flous sur un ecran a haute densite.
RESEAUX = [
    ("TikTok", "https://www.tiktok.com/@prepacards",
     "M16.5 3c.3 2.3 1.9 3.8 4.2 4v2.9c-1.5.1-2.9-.3-4.2-1.1v5.9c0 3.6-2.9 "
     "6.3-6.3 6.3-3.5 0-6.2-2.8-6.2-6.3 0-3.4 2.7-6.2 6.2-6.2.3 0 .6 0 .9.1v3"
     "c-.3-.1-.6-.1-.9-.1-1.8 0-3.2 1.5-3.2 3.2 0 1.8 1.4 3.3 3.2 3.3 1.8 0 "
     "3.3-1.4 3.3-3.3V3z"),
    ("Instagram", "https://www.instagram.com/prepacards/", None),
    ("LinkedIn", "https://www.linkedin.com/company/prepacards/",
     "M3.2 9h3v11h-3zM4.7 3.3a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8zM9.5 9h3"
     "v1.6c.7-1.2 2-1.9 3.6-1.9 2.6 0 4.4 1.7 4.4 4.8V20h-3v-5.9c0-1.6-.8-2.5"
     "-2.1-2.5-1.4 0-2.3 1-2.3 2.6V20h-3z"),
]


# Menu des matieres : a gauche les filieres, a droite ce que le site
# propose pour celle que l'on survole.
#
# Chaque entree mene a une page qui existe : l'audit verifie chaque adresse,
# et une matiere qui ouvrirait une page vide serait pire que son absence.
# Les filieres scientifique et litteraire sont donc plus maigres que l'ECG,
# ou vivent les quatre-vingt-cinq paquets.
MENU_MATIERES = [
    ("/prepa-commerciale/", "Prépa commerciale", "ECG et ECT", [
        ("/decks/#anglais", "Anglais"),
        ("/decks/#allemand", "Allemand"),
        ("/decks/#espagnol", "Espagnol"),
        ("/decks/#italien", "Italien"),
        ("/decks/#maths-approfondies", "Maths approfondies"),
        ("/vocabulaire-anglais-prepa-ecg/", "Vocabulaire d'anglais"),
        ("/decks/", "Tout afficher"),
    ]),
    ("/prepa-scientifique/", "Prépa scientifique", "MPSI, PCSI, PTSI, MPI, BCPST", [
        ("/reviser-prepa-mpsi-pcsi/", "Réviser en MPSI et PCSI"),
        ("/decks/#maths-approfondies", "Formules de maths"),
        ("/decks/#anglais", "Anglais"),
        ("/fiches-de-revision-prepa/", "Fiches de révision"),
        ("/anki-prepa-mpsi-pcsi/", "Venir d'Anki"),
        ("/prepa-scientifique/", "Tout afficher"),
    ]),
    ("/prepa-litteraire/", "Prépa littéraire", "Khâgnes A/L et B/L", [
        ("/decks/#anglais", "Anglais"),
        ("/decks/#allemand", "Allemand"),
        ("/decks/#espagnol", "Espagnol"),
        ("/decks/#italien", "Italien"),
        ("/memoriser-vocabulaire-anglais/", "Mémoriser du vocabulaire"),
        ("/fiches-de-revision-prepa/", "Fiches de révision"),
        ("/prepa-litteraire/", "Tout afficher"),
    ]),
]


# Pied de page : quatre colonnes thematiques plutot qu'une liste unique.
# Huit liens a la suite se lisaient comme un inventaire ; groupes, ils
# disent aussi ce que le site contient.
FOOTER_COLONNES = [
    ("Révisions", [
        ("/prepa-commerciale/", "Prépas commerciales"),
        ("/prepa-scientifique/", "Prépas scientifiques"),
        ("/prepa-litteraire/", "Prépas littéraires"),
    ]),
    ("Comparatifs", [
        ("/alternative-anki/", "PrépaCards ou Anki"),
        ("/alternative-quizlet/", "PrépaCards ou Quizlet"),
        ("/importer-anki-quizlet/", "Importer ses paquets"),
    ]),
    ("Ressources", [
        ("/telecharger/", "Télécharger"),
        ("/blog/", "Le blog"),
        ("/decks/", "Paquets gratuits"),
    ]),
    ("Informations", [
        ("/mentions-legales/", "Mentions légales"),
        ("/cgv/", "CGV"),
        ("/confidentialite/", "Confidentialité"),
    ]),
]

# Conserve : l'audit s'en sert pour verifier que chaque page citee dans le
# pied existe reellement.
FOOTER_LINKS = [lien for _, liens in FOOTER_COLONNES for lien in liens]


# Priorite dans le plan du site. Ce n'est qu'une indication relative donnee
# a Google - elle ne fait monter aucune page - mais tout mettre a la meme
# valeur revient a ne rien indiquer du tout. L'ordre traduit ce qui compte
# pour le site : la page d'accueil, puis les pages qui repondent a une
# recherche, puis les pages legales que personne ne cherche.
PRIORITES = {
    "index": "1.0",
    "prepa": "0.9",
    "prepa-scientifique": "0.9",
    "prepa-commerciale": "0.9",
    "prepa-litteraire": "0.9",
    "telecharger": "0.9",
    "fonctionnalites": "0.8",
    "importer-anki-quizlet": "0.8",
    "alternative-anki": "0.8",
    "alternative-quizlet": "0.8",
    # Pages repondant chacune a une requete precise, identifiee dans
    # l'autocompletion de Google. Elles visent des recherches plus
    # etroites que les pages generales, donc plus faciles a atteindre.
    "vocabulaire-anglais-prepa-ecg": "0.9",
    "anki-prepa-ecg": "0.8",
    "anki-prepa-mpsi-pcsi": "0.8",
    "colle-anglais-prepa": "0.8",
    "reviser-prepa-mpsi-pcsi": "0.8",
    "fiches-de-revision-prepa": "0.7",
    "memoriser-vocabulaire-anglais": "0.7",
    "tarifs": "0.7",
    "mentions-legales": "0.3",
    "confidentialite": "0.3",
    "cgv": "0.3",
}
PRIORITE_DEFAUT = "0.6"


def derniere_modification(page: dict) -> str:
    """Date de derniere modification reelle de la page.

    La date du front matter si elle existe (cas des articles), sinon la date
    du fichier source. Mettre la date du jour partout, comme c'etait le cas,
    annonce a Google que tout le site change quotidiennement : il apprend a
    ne plus s'y fier, et cesse de revenir vite sur ce qui a vraiment bouge.
    """
    if page.get("date"):
        return page["date"]
    chemin = page.get("path")
    if chemin is not None:
        return date.fromtimestamp(Path(chemin).stat().st_mtime).isoformat()
    return date.today().isoformat()



# Suffixe de marque ajoute aux titres pour le referencement. Il a sa place
# dans la balise <title>, que Google affiche, mais pas dans le texte de la
# page : un sommaire ou chaque ligne se termine par « | PrepaCards » est
# illisible, et repete la marque a un lecteur qui est deja sur le site.
SUFFIXE_MARQUE = " | PrépaCards"


def titre_affiche(titre: str) -> str:
    """Titre debarrasse du suffixe de marque, pour l'affichage dans la page."""
    return titre[:-len(SUFFIXE_MARQUE)] if titre.endswith(SUFFIXE_MARQUE) else titre


# ------------------------------------------------------------------
# Lecture des fichiers Markdown
# ------------------------------------------------------------------

def parse_front_matter(text: str) -> tuple:
    """Separe l'en-tete "cle: valeur" du corps Markdown.

    Volontairement minimaliste : pas de dependance a un analyseur YAML pour
    quelques champs de metadonnees.
    """
    if not text.startswith("---"):
        return {}, text

    _, header, body = text.split("---", 2)
    meta = {}
    for line in header.strip().splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()
    return meta, body.strip()


LIEN_ARTICLE = re.compile(r"\(/blog/([a-z0-9-]+)/?(?:#[^)]*)?\)")


def verifier_liens_vers_l_avenir(articles: list, aujourdhui: str) -> None:
    """Refuse qu'un article cite un article qui ne sera pas encore paru.

    Un article de la file cite volontiers les autres. Si l'un d'eux parait
    APRES lui, le lien vaut 404 le jour de sa publication — et l'audit, qui
    refuse les liens morts, arrete alors l'action quotidienne. Plus aucun
    article ne sort, sans que rien ne le signale ce jour-la.

    Aucun des outils existants ne peut le voir. La construction normale ne
    batit pas la file, donc ne verifie pas ses liens ; PREPACARDS_TOUT la
    batit entiere, comme si tout etait paru, et le lien y parait valide.
    Il faut donc comparer les DATES, ici, a la construction : l'erreur se
    montre quand on l'ecrit, et non des jours plus tard.

    La regle : un lien de A vers B est valable si B est paru au moment ou A
    parait, c'est-a-dire si date(B) <= max(date(A), aujourd'hui).
    """
    dates = {a["slug"]: a["date"] for a in articles}
    fautes = []
    for article in articles:
        visible_des = max(article["date"], aujourdhui)
        for cible in set(LIEN_ARTICLE.findall(article.get("raw_body", ""))):
            if cible not in dates:
                fautes.append(f"  {article['slug']} -> {cible} : article inexistant")
            elif dates[cible] > visible_des:
                jours = (date.fromisoformat(dates[cible])
                         - date.fromisoformat(visible_des)).days
                fautes.append(
                    f"  {article['slug']} (parait le {article['date']}) -> "
                    f"{cible} (parait le {dates[cible]}) : lien mort "
                    f"pendant {jours} jour(s)")
    if fautes:
        print("Liens vers des articles pas encore parus :")
        print("\n".join(sorted(fautes)))
        print("L'action quotidienne s'arreterait le jour de publication. "
              "Construction interrompue.")
        sys.exit(1)


def sommaire_html_depuis(converter: "markdown.Markdown") -> str:
    """Construit le sommaire des H2 a partir des ancres posees par 'toc'.

    L'extension 'toc' pose un id sur chaque titre et remplit
    converter.toc_tokens apres convert() : pas besoin d'ecrire [TOC] dans le
    Markdown ni de reparser le HTML.
    """
    items = [
        f'<li><a href="#{tok["id"]}">{html.escape(tok["name"])}</a></li>'
        for tok in converter.toc_tokens
        if tok["level"] == 2
    ]
    return "".join(items)


def inserer_chapo(html_body: str) -> str:
    """Isole le ou les paragraphes d'amorce (entre le H1 et le premier H2)
    dans un encadre '.chapo', sans toucher au reste du Markdown source.
    """
    fin_h1 = html_body.find("</h1>")
    if fin_h1 == -1:
        return html_body
    debut = fin_h1 + len("</h1>")
    fin_chapo = html_body.find("<h2", debut)
    if fin_chapo == -1:
        fin_chapo = len(html_body)
    avant, chapo, apres = html_body[:debut], html_body[debut:fin_chapo].strip(), html_body[fin_chapo:]
    if not chapo:
        return html_body
    return f'{avant}\n<div class="chapo">\n{chapo}\n</div>\n{apres}'


def load_page(path: Path) -> dict:
    meta, body = parse_front_matter(path.read_text(encoding="utf-8"))
    slug = meta.get("slug", path.stem)
    converter = markdown.Markdown(
        extensions=["extra", "toc", "attr_list", "sane_lists"]
    )
    html_body = converter.convert(body)
    sommaire_html = ""
    if path.parent.name == "blog":
        sommaire_html = sommaire_html_depuis(converter)
        html_body = inserer_chapo(html_body)
    return {
        "path": path,
        "slug": slug,
        "title": meta.get("title", slug),
        "description": meta.get("description", ""),
        "date": meta.get("date", ""),
        "hero": meta.get("hero", ""),
        "nav_label": meta.get("nav_label", ""),
        "noindex": meta.get("noindex", "").lower() == "true",
        "faq": meta.get("faq", ""),
        "body_html": envelopper(html_body),
        "sommaire_html": sommaire_html,
        "raw_body": body,
    }


def envelopper(html: str) -> str:
    """Pose les pages de texte simple sur une feuille blanche.

    Les pages composees (accueil, prepa, tarifs...) gerent elles-memes leurs
    sections. Les pages de texte au kilometre - mentions legales, CGV - ne
    sont qu'une suite de titres et de paragraphes : sans conteneur, elles
    flottent directement sur le degrade de fond, ou un long texte se lit mal.
    On ne les enveloppe donc que si elles ne commencent pas deja par une
    section.
    """
    if html.lstrip().startswith("<section"):
        return html
    return f'<div class="feuille-texte">\n{html}\n</div>'


# ------------------------------------------------------------------
# Donnees structurees (JSON-LD)
# ------------------------------------------------------------------

def software_jsonld() -> dict:
    """Decrit l'application. Google s'en sert pour les resultats enrichis.

    Aucune note ni nombre d'avis n'est declare : inventer un aggregateRating
    est une violation des regles de Google, et le site n'a aucun avis reel.
    """
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "PrépaCards",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Windows 10, Windows 11",
        "url": SITE_URL,
        "description": (
            "Application de flashcards à répétition espacée pour les prépas et "
            "les classes préparatoires, avec vérification de la prononciation à "
            "l'oral et reconnaissance de formules mathématiques en photo."
        ),
        "offers": [
            {
                "@type": "Offer",
                "name": "PrépaCards Gratuit",
                "price": "0",
                "priceCurrency": "EUR",
            },
            {
                "@type": "Offer",
                "name": "PrépaCards Premium",
                "price": "29.00",
                "priceCurrency": "EUR",
            },
        ],
    }


def article_jsonld(page: dict, url: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": page["title"],
        "description": page["description"],
        "datePublished": page["date"],
        "dateModified": page["date"],
        "author": {"@type": "Organization", "name": SITE_NAME},
        "publisher": {"@type": "Organization", "name": SITE_NAME},
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
    }


def faq_jsonld(body_html: str) -> dict:
    """Construit un FAQPage a partir des paires <h3>question</h3><p>reponse</p>.

    Le balisage est deduit du contenu reellement present sur la page : Google
    penalise un FAQPage qui annonce des questions invisibles pour le visiteur.
    """
    # On ne considere que ce qui suit le titre "Questions frequentes" : sinon
    # n'importe quel h3 de la page (un encadre de fonctionnalite, par exemple)
    # se retrouverait declare comme une question, ce que Google sanctionne.
    debut = re.search(r"<h2[^>]*>\s*Questions fr", body_html)
    section = body_html[debut.start():] if debut else body_html

    pairs = re.findall(
        r"<h3[^>]*>(.*?)</h3>\s*<p>(.*?)</p>", section, flags=re.DOTALL
    )
    if not pairs:
        return None

    def clean(fragment):
        return re.sub(r"<[^>]+>", "", fragment).strip()

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": clean(question),
                "acceptedAnswer": {"@type": "Answer", "text": clean(answer)},
            }
            for question, answer in pairs
        ],
    }


# ------------------------------------------------------------------
# Rendu
# ------------------------------------------------------------------

def css_version() -> str:
    """Empreinte courte du fichier de style, ajoutee a son adresse.

    Permet de le mettre en cache un an sans risque : toute modification change
    l'empreinte, donc l'adresse, donc le navigateur recharge la nouvelle
    version. Sans cela, une correction de mise en page resterait invisible
    plusieurs jours pour les visiteurs deja venus.
    """
    contenu = (STATIC / "style.css").read_bytes()
    # Fins de ligne ramenees a LF avant le calcul. Git rend ce fichier en
    # CRLF sous Windows et en LF sur le serveur de l'action quotidienne :
    # sur les octets bruts, le meme fichier donnait deux empreintes, et
    # chaque alternance entre une construction locale et une construction
    # automatique changeait l'adresse de la feuille de style sur toutes les
    # pages. Chaque visiteur la retelechargeait alors, sans que rien n'ait
    # change.
    return hashlib.sha256(contenu.replace(b"\r\n", b"\n")).hexdigest()[:10]


SEPARATEUR_NAV = chr(10) + ' ' * 8


def render_reseaux() -> str:
    """Les pictogrammes des reseaux, dans la barre sombre.

    Instagram n'a pas de chemin : sa marque est faite de trois formes
    geometriques simples, plus justes dessinees que decrites en un trace.
    """
    liens = []
    for nom, adresse, trace in RESEAUX:
        if trace:
            interieur = f'<path d="{trace}"/>'
        else:
            interieur = (
                '<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4"'
                ' fill="none" stroke="currentColor" stroke-width="1.9"/>'
                '<circle cx="12" cy="12" r="4.2" fill="none"'
                ' stroke="currentColor" stroke-width="1.9"/>'
                '<circle cx="17.5" cy="6.5" r="1.2"/>')
        liens.append(
            f'<a href="{adresse}" aria-label="{nom}" title="{nom}"'
            f' target="_blank" rel="noopener">'
            f'<svg viewBox="0 0 24 24" width="19" height="19"'
            f' fill="currentColor" aria-hidden="true" focusable="false">'
            f'{interieur}</svg></a>')
    return "".join(liens)


def render_menu_matieres(current: str) -> str:
    """Le menu a deux panneaux : filieres a gauche, matieres a droite.

    Sans JavaScript : chaque panneau de droite est range DANS l'element de
    gauche auquel il appartient, et se montre au survol ou au focus de
    celui-ci. Un menu qui exige un script se refermerait sur un visiteur
    dont le script n'a pas encore charge.
    """
    adresses = [a for a, _, _, _ in MENU_MATIERES]
    actif = " actif" if current in adresses else ""

    entrees = []
    for index, (href, libelle, detail, matieres) in enumerate(MENU_MATIERES):
        liens = "".join(
            f'<a href="{a}">{html.escape(l)}</a>' for a, l in matieres)
        # La premiere filiere est ouverte d'emblee : un panneau de droite
        # vide a l'ouverture donne l'impression d'un menu casse.
        premiere = " ouvert" if index == 0 else ""
        entrees.append(
            f'<li class="mega-item{premiere}">'
            f'<a class="mega-filiere" href="{href}">'
            f'<span><strong>{html.escape(libelle)}</strong>'
            f'<small>{html.escape(detail)}</small></span>'
            f'<span class="mega-chevron" aria-hidden="true">›</span></a>'
            f'<div class="mega-droite">{liens}</div>'
            f'</li>'
        )

    return (
        f'<div class="nav-groupe nav-mega">'
        f'<a class="nav-lien{actif}" href="/prepa/" aria-haspopup="true" '
        f'aria-expanded="false">Matières'
        f'<span class="nav-fleche" aria-hidden="true">&#9662;</span></a>'
        f'<div class="nav-menu mega-panneau">'
        f'<ul class="mega-gauche">{"".join(entrees)}</ul>'
        f'</div></div>'
    )


def render_nav(current: str) -> str:
    """Barre de navigation, avec sous-menus eventuels.

    Le parent est marque actif quand on se trouve sur lui OU sur l'une de ses
    sous-pages : sinon, un visiteur sur « Prepas scientifiques » ne verrait
    nulle part ou il se situe dans le site.
    """
    items = []
    for href, label, sous in NAV:
        # L'entree des filieres prend la forme d'un menu a deux panneaux :
        # les trois filieres a gauche, leurs matieres a droite.
        if href == "/prepa/":
            items.append(render_menu_matieres(current))
            continue

        adresses = [href] + [a for a, _, _ in (sous or [])]
        actif = " actif" if current in adresses else ""

        if not sous:
            items.append(f'<a class="nav-lien{actif}" href="{href}">'
                         f'{html.escape(label)}</a>')
            continue

        liens = "".join(
            f'<a href="{a}"><strong>{html.escape(l)}</strong>'
            f'<span>{html.escape(d)}</span></a>'
            for a, l, d in sous
        )
        items.append(
            f'<div class="nav-groupe">'
            f'<a class="nav-lien{actif}" href="{href}" aria-haspopup="true" '
            f'aria-expanded="false">{html.escape(label)}'
            f'<span class="nav-fleche" aria-hidden="true">&#9662;</span></a>'
            f'<div class="nav-menu">{liens}</div>'
            f'</div>'
        )
    return SEPARATEUR_NAV.join(items)


def render_footer() -> str:
    """Les colonnes du pied de page, titre puis liste de liens."""
    colonnes = []
    for titre, liens in FOOTER_COLONNES:
        entrees = "\n          ".join(
            f'<li><a href="{href}">{html.escape(libelle)}</a></li>'
            for href, libelle in liens)
        colonnes.append(
            f'<div class="pied-colonne">\n'
            f'        <h2>{html.escape(titre)}</h2>\n'
            f'        <ul>\n          {entrees}\n        </ul>\n'
            f'      </div>')
    return "\n      ".join(colonnes)


def render(page: dict, url_path: str, template: str, jsonld_blocks: list) -> str:
    base = (TEMPLATES / template).read_text(encoding="utf-8")
    canonical = SITE_URL + url_path
    blocks = [b for b in jsonld_blocks if b]
    jsonld = "\n".join(
        f'<script type="application/ld+json">{json.dumps(b, ensure_ascii=False)}</script>'
        for b in blocks
    )

    replacements = {
        "{{title}}": html.escape(page["title"]),
        "{{description}}": html.escape(page["description"]),
        "{{canonical}}": canonical,
        "{{content}}": transformer_faq(desenvelopper_blocs(page["body_html"])),
        "{{script_etapes}}": scripts_animes(page["body_html"]),
        "{{jsonld}}": jsonld,
        "{{nav}}": render_nav(url_path),
        "{{reseaux}}": render_reseaux(),
        "{{footer_links}}": render_footer(),
        "{{og_image}}": SITE_URL + DEFAULT_OG,
        "{{year}}": str(date.today().year),
        "{{robots}}": "noindex, follow" if page["noindex"] else "index, follow",
        "{{date_affichee}}": format_date(page["date"]),
        "{{date_iso}}": page["date"],
        "{{lien_telechargement}}": DOWNLOAD_URL,
        "{{version_css}}": css_version(),
        "{{bloc_telechargement}}": bloc_telechargement(),
        "{{bloc_decks}}": bloc_decks(),
        "{{bloc_paiement}}": bloc_paiement(),
        "{{bouton_mensuel}}": bouton_abonnement("mensuel", False),
        "{{bouton_annuel}}": bouton_abonnement("annuel", True),
        "{{bandeau_ecoles}}": bandeau_ecoles(),
        "{{sommaire}}": page.get("sommaire_html", ""),
        "{{titre_court}}": html.escape(titre_affiche(page["title"])),
    }
    for marker, value in replacements.items():
        base = base.replace(marker, value)
    return base


def format_date(iso: str) -> str:
    if not iso:
        return ""
    mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
            "août", "septembre", "octobre", "novembre", "décembre"]
    try:
        d = datetime.strptime(iso, "%Y-%m-%d")
    except ValueError:
        return iso
    return f"{d.day} {mois[d.month - 1]} {d.year}"


def write(url_path: str, content: str) -> None:
    """Ecrit une page a une URL se terminant par /, donc dans index.html.

    Des URL en /page/ plutot que /page.html : plus lisibles, et modifiables
    plus tard sans casser les liens ni perdre le referencement acquis.
    """
    target = OUTPUT / url_path.strip("/") / "index.html" if url_path != "/" \
        else OUTPUT / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


# ------------------------------------------------------------------
# Construction
# ------------------------------------------------------------------

# Ce qui survit au vidage de la sortie. « source » n'y est que lorsque
# le depot heberge aussi les fichiers de construction, pour que l'action
# planifiee ait de quoi reconstruire ; il n'est jamais servi (.assetsignore).
def copier_source(destination: Path) -> None:
    """Depose de quoi reconstruire le site dans le depot lui-meme.

    L'action planifiee qui publie les articles en attente doit pouvoir
    reconstruire : elle a donc besoin de ces fichiers, et le depot ne
    contenait jusqu'ici que le site deja construit.

    La copie est faite a CHAQUE construction locale, et pas a la main :
    une source figee dans le depot pendant qu'on modifie la sienne
    produirait, un matin, un site revenu en arriere sans explication.

    Rien de tout cela n'est servi en ligne : « source » est dans
    .assetsignore.
    """
    # Quand ROOT est deja dans la destination, c'est l'action elle-meme
    # qui construit : elle n'a pas a se recopier sur elle-meme.
    if ROOT.resolve() == destination.resolve() or destination.resolve() in ROOT.resolve().parents:
        return

    cible = destination / "source"
    if cible.exists():
        shutil.rmtree(cible)
    cible.mkdir(parents=True)
    for nom in ("build_site.py", "audit_site.py"):
        shutil.copy2(ROOT / nom, cible / nom)
    # « worker » en fait partie depuis que la construction va y chercher le
    # code du service : l'action quotidienne reconstruit depuis source/, et
    # sans ce dossier elle s'arreterait sur une erreur chaque matin.
    for nom in ("content", "templates", "static", "worker"):
        shutil.copytree(ROOT / nom, cible / nom,
                        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    (cible / "requirements.txt").write_text(
        "markdown\n", encoding="utf-8")


PRESERVES = {".git", ".gitignore", "source", ".github"}


def vider(dossier: Path) -> None:
    """Vide un dossier sans le supprimer lui-meme.

    Windows refuse de supprimer un dossier qui sert de repertoire courant a
    un processus : lancer le serveur de previsualisation depuis public/ y
    suffisait, et la construction echouait sur une PermissionError. Supprimer
    le contenu plutot que le contenant evite entierement le probleme.
    """
    for element in dossier.iterdir():
        # Le dossier .git doit survivre : public/ est aussi le depot pousse
        # vers GitHub, et l'effacer a chaque construction detruirait tout
        # l'historique du site.
        if element.name in PRESERVES:
            continue
        if element.is_dir() and not element.is_symlink():
            shutil.rmtree(element)
        else:
            element.unlink()



def versionner_ressources() -> int:
    """Ajoute ?v=empreinte aux images et aux polices du site produit.

    Deux raisons, dont une apprise a nos depens.

    La premiere est classique : sans empreinte, remplacer une capture d'ecran
    laisse l'ancienne affichee pendant un an chez qui l'a deja vue, puisque
    l'en-tete de cache annonce « immutable ».

    La seconde est plus vicieuse. Tant que les images manquaient en ligne,
    l'hebergeur a applique ce meme en-tete AUX REPONSES 404 : les navigateurs
    ont donc enregistre « cette image n'existe pas » pour un an, sans prevoir
    de reverifier. Corriger l'en-tete ne les aiderait pas - ils ne
    redemanderaient rien. Seul un changement d'adresse les force a refaire la
    requete.
    """
    empreintes = {}
    for dossier in ("img", "fonts"):
        racine = OUTPUT / dossier
        if not racine.is_dir():
            continue
        for fichier in racine.rglob("*"):
            if fichier.is_file():
                chemin = "/" + fichier.relative_to(OUTPUT).as_posix()
                empreintes[chemin] = hashlib.sha256(
                    fichier.read_bytes()).hexdigest()[:8]

    if not empreintes:
        return 0

    # Les plus longs d'abord : sans cela "/img/logo.png" serait remplace a
    # l'interieur de "/img/logo.png.bak" et produirait une adresse invalide.
    motif = re.compile(
        "(" + "|".join(re.escape(c) for c in
                       sorted(empreintes, key=len, reverse=True)) + r")(?![\w.?])"
    )

    # Seuls les fichiers SERVIS recoivent une empreinte. La sortie contient
    # aussi la copie des sources (source/), dont l'action quotidienne se
    # sert pour reconstruire le site. Les versionner aussi revenait a
    # injecter des « ?v= » dans les gabarits d'origine ; et comme le motif
    # refuse de re-versionner une adresse qui en porte deja un, ces gabarits
    # gardaient pour toujours l'ANCIENNE empreinte. Une image remplacee
    # serait restee affichee dans son ancienne version pendant un an — le
    # defaut meme que cette fonction existe pour empecher.
    def servi(fichier: Path) -> bool:
        premier = fichier.relative_to(OUTPUT).parts[0]
        return premier not in {"source", ".git", ".github", "worker"}

    modifies = 0
    candidats = list(OUTPUT.rglob("*.html")) + list(OUTPUT.rglob("*.css"))
    for fichier in (f for f in candidats if servi(f)):
        texte = fichier.read_text(encoding="utf-8")
        nouveau = motif.sub(lambda m: f"{m.group(1)}?v={empreintes[m.group(1)]}", texte)
        if nouveau != texte:
            fichier.write_text(nouveau, encoding="utf-8")
            modifies += 1
    return modifies


def build() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    vider(OUTPUT)

    # Les fichiers d'origine des logos servent a regenerer les versions
    # normalisees ; les publier doublerait leur poids sans aucun usage.
    shutil.copytree(STATIC, OUTPUT, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns("source"))

    # Code du service de comptes. Il etait auparavant recopie a la main dans
    # static/worker/, soit deux exemplaires du meme fichier : corriger l'un
    # sans l'autre deployait une version differente de celle qu'on venait
    # d'eprouver — et c'est le code d'authentification. La construction va
    # desormais le chercher a sa source unique. Il n'est pas SERVI pour
    # autant : .assetsignore exclut « worker ».
    shutil.copytree(ROOT / "worker", OUTPUT / "worker", dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))

    urls = []

    # --- Pages ---------------------------------------------------------
    for path in sorted(CONTENT.glob("*.md")):
        page = load_page(path)

        # La page d'erreur doit s'appeler 404.html et se trouver a la racine :
        # c'est la que Cloudflare Pages comme Apache vont la chercher.
        if page["slug"] == "404":
            (OUTPUT / "404.html").write_text(
                render(page, "/404.html", "base.html", []), encoding="utf-8"
            )
            continue

        url_path = "/" if page["slug"] == "index" else f"/{page['slug']}/"
        blocks = []
        if page["slug"] == "index":
            blocks.append(software_jsonld())
        if page["faq"].lower() == "true":
            blocks.append(faq_jsonld(page["body_html"]))
        write(url_path, render(page, url_path, "base.html", blocks))
        if not page["noindex"]:
            urls.append((url_path, derniere_modification(page),
                         PRIORITES.get(page["slug"], PRIORITE_DEFAUT)))

    # --- Articles ------------------------------------------------------
    # File d'attente : un article date d'apres aujourd'hui existe dans le
    # depot mais n'est ni construit, ni indexe, ni liste. C'est ce qui
    # permet d'ecrire plusieurs articles d'avance et de les laisser
    # paraitre tout seuls, un par un.
    #
    # Le filtre est volontairement ici et non dans l'action planifiee :
    # une construction manuelle doit donner exactement le meme site qu'une
    # construction automatique, sinon on publierait par accident en
    # relancant le script a la main.
    tous = [load_page(p) for p in CONTENT.glob("blog/*.md")]
    # PREPACARDS_TOUT=1 construit AUSSI les articles en attente. Sert a les
    # verifier avant de les livrer : un titre trop long dans un article qui
    # paraitra dans dix jours ferait echouer l'audit ce jour-la, donc
    # bloquerait le push - et avec lui tous les articles suivants, qui
    # attendent derriere. L'erreur est alors silencieuse et differee.
    #
    #     PREPACARDS_TOUT=1 python build_site.py && python audit_site.py
    #
    # A ne jamais utiliser pour publier : cela sortirait la file entiere
    # d'un coup.
    aujourdhui = "9999-12-31" if os.environ.get("PREPACARDS_TOUT") else date.today().isoformat()
    verifier_liens_vers_l_avenir(tous, date.today().isoformat())
    en_attente = [a for a in tous if a["date"] > aujourdhui]
    articles = [a for a in tous if a["date"] <= aujourdhui]
    if en_attente:
        prochains = sorted(a["date"] for a in en_attente)
        print(f"  {len(en_attente)} article(s) en attente, prochain le "
              f"{prochains[0]}")
    articles.sort(key=lambda a: a["date"], reverse=True)

    for article in articles:
        url_path = f"/blog/{article['slug']}/"
        url = SITE_URL + url_path
        write(url_path, render(article, url_path, "article.html",
                               [article_jsonld(article, url)]))
        urls.append((url_path, article["date"], "0.6"))

    # --- Sommaire du blog ---------------------------------------------
    cartes = []
    for article in articles:
        cartes.append(
            f'<li><a href="/blog/{article["slug"]}/">'
            f'<span class="art-date">{format_date(article["date"])}</span>'
            f'<strong>{html.escape(titre_affiche(article["title"]))}</strong>'
            f'<span class="art-desc">{html.escape(article["description"])}</span>'
            f"</a></li>"
        )
    index = {
        "slug": "blog",
        "title": "Méthodes de révision en prépa : le blog | PrépaCards",
        "description": (
            "Méthodes de révision pour la prépa : flashcards, répétition "
            "espacée, récitation à l'oral et formules de maths. Des retours "
            "concrets sur la préparation des concours."
        ),
        "date": "", "hero": "", "nav_label": "", "noindex": False, "faq": "",
        "body_html": (
            "<h1>Méthodes de révision en prépa</h1>\n"
            "<p class=\"chapeau\">Méthode de travail, répétition espacée et "
            "retours concrets sur la préparation des concours.</p>\n"
            f'<ul class="liste-articles">{"".join(cartes)}</ul>'
        ),
        "raw_body": "",
    }
    write("/blog/", render(index, "/blog/", "base.html", []))
    urls.append(("/blog/", date.today().isoformat(), "0.7"))

    # --- Plan du site et robots ---------------------------------------
    entries = "\n".join(
        f"  <url><loc>{SITE_URL}{u}</loc>"
        f"<lastmod>{d}</lastmod><priority>{p}</priority></url>"
        for u, d, p in urls
    )
    (OUTPUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{entries}\n</urlset>\n",
        encoding="utf-8",
    )
    (OUTPUT / "robots.txt").write_text(
        "User-agent: *\nAllow: /\n\n"
        f"Sitemap: {SITE_URL}/sitemap.xml\n",
        encoding="utf-8",
    )

    # En dernier : les pages doivent toutes exister avant qu'on y reecrive
    # les adresses d'images.
    modifies = versionner_ressources()
    copier_source(OUTPUT)

    print(f"Site construit dans {OUTPUT}")
    print(f"  Images et polices versionnees dans {modifies} fichier(s)")
    if DOWNLOAD_PLACEHOLDER in DOWNLOAD_URL:
        print("  ATTENTION : DOWNLOAD_URL n'est pas renseignee.")
        print("  La page de telechargement affiche un encadre d'attente au")
        print("  lieu d'un bouton. Renseignez l'adresse de l'archive puis")
        print("  relancez la construction.")
    print(f"  {len(urls)} pages, dont {len(articles)} articles de blog")
    for u, _, _ in sorted(urls):
        print(f"    {SITE_URL}{u}")


if __name__ == "__main__":
    build()
