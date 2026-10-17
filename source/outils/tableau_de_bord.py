"""
Tableau de bord : comptes, essais, abonnés, e-mails, erreurs
=============================================================

    python source/outils/tableau_de_bord.py            lecture lisible
    python source/outils/tableau_de_bord.py --json     le JSON brut

Prérequis : avoir exécuté le SQL de source/worker/migrations (fonction
tableau_de_bord) et défini SUPABASE_SERVICE_ROLE_KEY (voir _commun.py).

Aucune page publique n'expose ces chiffres : ils ne sortent que sur votre
poste, par la clé que vous gardez dans votre environnement.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _commun as c


def pct(a, b):
    return f"{100 * a / b:.0f} %" if b else "n/a"


def afficher(d: dict) -> None:
    print(f"Tableau de bord PrépaCards — {str(d.get('genere_le', ''))[:16].replace('T', ' ')} UTC\n")

    print("COMPTES")
    print(f"  total                      {d['comptes']:>6}")
    print(f"  adresse confirmée          {d['confirmes']:>6}  ({pct(d['confirmes'], d['comptes'])})")
    print(f"  inscrits sur 7 jours       {d['inscrits_7j']:>6}")
    print(f"  inscrits sur 30 jours      {d['inscrits_30j']:>6}")

    print("\nESSAI ET ABONNEMENT")
    print(f"  en essai                   {d['en_essai']:>6}")
    print(f"  essai terminé, sans abonnement {d['essai_termine_sans_abonnement']:>2}")
    print(f"  abonnés actifs             {d['abonnes_actifs']:>6}"
          f"  (mensuel {d['abonnes_mensuels']}, annuel {d['abonnes_annuels']})")
    print(f"  revenu mensuel estimé      {d['revenu_mensuel_estime_eur']:>6} €")
    print(f"  résiliés                   {d['resilies']:>6}")
    conv = d.get("conversion_pct")
    print(f"  conversion après essai     {('n/a' if conv is None else f'{conv} %'):>6}")

    print("\nUSAGE (approximation)")
    print(f"  ont déposé une sauvegarde  {d['avec_sauvegarde']:>6}")
    print(f"  ont lu une feuille         {d['ont_scanne']:>6}")

    print("\nE-MAILS")
    print(f"  consentement aux conseils  {d['consentement_conseils']:>6}")
    for genre, n in sorted((d.get('emails_envoyes_par_type') or {}).items()):
        print(f"  envoyés {genre:<16} {n:>6}")

    prepas = d.get("prepas_principales") or []
    if prepas:
        print("\nPRÉPAS D'ORIGINE (10 premières)")
        for p in prepas:
            print(f"  {p['comptes']:>4}  {p['prepa']} ({p.get('filiere') or '?'})")

    erreurs = d.get("rapports_erreurs_7j_par_version") or {}
    print("\nRAPPORTS D'ERREURS (7 jours)")
    print("  " + (", ".join(f"{v} : {n}" for v, n in sorted(erreurs.items())) or "aucun"))

    attente = d.get("liste_attente") or {}
    print("\nLISTE D'ATTENTE")
    print("  " + (", ".join(f"{k} : {n}" for k, n in sorted(attente.items())) or "vide"))
    print("\nSignal de décision pour le mobile : si la liste d'attente dépasse "
          "largement les comptes Windows, priorité à la version web.")


def principal() -> int:
    donnees = c.rpc("tableau_de_bord")
    if "--json" in sys.argv:
        print(json.dumps(donnees, ensure_ascii=False, indent=2))
    else:
        afficher(donnees)
    return 0


if __name__ == "__main__":
    sys.exit(c.executer(principal))
