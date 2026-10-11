# Sécurité de prepacards.fr

Ce document dit **ce qui est protégé, où, et ce qui reste à régler dans un
tableau de bord** (le code ne peut pas le faire à votre place).

## 1. Ce que le dépôt garantit (vérifié par les tests)

| Point | Où | Comment |
|---|---|---|
| Aucun secret dans le dépôt | `.gitignore` | `.env`, `.env.*`, `.dev.vars`, `*.pem`, `*.key` ignorés. Les secrets du Worker se déposent par `npx wrangler secret put NOM`. |
| Clé publique côté navigateur, jamais la clé secrète | `templates/*.js` | Seule la clé `anon` (publique par conception, limitée par RLS) y figure. La `service_role`, la clé Stripe et la clé Anthropic ne vivent que dans le Worker. |
| RLS sur toute la base | `worker/schema.sql` | `enable row level security` sur `profiles`, `sauvegardes`, `evenements_stripe`, `usages_scan`, `liste_attente`. Aucune policy d'écriture sur `profiles` : l'utilisateur ne peut pas se donner un abonnement ni prolonger son essai. |
| Droits vérifiés côté serveur | `worker/index.js`, `scan.js`, `prepa.js` | L'identité vient du jeton, vérifié par Supabase à chaque appel. L'abonnement est relu en base par le Worker, jamais cru sur parole. |
| Mots de passe hachés | Supabase Auth | bcrypt, jamais lisibles ni stockés par le site. |
| Un seul message de connexion | `templates/compte.js` | « Adresse ou mot de passe incorrect », que l'adresse existe ou non. |
| Entrées validées avant la base | `worker/*.js` | Liste blanche (filière, plateformes, UAI), longueurs bornées, adresse e-mail validée, JSON illisible refusé. |
| Taille et type des fichiers | `worker/index.js`, `scan.js` | Corps limité à 32 Ko (9 Mo pour une photo) ; JPEG, PNG, WebP seulement ; refus **avant** l'appel au modèle. |
| Quotas | `worker/index.js` | Par adresse IP et par route (scan, paiement, préparation, suppression de compte). |
| Webhooks signés | `worker/securite.js` | Stripe : HMAC-SHA256, horodatage de moins de 5 min, comparaison à durée constante, plusieurs signatures acceptées. Supabase : secret partagé comparé à durée constante, refus s'il n'est pas configuré. |
| Erreurs sobres en production | `worker/index.js` | Le détail part dans les journaux (`console.error`), la réponse dit « Erreur interne ». Aucun `console.log` dans les pages. |
| CORS fermé | Worker | Aucun en-tête `Access-Control-Allow-Origin` sur l'API : seul le site lui-même peut l'appeler depuis un navigateur. |
| HTTPS partout | `static/_headers` | `Strict-Transport-Security` 1 an, `upgrade-insecure-requests` dans la CSP. |
| En-têtes de protection | `static/_headers` | CSP (sources autorisées : le site et Supabase), `nosniff`, `X-Frame-Options`, `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`. |
| Sessions | `templates/compte.js` | Par défaut en `sessionStorage` (disparaît à la fermeture) ; `localStorage` seulement si la personne coche « rester connecté ». |

Lancer les tests : `node worker/_test_garde.mjs` (et `_test_paiement`,
`_test_existence`, `_test_attente`).

## 2. À régler dans les tableaux de bord

Rien de ceci n'est réglable depuis le dépôt. Cochez au fur et à mesure.

### Supabase (Authentication, puis Project Settings)

- [ ] **Authentication → Providers → Email → « Confirm email » activé.** C'est
      la confirmation par e-mail à l'inscription. Sans cela, n'importe qui peut
      créer un compte avec l'adresse d'un tiers.
