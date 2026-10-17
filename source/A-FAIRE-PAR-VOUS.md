# À faire par vous : la liste exacte, dans l'ordre

Tout ce qui pouvait être fait sans accès à vos comptes l'est déjà. Ce qui
suit demande **vos identifiants** (Supabase, Cloudflare, Resend, Stripe,
GitHub) ou **une décision qui vous appartient**. Chaque étape dit combien de
temps elle prend et comment vérifier qu'elle a réussi.

Convention : les commandes `npx wrangler …` se lancent depuis le dossier du
site, **chemin entre guillemets** (il contient une espace) :

```
cd "C:\Users\Elio0\Desktop\PROJET KARD\Code\prepacards-site\public"
```

Les secrets se déposent avec `npx wrangler secret put NOM` : la commande les
demande sans les afficher. **Ne collez jamais un secret dans une
conversation** ; un secret qui y passe est à renouveler.

---

## 1. Le SQL (10 min) — rien ne marche sans lui

1. Supabase → **SQL Editor** → *New query*.
2. Ouvrez `source/worker/migrations/2026-10-a-executer.sql`, copiez tout, collez, **Run**.
   Le script est rejouable : le relancer ne casse rien.
3. Vérification, dans le même éditeur :
   ```sql
   select public.email_canonique('E.leve+2@gmail.com');   -- doit rendre eleve@gmail.com
   select count(*) from public.rapports_erreurs;           -- doit rendre 0, sans erreur
   ```
4. Depuis votre poste (voir étape 6 pour la clé) :
   `python source/outils/tableau_de_bord.py` doit afficher des chiffres.

## 2. Les réglages Supabase et Cloudflare (30 min)

Voir la liste cochable dans [SECURITE.md](SECURITE.md), § 2 : confirmation
d'e-mail à l'inscription, limites de requêtes de la page de connexion, URL de
redirection, WAF Cloudflare. **La confirmation d'e-mail est la plus
importante** : sans elle, n'importe qui crée un compte avec l'adresse d'un tiers.

## 3. Les e-mails (Resend) — 20 min + DNS

Les e-mails de bienvenue, de résiliation, de l'essai et du formulaire de
contact passent tous par Resend.

1. Resend → **Domains** → ajoutez `prepacards.fr`, puis copiez dans la zone
   DNS de Cloudflare les enregistrements qu'il affiche (SPF et DKIM).
   Attendez « Verified ».
2. DMARC (à ajouter vous-même, TXT sur `_dmarc.prepacards.fr`) :
   `v=DMARC1; p=none; rua=mailto:contact@prepacards.fr`
   Commencez à `p=none` ; passez à `quarantine` après deux semaines sans anomalie.
3. Secrets du Worker :
   ```
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put COURRIEL_EXPEDITEUR      (valeur : PrépaCards <noreply@prepacards.fr>)
   npx wrangler secret put COURRIEL_REPONSE         (valeur : contact@prepacards.fr)
   npx wrangler secret put WEBHOOK_SECRET           (si ce n'est pas déjà fait)
   ```
   Facultatifs : `DESINSCRIPTION_SECRET` (sinon `WEBHOOK_SECRET` sert de clé de
   signature des liens de désinscription), `COURRIEL_CONTACT` (si le formulaire
   de contact doit arriver ailleurs que sur `COURRIEL_REPONSE`).
4. Vérifiez `contact@prepacards.fr` : la boîte doit exister et recevoir.

## 4. Activer les e-mails de l'essai (5 min, EN DERNIER)

Le code est déployé mais **dort** tant que cet interrupteur est éteint.

