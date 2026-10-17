"""
Remplit les mentions légales et les CGV avec l'identité du vendeur
===================================================================

Pourquoi ce script : on ne peut pas vendre sans identifier le vendeur
(article 6-III de la LCEN pour les mentions légales, L111-1 du Code de la
consommation pour les CGV), et ces informations n'existent pas encore dans le
dépôt. Plutôt que de laisser des « [crochets] » en ligne, les textes complets
vivent ici sous forme de modèles ; ce script les remplit le jour où l'identité
existe, et REFUSE de rien écrire tant qu'un champ manque.

Usage, depuis la racine du dépôt du site :

    1. copier source/juridique/identite.exemple.json en identite.json
       (ce fichier est ignoré par Git) et le remplir ;
    2. python source/juridique/appliquer_identite.py --verifier
    3. python source/juridique/appliquer_identite.py
    4. reconstruire le site (voir CLAUDE.md), relire les deux pages, pousser.

Les modèles ne sont PAS un avis juridique : à faire relire.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
CONTENU = ICI.parent / "content"
CHAMPS = ["denomination", "statut", "adresse", "siret", "mention_tva",
          "libelle_taxes", "directeur_publication", "delai_assistance",
          "mediateur", "date_mise_a_jour"]
EXEMPLE = json.loads((ICI / "identite.exemple.json").read_text(encoding="utf-8"))
MODELES = {"cgv.md.tmpl": "cgv.md", "mentions-legales.md.tmpl": "mentions-legales.md"}


def charger(chemin: Path) -> dict:
    if not chemin.exists():
        sys.exit(f"Fichier introuvable : {chemin}\n"
                 "Copiez identite.exemple.json en identite.json et remplissez-le.")
    donnees = json.loads(chemin.read_text(encoding="utf-8"))
    manquants = [c for c in CHAMPS if not str(donnees.get(c, "")).strip()]
    # Une valeur identique à l'exemple n'a pas été remplie.
    gardes = [c for c in CHAMPS if c not in manquants
              and str(donnees[c]).strip() == str(EXEMPLE.get(c, "")).strip()]
    if manquants or gardes:
        if manquants:
            print("Champs vides :", ", ".join(manquants))
        if gardes:
            print("Champs encore à la valeur de l'exemple :", ", ".join(gardes))
        sys.exit(1)
    return donnees


def rendre(modele: str, donnees: dict) -> str:
    texte = modele
    for cle in CHAMPS:
        texte = texte.replace("{{" + cle + "}}", str(donnees[cle]).strip())
    restes = re.findall(r"\{\{[a-z_]+\}\}", texte)
    if restes:
        sys.exit(f"Marqueurs non remplis : {sorted(set(restes))}")
    return texte


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--identite", type=Path, default=ICI / "identite.json")
    ap.add_argument("--verifier", action="store_true",
                    help="vérifie seulement, n'écrit rien")
    args = ap.parse_args()

    donnees = charger(args.identite)
    sorties = {}
    for modele, cible in MODELES.items():
        sorties[cible] = rendre((ICI / modele).read_text(encoding="utf-8"), donnees)
    if args.verifier:
        print("Identité complète : prête à écrire dans", ", ".join(MODELES.values()))
        return 0
    for cible, texte in sorties.items():
        (CONTENU / cible).write_text(texte, encoding="utf-8", newline="\n")
        print("Écrit :", CONTENU / cible)
    print("\nReconstruisez le site, relisez les deux pages, puis poussez.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
