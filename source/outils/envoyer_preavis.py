"""
Préavis aux comptes existants : l'application devient payante
==============================================================

    python source/outils/envoyer_preavis.py --date-bascule 2026-11-15
        -> simulation : compte les destinataires, n'envoie RIEN (défaut)
    python source/outils/envoyer_preavis.py --date-bascule 2026-11-15 --test moi@exemple.fr
        -> envoie le message à cette seule adresse, pour le relire en vrai
    python source/outils/envoyer_preavis.py --date-bascule 2026-11-15 --envoyer
        -> envoie à tous les comptes concernés (confirmation demandée)

Ce message est une INFORMATION CONTRACTUELLE sur un changement d'offre, pas un
message commercial : il part à tous les comptes dont l'adresse est confirmée,
sans consentement préalable. Il ne contient aucun lien de désinscription parce
qu'il n'y en a rien à choisir ; il explique en revanche comment supprimer son
compte.

Garde-fous :
  - la simulation est le comportement par défaut ;
  - `--envoyer` redemande le nombre exact de destinataires avant de partir ;
  - chaque adresse déjà servie est notée dans preavis-envoyes.txt (ignoré par
    Git) : relancer l'outil après une interruption ne renvoie à personne deux
    fois ;
  - les comptes déjà abonnés sont exclus ;
  - un envoi toutes les 0,6 seconde, pour rester sous la limite du service.

Variables d'environnement (voir _commun.py pour la première) :
  SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
  COURRIEL_EXPEDITEUR (ex. « PrépaCards <noreply@prepacards.fr> »),
  COURRIEL_REPONSE (facultatif).
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _commun as c
from sauvegarde_base import lire_comptes, lire_table

SUIVI = Path(__file__).resolve().parent / "preavis-envoyes.txt"
ENVOI = "https://api.resend.com/emails"
PAUSE = 0.6

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
        "septembre", "octobre", "novembre", "décembre"]


def date_fr(jour: datetime.date) -> str:
    return f"{jour.day}{'er' if jour.day == 1 else ''} {MOIS[jour.month - 1]} {jour.year}"


def message(jour: datetime.date) -> tuple:
    d = date_fr(jour)
    texte = "\n".join([
        "Bonjour,",
        "",
        "Vous avez un compte PrépaCards. Nous vous écrivons à l'avance au sujet",
        "d'un changement d'offre.",
        "",
        f"À partir du {d}, l'application devient payante : 9,99 € par mois ou",
        "95,90 € par an (7,99 € par mois), sans engagement.",
        "",
        f"Vous gardez tout l'accès sans payer pendant 30 jours à compter du {d},",
        "sans carte bancaire. Rien ne change d'ici là, et rien ne se paie tout",
        "seul : à la fin de ces 30 jours, l'application vous demande simplement",
        "de vous abonner ou de quitter.",
        "",
        "Ce qui reste vrai quoi que vous décidiez :",
        "- vos cartes sont sur votre ordinateur, jamais sur nos serveurs ;",
        "- vous pouvez exporter tous vos paquets depuis l'application, même",
        "  après la fin de l'essai ;",
        "- les paquets gratuits du site restent téléchargeables avec un compte.",
        "",
        "Vous ne souhaitez pas continuer ? Vous pouvez supprimer votre compte à",
        "tout moment : https://prepacards.fr/compte/",
        "",
        "Une question, une remarque ? Répondez simplement à ce message.",
        "",
        "L'équipe PrépaCards",
    ])
    html = (
        '<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f4f6fb">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">'
        '<tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="max-width:520px;background:#fff;border-radius:16px;padding:32px;font-family:-apple-system,'
        'Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a"><tr><td>'
        f'<p style="margin:0 0 16px;font-size:19px;font-weight:700">Ce qui change le {d}</p>'
        '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155">'
        f"À partir du <strong>{d}</strong>, l'application devient payante : "
        '<strong>9,99 € par mois</strong> ou <strong>95,90 € par an</strong> (7,99 € par mois), '
        'sans engagement.</p>'
        '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155">'
        f"Vous gardez tout l'accès <strong>sans payer pendant 30 jours</strong> à compter du {d}, "
        "sans carte bancaire. Rien ne change d'ici là, et rien ne se paie tout seul.</p>"
        '<ul style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.6;color:#334155">'
        '<li>vos cartes sont sur votre ordinateur, jamais sur nos serveurs ;</li>'
        "<li>vous pouvez exporter tous vos paquets depuis l'application, même après l'essai ;</li>"
        '<li>les paquets gratuits du site restent téléchargeables avec un compte.</li></ul>'
        '<p style="margin:0 0 6px;font-size:13.5px;line-height:1.55;color:#64748b">'
        'Vous ne souhaitez pas continuer ? Vous pouvez '
        '<a href="https://prepacards.fr/compte/" style="color:#1e3a8a">supprimer votre compte</a> '
        'à tout moment. Une question ? Répondez simplement à ce message.</p>'
        '</td></tr></table></td></tr></table></body></html>'
    )
    return f"PrépaCards : ce qui change le {d}", texte, html


def envoyer(adresse: str, sujet: str, texte: str, html: str) -> None:
    cle = os.environ.get("RESEND_API_KEY", "").strip()
    expediteur = os.environ.get("COURRIEL_EXPEDITEUR", "").strip()
    if not cle or not expediteur:
        raise c.OutilErreur("RESEND_API_KEY et COURRIEL_EXPEDITEUR doivent être définis "
                            "dans l'environnement.")
    corps = {"from": expediteur, "to": [adresse], "subject": sujet,
             "text": texte, "html": html}
    if os.environ.get("COURRIEL_REPONSE"):
        corps["reply_to"] = [os.environ["COURRIEL_REPONSE"]]
    requete = urllib.request.Request(ENVOI, data=json.dumps(corps).encode("utf-8"),
                                     method="POST")
    requete.add_header("Authorization", f"Bearer {cle}")
    requete.add_header("Content-Type", "application/json")
    requete.add_header("User-Agent", c.AGENT)
    try:
        urllib.request.urlopen(requete, timeout=30).read()
    except urllib.error.HTTPError as e:
        raise c.OutilErreur(f"Refus du service d'e-mail ({e.code}) pour {adresse} : "
                            f"{e.read().decode('utf-8', 'replace')[:200]}") from e


def destinataires() -> list:
    """Adresses confirmees des comptes qui ne sont pas deja abonnes."""
    profils = {p["id"]: p for p in lire_table("profiles", "id")}
    maintenant = datetime.datetime.now(datetime.timezone.utc)
    resultat = []
    for u in lire_comptes():
        if not u.get("email") or not u.get("email_confirmed_at"):
            continue
        p = profils.get(u["id"]) or {}
        fin = p.get("valide_jusqu_au")
        abonne = (p.get("statut") in ("trialing", "active", "past_due")
                  and (not fin or datetime.datetime.fromisoformat(
                      fin.replace("Z", "+00:00")) > maintenant))
        if not abonne:
            resultat.append(u["email"].strip().lower())
    return sorted(set(resultat))


def principal() -> int:
    ap = argparse.ArgumentParser(description="Préavis du passage à l'offre payante")
    ap.add_argument("--date-bascule", required=True, help="AAAA-MM-JJ")
    ap.add_argument("--test", metavar="ADRESSE", help="envoie à cette seule adresse")
    ap.add_argument("--envoyer", action="store_true", help="envoie vraiment à tous")
    ap.add_argument("--limite", type=int, default=0, help="n'envoie qu'à N adresses")
    args = ap.parse_args()

    jour = datetime.date.fromisoformat(args.date_bascule)
    if jour < datetime.date.today() and (args.envoyer or args.test):
        raise c.OutilErreur("La date de bascule est déjà passée.")
    sujet, texte, html = message(jour)

    if args.test:
        envoyer(args.test, sujet, texte, html)
        print(f"Message de test envoyé à {args.test}. Relisez-le en vrai (mobile compris).")
        return 0

    deja = set(SUIVI.read_text(encoding="utf-8").split()) if SUIVI.exists() else set()
    tous = destinataires()
    a_servir = [a for a in tous if a not in deja]
    if args.limite:
        a_servir = a_servir[:args.limite]

    print(f"Comptes concernés : {len(tous)} ; déjà servis : {len(tous) - len([a for a in tous if a not in deja])}"
          f" ; à servir maintenant : {len(a_servir)}")
    print(f"\nSujet : {sujet}\n\n{texte}\n")
    if not args.envoyer:
        print("SIMULATION : rien n'a été envoyé. Ajoutez --envoyer pour partir pour de bon.")
        return 0
    if not a_servir:
        print("Rien à envoyer.")
        return 0

    saisie = input(f"Envoyer à {len(a_servir)} adresses ? Retapez ce nombre : ").strip()
    if saisie != str(len(a_servir)):
        print("Nombre différent : abandon, rien n'a été envoyé.")
        return 1

    envoyes = 0
    for adresse in a_servir:
        envoyer(adresse, sujet, texte, html)
        with SUIVI.open("a", encoding="utf-8") as f:
            f.write(adresse + "\n")
        envoyes += 1
        print(f"  {envoyes}/{len(a_servir)} {adresse}")
        time.sleep(PAUSE)
    print(f"\n{envoyes} messages envoyés.")
    return 0


if __name__ == "__main__":
    sys.exit(c.executer(principal))
