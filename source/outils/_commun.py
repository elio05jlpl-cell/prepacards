"""
Briques communes des outils d'exploitation
===========================================

Ces scripts tournent SUR VOTRE POSTE, jamais sur le site. Ils parlent a
Supabase avec la cle `service_role`, qui contourne toutes les regles RLS : elle
est donc lue UNIQUEMENT dans l'environnement, jamais dans un fichier du depot,
jamais en argument de ligne de commande (qui reste dans l'historique du
terminal).

    PowerShell :   $env:SUPABASE_SERVICE_ROLE_KEY = Read-Host "cle" -AsSecureString ...
    ou, plus simple pour une session :
                   $env:SUPABASE_SERVICE_ROLE_KEY = "<coller la cle>"
    (la variable disparait a la fermeture de la fenetre ; ne pas la definir
    de facon permanente sur un poste partage)

La cle se trouve dans Supabase : Project Settings -> API -> service_role.
Ne la collez JAMAIS dans une conversation.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

URL_PAR_DEFAUT = "https://ojnntqfafinxrousdvbn.supabase.co"
AGENT = "PrepaCards-outils/1.0"


class OutilErreur(Exception):
    """Message destine a la personne qui lance l'outil."""


def configuration() -> tuple:
    cle = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not cle:
        raise OutilErreur(
            "La variable d'environnement SUPABASE_SERVICE_ROLE_KEY est absente.\n"
            "PowerShell :  $env:SUPABASE_SERVICE_ROLE_KEY = \"<cle service_role>\"\n"
            "(Supabase -> Project Settings -> API. Ne la collez jamais dans une conversation.)")
    url = os.environ.get("SUPABASE_URL", URL_PAR_DEFAUT).rstrip("/")
    if not url.startswith("https://"):
        raise OutilErreur("SUPABASE_URL doit commencer par https://")
    return url, cle


def appeler(chemin: str, corps=None, methode: str | None = None,
            entetes: dict | None = None, delai: int = 60):
    """Appelle l'API Supabase. Rend le JSON decode (ou None si vide)."""
    url, cle = configuration()
    donnees = json.dumps(corps).encode("utf-8") if corps is not None else None
    requete = urllib.request.Request(
        url + chemin, data=donnees,
        method=methode or ("POST" if corps is not None else "GET"))
    requete.add_header("apikey", cle)
    requete.add_header("Authorization", f"Bearer {cle}")
    requete.add_header("Content-Type", "application/json")
    requete.add_header("User-Agent", AGENT)
    for k, v in (entetes or {}).items():
        requete.add_header(k, v)
    try:
        with urllib.request.urlopen(requete, timeout=delai) as r:
            brut = r.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        raise OutilErreur(f"Supabase a refuse ({e.code}) : {detail}") from e
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise OutilErreur(f"Supabase est injoignable : {e}") from e
    return json.loads(brut.decode("utf-8")) if brut else None


def rpc(nom: str, arguments: dict | None = None):
    return appeler(f"/rest/v1/rpc/{nom}", arguments or {})


def executer(principal) -> int:
    """Lance principal() en transformant OutilErreur en message propre."""
    try:
        return principal() or 0
    except OutilErreur as e:
        print(f"\nErreur : {e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nInterrompu.", file=sys.stderr)
        return 130