- [ ] **Authentication → Sessions** : durée maximale de session (« Time-box »)
      et inactivité (« Inactivity timeout ») — réservés au plan Pro. Sans eux,
      le jeton d'accès expire en 1 h (réglage « JWT expiry », ne pas dépasser
      3600 s) et se renouvelle tant que la session dure.
- [ ] **Authentication → Rate Limits** : laisser les plafonds par défaut ou les
      baisser (envois d'e-mails, tentatives de connexion, vérifications).
      C'est le vrai rate limiting de la page de connexion : elle parle
      directement à Supabase.
- [ ] **Authentication → Sign In / Providers → Password** : longueur minimale 8
      (ou 10), et **« Prevent use of leaked passwords »** (plan Pro).
- [ ] **Authentication → URL Configuration** : « Site URL » = `https://prepacards.fr`,
      et dans « Redirect URLs » *uniquement* les adresses de prepacards.fr.
- [ ] **Database → Backups** : sauvegardes quotidiennes (plan Pro), idéalement
      avec Point-in-Time Recovery. Le plan gratuit n'en fait pas. À défaut,
      `pg_dump` régulier vers un stockage privé **chiffré** (jamais un
      artefact d'Actions GitHub sur un dépôt public : il serait téléchargeable).
- [ ] **Database → Webhooks** : l'en-tête `x-webhook-secret` est renseigné et
      identique à `WEBHOOK_SECRET` du Worker.
- [ ] **Advisors → Security** : lancer l'analyse, il signale toute table sans RLS.

### Cloudflare

- [ ] **Security → WAF → Rate limiting rules** : une règle sur
      `/api/compte/existe` (par exemple 10 requêtes / minute / IP) et une
      sur `/api/*` (par exemple 60 / minute / IP). Le quota du Worker vit en
      mémoire d'une instance ; celui-ci est global.
- [ ] **SSL/TLS → Edge Certificates** : « Always Use HTTPS » activé, mode
      « Full (strict) ». L'en-tête HSTS est déjà envoyé par `_headers`.
- [ ] **Workers → prepacardsss → Settings → Variables** : seuls
      `SUPABASE_URL` (public) en clair ; les secrets en « Secret » :
      `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `STRIPE_SECRET_KEY`, `STRIPE_PRIX_MENSUEL`, `STRIPE_PRIX_ANNUEL`,
      `ANTHROPIC_API_KEY`, `WEBHOOK_SECRET`.

### Stripe

- [ ] Clé **restreinte** (`rk_live_…`) limitée à Checkout Sessions (écriture) et
      Prices (lecture), pas la clé secrète complète.
- [ ] Webhook live : événements `checkout.session.completed` et
      `customer.subscription.*` seulement ; son `whsec_` déposé dans
      `STRIPE_WEBHOOK_SECRET`.

### GitHub (Settings → Code security)

- [ ] **Secret scanning** et **Push protection** activés : GitHub bloque un
      push qui contient une clé.
- [ ] **Dependabot alerts** activés. `.github/dependabot.yml` tient à jour les
      actions des workflows.

## 3. Rotation et incident

Une clé a transité par une conversation, un mail ou une capture : la
considérer compromise et la renouveler (Stripe → « Roll key », Supabase →
« Reset JWT secret » ou régénérer la `service_role`, Anthropic → révoquer),
puis la redéposer par `wrangler secret put`. Voir `CLAUDE.md`, § Secrets.

## 4. Choix assumé : la page de connexion devine l'existence d'un compte

`POST /api/compte/existe` répond si une adresse a un compte, pour que la page
sache s'il faut demander un mot de passe ou en faire choisir un. Cela permet
en théorie de tester si une adresse est inscrite. Bornes en place : origine
du site exigée, 20 requêtes / 10 min / IP, réponse à trois booléens. Si ce
risque n'est pas acceptable, supprimer la route et revenir à un écran unique
« e-mail + mot de passe » : c'est le seul endroit où le site renonce à
« un seul message pour l'e-mail et le mot de passe ».
