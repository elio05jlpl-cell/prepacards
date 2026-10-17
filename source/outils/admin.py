"""
Administration d'un compte, par son adresse e-mail
===================================================

    python source/outils/admin.py etat eleve@exemple.fr
    python source/outils/admin.py prolonger eleve@exemple.fr 14
    python source/outils/admin.py prolonger eleve@exemple.fr -3      (retire 3 jours)
    python source/outils/admin.py apercu-emails        (qui recevrait quoi aujourd'hui)

`prolonger` ajoute des jours à la fin de l'essai (à partir d'aujourd'hui si
l'essai est déjà terminé) et efface les rappels de fin d'essai déjà envoyés,
pour qu'ils repartent. Limité à ±365 jours par appel.

Chaque commande qui MODIFIE demande de retaper l'adresse pour confirmer : une
faute de frappe sur un compte ne doit jamais toucher le mauvais.

Prérequis : SQL de source/worker/migrations exécuté, et
SUPABASE_SERVICE_ROLE_KEY défini (voir _commun.py).
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _commun as c


def principal() -> int:
    ap = argparse.ArgumentParser(description="Administration d'un compte")
    sous = ap.add_subparsers(dest="commande", required=True)
    e = sous.add_parser("etat", help="affiche l'état d'un compte")
    e.add_argument("email")
    sous.add_parser("apercu-emails",
                    help="liste ce que le planificateur enverrait aujourd'hui, sans rien envoyer")
    p = sous.add_parser("prolonger", help="ajoute des jours d'essai")
    p.add_argument("email")
    p.add_argument("jours", type=int)
    p.add_argument("--oui", action="store_true", help="ne pas demander confirmation")
    args = ap.parse_args()

    if args.commande == "apercu-emails":
        lignes = c.rpc("emails_essai_a_envoyer") or []
        par_genre = {}
        for ligne in lignes:
            par_genre.setdefault(ligne["genre"], []).append(ligne["adresse"])
        if not par_genre:
            print("Rien à envoyer aujourd'hui.")
        for genre, adresses in sorted(par_genre.items()):
            print(f"{genre} : {len(adresses)} message(s)")
            for a in adresses[:10]:
                print(f"    {a}")
            if len(adresses) > 10:
                print(f"    … et {len(adresses) - 10} autres")
        print("\nAperçu seulement : rien n'a été envoyé ni réservé.")
        return 0

    if args.commande == "etat":
        resultat = c.rpc("admin_etat_compte", {"p_email": args.email})
    else:
        if not args.oui:
            saisie = input(f"Prolonger l'essai de {args.email} de {args.jours} jour(s) ? "
                           "Retapez l'adresse pour confirmer : ").strip().lower()
            if saisie != args.email.strip().lower():
                print("Adresse différente : abandon, rien n'a été modifié.")
                return 1
        resultat = c.rpc("admin_prolonger_essai",
                         {"p_email": args.email, "p_jours": args.jours})

    print(json.dumps(resultat, ensure_ascii=False, indent=2))
    return 1 if isinstance(resultat, dict) and resultat.get("erreur") else 0


if __name__ == "__main__":
    sys.exit(c.executer(principal))