1. Contrôlez ce qui partirait : `python source/outils/admin.py apercu-emails`
   (n'envoie et ne réserve rien).
2. Si la liste vous convient :
   ```
   npx wrangler secret put EMAILS_ESSAI            (valeur : 1)
   ```
3. Le Worker s'exécute tous les jours à 8 h UTC. Résultat visible dans
   Cloudflare → Workers → *prepacardsss* → **Observability** (cherchez
   `emails essai`). Pour couper : valeur `0`.

Qui reçoit quoi : le rappel de fin d'essai (J+25) et le message « essai
terminé » (J+31) vont à tous les comptes confirmés non abonnés ; les conseils
(J+1, J+7) ne vont **qu'aux comptes qui ont coché la case** à l'inscription.

## 5. Surveillance (10 min)

Créez un moniteur gratuit (UptimeRobot, Better Stack…) sur
`https://prepacards.fr/api/sante` : alerte si le code n'est pas 200
(il rend 503 quand la base ne répond plus). Fréquence : 5 minutes.

## 6. Vos outils sur votre poste

Python et la bibliothèque `cryptography` (`pip install cryptography`) suffisent.

```
$env:SUPABASE_SERVICE_ROLE_KEY = "<cle service_role>"      # Supabase → Project Settings → API
python source/outils/tableau_de_bord.py                    # chiffres du jour
python source/outils/admin.py etat eleve@exemple.fr
python source/outils/admin.py prolonger eleve@exemple.fr 14
```

La variable disparaît à la fermeture de la fenêtre PowerShell : c'est voulu.

### Sauvegarde automatique (15 min)

```
$env:PREPACARDS_SAUVEGARDE_MOT_DE_PASSE = "<12 caracteres au moins, a conserver ailleurs>"
python source/outils/sauvegarde_base.py
python source/outils/sauvegarde_base.py --verifier "$HOME\PrepaCards-sauvegardes\base-….pcbak"
```

**Testez la relecture** (`--verifier`) avant de vous y fier. Le mot de passe
est introuvable s'il est perdu : notez-le dans votre gestionnaire de mots de
passe, séparé du fichier. Pour la planifier chaque nuit : *Planificateur de
tâches Windows* → créer une tâche → action `python` avec le chemin du script ;
les deux variables d'environnement se règlent dans l'onglet *Actions* ou en
variables utilisateur. Les 30 dernières sauvegardes sont conservées. Pour une
restauration à la minute près, passez en plus à Supabase Pro.

## 7. Formulaire de contact : anti-robots (10 min, facultatif mais conseillé)

Sans Turnstile, le formulaire reste protégé par un champ piège et 4 envois par
heure et par adresse IP. Pour l'activer :

1. Cloudflare → **Turnstile** → *Add widget* → domaine `prepacards.fr`.
2. `npx wrangler secret put TURNSTILE_SECRET`
3. Donnez-moi la **clé de site** (publique) : je la mets dans
   `source/templates/contact.js`, ou collez-la vous-même dans `CLE_SITE_TURNSTILE`.

## 8. Le statut juridique — **bloquant avant d'encaisser**

Vous n'avez pas encore de statut. On ne peut pas vendre sans identifier le
vendeur : mentions légales et CGV doivent nommer une personne ou une
entreprise, une adresse et un numéro d'immatriculation. Aujourd'hui, la page
CGV garde des champs `[entre crochets]` et la page mentions légales dit
« personne physique agissant à titre non professionnel » : **cela devient faux
dès le premier abonnement vendu.**

1. Créez votre micro-entreprise (guichet-entreprises.inpi.fr). Délai habituel :
   quelques jours.
2. Choisissez un médiateur de la consommation (obligatoire pour vendre à des
   particuliers) : adhésion en ligne, en général 20 à 100 € par an.
3. Copiez `source/juridique/identite.exemple.json` en `identite.json` (ignoré
   par Git) et remplissez-le.
4. ```
   python source/juridique/appliquer_identite.py --verifier
   python source/juridique/appliquer_identite.py
   ```
   Le script **refuse** d'écrire tant qu'un champ manque ou est resté à la valeur
   d'exemple. Reconstruisez ensuite le site (voir `CLAUDE.md`), relisez
   les deux pages, poussez.
5. Faites relire les CGV par un professionnel : c'est un modèle, pas un avis juridique.
6. Dans Stripe → *Paramètres → Branding* → renseignez l'adresse des CGV
   (`https://prepacards.fr/cgv/`). **Ensuite seulement** :
   ```
   npx wrangler secret put STRIPE_CGV_CONSENT      (valeur : 1)
   ```
   Cela affiche dans la page de paiement la case « j'accepte les CGV et je
   renonce à mon droit de rétractation ». Activée avant que l'adresse soit
   renseignée chez Stripe, elle ferait **échouer chaque paiement**.

## 9. Le préavis aux comptes existants

À faire quand la date de bascule est fixée (au moins 15 jours à l'avance) :

```
$env:RESEND_API_KEY = "<cle>"
$env:COURRIEL_EXPEDITEUR = "PrépaCards <noreply@prepacards.fr>"
python source/outils/envoyer_preavis.py --date-bascule 2026-11-15                    # simulation
python source/outils/envoyer_preavis.py --date-bascule 2026-11-15 --test vous@exemple.fr
python source/outils/envoyer_preavis.py --date-bascule 2026-11-15 --envoyer          # pour de bon
```

La simulation est la valeur par défaut ; `--envoyer` redemande le nombre exact
de destinataires ; une adresse déjà servie ne l'est jamais deux fois.

## 10. Search Console (10 min)

Google Search Console → ajouter la propriété **prepacards.fr** (méthode
« domaine », avec un enregistrement TXT dans Cloudflare) → *Sitemaps* →
`https://prepacards.fr/sitemap.xml`. Revenez dans une semaine : dites-moi
ce qu'il signale, je corrige.

## 11. Ce qui reste de la phase 0

| Étape | Détail |
|---|---|
| Release GitHub V1.3.1 | joindre `dist\PrepaCards-installateur.exe` ; puis dites-le moi, je lance `publier_version.py`, remets le lien et pousse `version.json` |
| Stripe en live | clé restreinte `rk_live`, 2 prix, 3 secrets, webhook ; paiement réel de 9,99 € puis remboursement |
| Test sur PC vierge | VirtualBox + Windows, ou le PC d'un ami |
| Licences (A ou B) | voir `LICENCES-ANALYSE.md` dans le dépôt de l'application |
