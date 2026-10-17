"""
Verification des outils d'exploitation (sans reseau, sans cle)

    python source/outils/_test_outils.py
"""

import datetime
import gzip
import io
import json
import os
import sys
import tempfile
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import _commun as c
import envoyer_preavis as ep
import sauvegarde_base as sb
import tableau_de_bord as td

echecs = 0


def verifier(condition, message):
    global echecs
    print(f"  {'OK  ' if condition else 'ECHEC'} {message}")
    if not condition:
        echecs += 1


print("--- Configuration ---")
with mock.patch.dict(os.environ, {"SUPABASE_SERVICE_ROLE_KEY": ""}):
    try:
        c.configuration()
        verifier(False, "sans cle : doit refuser")
    except c.OutilErreur as e:
        verifier("SUPABASE_SERVICE_ROLE_KEY" in str(e), "sans cle : message clair")
        verifier("jamais dans une conversation" in str(e) or "jamais" in str(e), "rappelle de ne pas la coller")
with mock.patch.dict(os.environ, {"SUPABASE_SERVICE_ROLE_KEY": "k", "SUPABASE_URL": "http://pas-https"}):
    try:
        c.configuration()
        verifier(False, "http : doit refuser")
    except c.OutilErreur:
        verifier(True, "une URL qui n'est pas en https est refusee")

print("\n--- Chiffrement ---")
brut = gzip.compress(b'{"x": 1}')
mdp = "un mot de passe assez long"
fichier = sb.chiffrer(brut, mdp)
verifier(fichier.startswith(sb.ENTETE) and brut not in fichier, "le contenu n'apparait pas en clair")
verifier(sb.dechiffrer(fichier, mdp) == brut, "aller-retour exact")
verifier(sb.chiffrer(brut, mdp) != fichier, "deux chiffrements du meme contenu different (sel aleatoire)")
try:
    sb.dechiffrer(fichier, "mauvais mot de passe")
    verifier(False, "mauvais mot de passe : doit refuser")
except c.OutilErreur as e:
    verifier("incorrect" in str(e), "mauvais mot de passe refuse")
alteree = bytearray(fichier)
alteree[-5] ^= 0xFF
try:
    sb.dechiffrer(bytes(alteree), mdp)
    verifier(False, "fichier altere : doit refuser")
except c.OutilErreur:
    verifier(True, "un fichier altere est detecte")
try:
    sb.dechiffrer(b"n'importe quoi", mdp)
    verifier(False, "pas une sauvegarde : doit refuser")
except c.OutilErreur as e:
    verifier("pas une sauvegarde" in str(e), "un autre fichier est reconnu comme tel")
with mock.patch.dict(os.environ, {"PREPACARDS_SAUVEGARDE_MOT_DE_PASSE": "court"}):
    try:
        sb.mot_de_passe_chiffrement(confirmer=True)
        verifier(False, "mot de passe court : doit refuser")
    except c.OutilErreur:
        verifier(True, "mot de passe de moins de 12 caracteres refuse")

print("\n--- Lecture paginee ---")
appels = []


def faux_appeler(chemin, *a, **k):
    appels.append(chemin)
    if "/auth/v1/admin/users" in chemin:
        page = int(chemin.split("page=")[1].split("&")[0])
        n = sb.PAGE if page == 1 else 3
        return {"users": [{"id": f"u{page}-{i}", "email": f"a{i}@x.fr",
                           "email_confirmed_at": "2026-01-01"} for i in range(n)]}
    depart = int(chemin.split("offset=")[1])
    n = sb.PAGE if depart == 0 else 7
    return [{"id": depart + i} for i in range(n)]


lignes = sb.lire_table("profiles", "id", faux_appeler)
verifier(len(lignes) == sb.PAGE + 7, f"deux pages lues ({len(lignes)} lignes)")
verifier(all("order=id" in a for a in appels), "ordre stable demande a chaque page")
comptes = sb.lire_comptes(faux_appeler)
verifier(len(comptes) == sb.PAGE + 3, f"comptes lus sur deux pages ({len(comptes)})")
verifier(all("password" not in json.dumps(u).lower() for u in comptes), "aucun mot de passe dans les comptes")
with redirect_stdout(io.StringIO()):
    contenu = json.loads(gzip.decompress(sb.exporter_json(faux_appeler)))
verifier(set(contenu["tables"]) == set(sb.TABLES), "toutes les tables sont exportees")

print("\n--- Rotation ---")
with tempfile.TemporaryDirectory() as d:
    dossier = Path(d)
    for i in range(6):
        (dossier / f"base-2026010{i}-000000.pcbak").write_bytes(b"x")
        (dossier / f"base-2026010{i}-000000-pgdump.pcbak").write_bytes(b"x")
    retires = sb.faire_tourner(dossier, 3)
    restants = sorted(p.name for p in dossier.iterdir())
    verifier(len(restants) == 6, f"3 JSON + 3 natifs conserves ({len(restants)})")
    verifier(len(retires) == 6, "les plus anciens de chaque genre sont retires")
    verifier("base-20260105-000000.pcbak" in restants and "base-20260100-000000.pcbak" not in restants,
             "ce sont les plus recents qui restent")

