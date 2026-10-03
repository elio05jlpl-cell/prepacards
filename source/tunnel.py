"""
Le tunnel, de la visite à l'abonnement
=======================================

    python source/tunnel.py

Trois chiffres, de trois sources différentes, parce qu'aucune ne les a tous.

1. LES VISITES viennent de Cloudflare Web Analytics, qui n'est pas
   interrogeable sans jeton d'API : ce script ne les récupère pas, il
   rappelle seulement où les lire.

2. LES TÉLÉCHARGEMENTS viennent de l'API publique de GitHub, qui compte
   exactement les téléchargements de chaque fichier de release. C'est la
   mesure la plus fiable des trois, et elle ne demande ni outil ni
   installation : GitHub compte déjà.

3. LES ABONNEMENTS se lisent sur les vues de /merci/, page en « noindex »
   qu'on n'atteint qu'après un paiement Stripe. Une vue y équivaut à un
   abonnement, à l'erreur près des rechargements.

Pourquoi pas un seul outil : parce que le téléchargement part vers GitHub.
Une mesure côté site ne verrait que le CLIC sur le bouton, pas le fichier
réellement récupéré — et c'est entre les deux que se perd la moitié des
gens, sur 273 Mo.
"""

import json
import sys
import urllib.error
import urllib.request

# La console Windows est en cp1252 : une fleche ou un accent y fait
# planter print(). On force donc la sortie en UTF-8 plutot que de
# s'interdire les caracteres francais dans un outil francais.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):  # sortie redirigee, deja correcte
    pass

DEPOT = "elio05jlpl-cell/prepacards"
TABLEAU_CLOUDFLARE = (
    "https://dash.cloudflare.com/ → Analytics & Logs → Web Analytics")


def releases() -> list:
    adresse = f"https://api.github.com/repos/{DEPOT}/releases"
    requete = urllib.request.Request(
        adresse, headers={"Accept": "application/vnd.github+json",
                          "User-Agent": "prepacards-tunnel"})
    with urllib.request.urlopen(requete, timeout=30) as reponse:
        return json.load(reponse)


def main() -> int:
    try:
        versions = releases()
    except urllib.error.URLError as erreur:
        print(f"GitHub injoignable : {erreur}", file=sys.stderr)
        return 1

    print("TÉLÉCHARGEMENTS — source : API GitHub, comptage exact")
    print()
    total = 0
    for version in versions:
        for fichier in version.get("assets", []):
            n = fichier.get("download_count", 0)
            total += n
            etat = "  (actuelle)" if version is versions[0] else ""
            print(f"  {version['tag_name']:10} {fichier['name']:34} "
                  f"{n:5}{etat}")
    print(f"\n  {'TOTAL':10} {'':34} {total:5}")

    print()
    print("VISITES ET ABONNEMENTS — à lire dans Cloudflare")
    print()
    print(f"  {TABLEAU_CLOUDFLARE}")
    print()
    print("  Les trois chiffres à relever chaque semaine :")
    print("    visites de  /telecharger/   → combien arrivent au bouton")
    print("    téléchargements ci-dessus   → combien vont au bout des 273 Mo")
    print("    visites de  /merci/         → combien s'abonnent")
    print()
    print("  Les deux taux qui décident de tout :")
    print("    téléchargements ÷ visites de /telecharger/")
    print("        sous 10 %, aucune campagne payante ne sera rentable :")
    print("        l'avertissement Windows et les 273 Mo mangent le budget")
    print("        avant la page.")
    print("    visites de /merci/ ÷ téléchargements")
    print("        c'est la valeur d'un téléchargement. Sans elle, on ne")
    print("        peut pas savoir ce qu'un clic a le droit de coûter.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
