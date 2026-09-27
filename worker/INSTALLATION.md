# Mettre en service la base des comptes (Supabase)

Le service est passé de D1 + authentification maison à **Supabase**
(Auth + Postgres) : l'inscription, la connexion, la connexion Google, la
réinitialisation du mot de passe et la sauvegarde chiffrée parlent
désormais directement à Supabase depuis le navigateur (et depuis
l'application), protégées par les règles RLS de `schema.sql`. Il ne reste
dans ce Worker que ce qu'un secret protège : le webhook Stripe.

Quatre étapes, une seule produit un secret à déposer avec `wrangler`.

---

## 1. Créer les tables

Dans le tableau de bord Supabase du projet : **SQL Editor → New query**,
coller le contenu de `schema.sql`, **Run**. Il crée `public.profiles`,
`public.sauvegardes`, `public.evenements_stripe`, leurs règles RLS, et les
deux fonctions appelées par le webhook Stripe.

À exécuter une seule fois. Le réexécuter sur une base déjà en place
échouera sur les tables déjà créées — sans rien endommager.

---

## 2. Connexion Google

Le Client ID et le Client Secret Google existants (déjà utilisés par
l'ancien service) sont réutilisés tels quels : Google n'a pas besoin d'en
savoir plus qu'avant, seule l'adresse de retour change.

1. Dans **Google Cloud Console** (le même projet qu'avant) → identifiants
   OAuth → ajouter aux **URI de redirection autorisés** :
   ```
   https://ojnntqfafinxrousdvbn.supabase.co/auth/v1/callback
   ```
2. Dans **Supabase → Authentication → Providers → Google** : activer, coller
   le même Client ID et le même Client Secret.
3. Dans **Supabase → Authentication → URL Configuration → Redirect URLs**,
   ajouter :
   ```
   https://prepacards.fr/compte/
   https://prepacards.fr/mot-de-passe/
   ```

---

## 3. E-mails (mot de passe oublié)

Supabase peut envoyer ces e-mails lui-même, mais son expéditeur par défaut
est limité et non fiable pour un vrai service. On lui fait utiliser Resend,
déjà en place pour ce domaine (SPF et DKIM déjà posés lors du service D1).

Dans **Supabase → Project Settings → Authentication → SMTP Settings** :

- Hôte : `smtp.resend.com`
- Port : `465`
- Utilisateur : `resend`
- Mot de passe : la clé API Resend existante (`RESEND_API_KEY`)
- Expéditeur : `PrépaCards <noreply@prepacards.fr>`

Et dans **Authentication → Policies** : longueur minimale du mot de passe
à **8** (pour rester cohérent avec ce que l'application a toujours exigé).

### Vérifier

Demander une réinitialisation depuis `/compte/`, tester sur **Gmail et
Outlook**.

---

## 4. Le webhook Stripe

Sans lui, un paiement ne débloque rien.

Dans Stripe : **Développeurs → Webhooks → Ajouter un point de terminaison**.

- Adresse : `https://prepacards.fr/api/stripe`
- Événements : `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`

Stripe affiche alors une **clé de signature** (`whsec_…`) :

```
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Puis la clé `service_role` du projet Supabase (**Project Settings → API**),
qui permet au Worker d'écrire l'abonnement en contournant RLS :

```
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Les deux commandes demandent la valeur sans l'afficher. **Ne me les
envoyez pas, ne les mettez pas dans le dépôt.** Qui détient l'une ou
l'autre peut s'offrir un abonnement à vie ou lire/modifier n'importe quel
compte.

En attendant, le service **échoue fermé** : faute de secret,
`signatureStripeValide` refuse tout événement au lieu de l'accepter sans
vérifier.

### Vérifier

Dans Stripe, **Webhooks → Envoyer un événement de test** : réponse
**200** attendue. Puis payer une fois pour de bon et regarder si le
compte passe abonné.

---

## Ce que la base contient

Une entrée `auth.users` (gérée par Supabase, jamais lue directement par ce
Worker), un profil (référence, état d'abonnement), et — si l'utilisateur
le demande — une sauvegarde **chiffrée sur sa machine** que le serveur ne
peut pas ouvrir.

Aucune carte lisible, aucun mot de passe vu par ce code : Supabase s'en
charge, avec sa propre sécurité.