print("\n--- Tableau de bord ---")
exemple = {"genere_le": "2026-10-17T08:00:00Z", "comptes": 120, "confirmes": 100,
           "inscrits_7j": 12, "inscrits_30j": 40, "en_essai": 30,
           "essai_termine_sans_abonnement": 60, "abonnes_actifs": 10,
           "abonnes_mensuels": 8, "abonnes_annuels": 2, "revenu_mensuel_estime_eur": 95.9,
           "resilies": 3, "conversion_pct": 14.3, "avec_sauvegarde": 20, "ont_scanne": 15,
           "consentement_conseils": 40, "emails_envoyes_par_type": {"essai_j25": 9},
           "prepas_principales": [{"prepa": "Lycée X", "filiere": "ECG", "comptes": 5}],
           "rapports_erreurs_7j_par_version": {"1.3.1": 2}, "liste_attente": {"mac": 30}}
sortie = io.StringIO()
with redirect_stdout(sortie):
    td.afficher(exemple)
texte = sortie.getvalue()
verifier("95.9 €" in texte and "14.3 %" in texte, "revenu et conversion affiches")
verifier("mac : 30" in texte and "Lycée X" in texte, "liste d'attente et prepas affichees")
vide = dict(exemple, conversion_pct=None, prepas_principales=[], liste_attente={},
            rapports_erreurs_7j_par_version={}, emails_envoyes_par_type={})
with redirect_stdout(io.StringIO()):
    td.afficher(vide)
verifier(True, "un tableau de bord vide ne plante pas")

print("\n--- Preavis ---")
jour = datetime.date(2026, 11, 15)
sujet, texte, html = ep.message(jour)
verifier("15 novembre 2026" in sujet and "15 novembre 2026" in texte, "la date de bascule est ecrite")
verifier("30 jours" in texte and "sans carte bancaire" in texte, "l'essai de 30 jours sans carte est annonce")
verifier("9,99" in texte and "95,90" in texte, "les deux prix figurent")
verifier("supprimer votre compte" in texte, "dit comment supprimer son compte")
verifier("{" not in texte + html and "None" not in texte + html, "aucune valeur qui fuit")
verifier(ep.date_fr(datetime.date(2026, 12, 1)) == "1er décembre 2026", "1er du mois")
profils = [{"id": "a", "statut": "", "valide_jusqu_au": None},
           {"id": "b", "statut": "active", "valide_jusqu_au": "2099-01-01T00:00:00Z"},
           {"id": "c", "statut": "canceled", "valide_jusqu_au": "2020-01-01T00:00:00Z"}]
users = [{"id": "a", "email": "A@x.fr", "email_confirmed_at": "2026-01-01"},
         {"id": "b", "email": "b@x.fr", "email_confirmed_at": "2026-01-01"},
         {"id": "c", "email": "c@x.fr", "email_confirmed_at": "2026-01-01"},
         {"id": "d", "email": "d@x.fr", "email_confirmed_at": None},
         {"id": "e", "email": None, "email_confirmed_at": "2026-01-01"}]
with mock.patch.object(ep, "lire_table", return_value=profils), \
        mock.patch.object(ep, "lire_comptes", return_value=users):
    liste = ep.destinataires()
verifier(liste == ["a@x.fr", "c@x.fr"], f"destinataires : confirmes, non abonnes, sans doublon ({liste})")

print("\n--- Preavis : simulation et garde-fous ---")
envois = []
with tempfile.TemporaryDirectory() as d, \
        mock.patch.object(ep, "SUIVI", Path(d) / "suivi.txt"), \
        mock.patch.object(ep, "destinataires", return_value=["a@x.fr", "b@x.fr"]), \
        mock.patch.object(ep, "envoyer", side_effect=lambda *a: envois.append(a[0])), \
        mock.patch.object(ep.time, "sleep"):
    with redirect_stdout(io.StringIO()) as s, \
            mock.patch.object(sys, "argv", ["x", "--date-bascule", "2099-01-01"]):
        ep.principal()
    verifier(envois == [] and "SIMULATION" in s.getvalue(), "par defaut : simulation, rien n'est envoye")
    with redirect_stdout(io.StringIO()), mock.patch("builtins.input", return_value="5"), \
            mock.patch.object(sys, "argv", ["x", "--date-bascule", "2099-01-01", "--envoyer"]):
        code = ep.principal()
    verifier(code == 1 and envois == [], "mauvais nombre de confirmation : abandon")
    with redirect_stdout(io.StringIO()), mock.patch("builtins.input", return_value="2"), \
            mock.patch.object(sys, "argv", ["x", "--date-bascule", "2099-01-01", "--envoyer"]):
        ep.principal()
    verifier(envois == ["a@x.fr", "b@x.fr"], "confirmation exacte : envoi a tous")
    envois.clear()
    with redirect_stdout(io.StringIO()), mock.patch("builtins.input", return_value="0"), \
            mock.patch.object(sys, "argv", ["x", "--date-bascule", "2099-01-01", "--envoyer"]):
        ep.principal()
    verifier(envois == [], "relance : personne n'est servi deux fois")
    with redirect_stdout(io.StringIO()), \
            mock.patch.object(sys, "argv", ["x", "--date-bascule", "2099-01-01", "--test", "moi@x.fr"]):
        ep.principal()
    verifier(envois == ["moi@x.fr"], "--test : une seule adresse")
    try:
        with mock.patch.object(sys, "argv", ["x", "--date-bascule", "2020-01-01", "--envoyer"]):
            ep.principal()
        verifier(False, "date passee : doit refuser")
    except c.OutilErreur:
        verifier(True, "date de bascule passee : refus")

print("\n" + "=" * 56)
if echecs:
    print(f"{echecs} ECHEC(S).")
    sys.exit(1)
print("Tous les controles passent.")
