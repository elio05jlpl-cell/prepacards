# Mettre en service la base des comptes (Supabase)

Le service est passé de D1 + authentification maison à **Supabase**
(Auth + Postgres) : l'inscription, la connexion, la connexion Google, la
réinitialisation du mot de passe et la sauvegarde chiffrée parlent
désormais directement à Supabase depuis le navigateur (et depuis
l'application), protégées par les règles RLS de `schema.sql`. Il ne reste
dans ce Worker que ce qu'un secret protège : le webhook Stripe, et la
suppression d'un compte (qui exige la clé `service_role`, la seule
capable de retirer une ligne `auth.users`).

Cinq étapes ; les étapes 4 et 5 déposent des secrets avec `wrangler`.

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
4. Dans **Supabase → Authentication → Providers**, activez **Allow manual
   linking** (parfois affiché comme un réglage global des providers plutôt
   que propre à Google). Sans lui, le bouton « Associer Google » de la page
   `/compte/` — proposé à qui s'est inscrit par mot de passe et veut
   ajouter Google ensuite — échoue avec « Manual linking is disabled ».

### Vérifier

Depuis `/compte/`, une fois connecté : le bandeau change et affiche « Mon
compte » sur n'importe quelle page du site, pas seulement sur celle-ci.
Dans la section « Mot de passe et connexion » : associer/dissocier Google
et changer le mot de passe fonctionnent sans recharger la page. La
suppression de compte (section « Zone dangereuse ») demande une
confirmation puis déconnecte — vérifiez qu'un compte de test disparaît
bien de **Authentication → Users** après coup.

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

### Mise en forme des e-mails

Par défaut, Supabase envoie ces e-mails avec son propre gabarit, sans le
style ni le ton de PrépaCards. Dans **Authentication → Emails → Templates**,
remplacez le contenu de deux gabarits (sujet **et** corps HTML) :

- **Confirm signup** ← `courriels/confirmation-inscription.html`
- **Reset Password** ← `courriels/reinitialisation-mot-de-passe.html`

Chaque fichier commence par un commentaire donnant le sujet à coller et la
variable Supabase utilisée. Ne touchez à rien d'autre (Magic Link, Invite
User, Change Email Address) : ces flux ne sont pas utilisés ici.

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

## 5. Bienvenue et résiliation par e-mail

Deux e-mails supplémentaires, envoyés directement par ce Worker (pas par
Supabase) : un mot de bienvenue à la confirmation du compte, et une
confirmation quand un abonnement prend réellement fin. Le détail de leur
contenu est dans `courriel.js` ; cette étape ne fait que les brancher.

### a. Si `schema.sql` a déjà été exécuté avant cette mise à jour

Les nouvelles colonnes et le nouveau déclencheur ne sont pas dans une base
déjà en place — `schema.sql` ne se rejoue pas (voir étape 1). Collez et
exécutez ceci une fois, dans **SQL Editor** :

```sql
alter table public.profiles add column confirme_le timestamptz;
alter table public.profiles add column accueil_envoye boolean not null default false;

create function public.gerer_confirmation_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.profiles set confirme_le = new.email_confirmed_at where id = new.id;
    return new;
end;
$$;

create trigger apres_confirmation
    after update on auth.users
    for each row
    when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
    execute function public.gerer_confirmation_email();
```

Les comptes déjà confirmés avant ce jour n'ont pas de `confirme_le` et ne
recevront donc pas de bienvenue rétroactive — c'est volontaire, pour ne
pas surprendre les utilisateurs existants.

### b. Déposer les secrets d'envoi

```
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put COURRIEL_EXPEDITEUR
npx wrangler secret put COURRIEL_REPONSE
npx wrangler secret put WEBHOOK_SECRET
```

- `RESEND_API_KEY` : la même clé Resend que celle collée en SMTP à l'étape
  3 (Resend l'accepte pour les deux usages).
- `COURRIEL_EXPEDITEUR` : `PrépaCards <noreply@prepacards.fr>`
- `COURRIEL_REPONSE` : `contact@prepacards.fr` — sans elle, une réponse à
  un e-mail parti de `noreply@` se perd.
- `WEBHOOK_SECRET` : une valeur inventée par vous (par ex.
  `openssl rand -hex 32` dans un terminal), à recopier telle quelle à
  l'étape suivante. Sans elle, n'importe qui connaissant l'adresse de la
  route pourrait déclencher un envoi de bienvenue à volonté.

Tant que `RESEND_API_KEY` ou `COURRIEL_EXPEDITEUR` manquent, `disponible()`
rend faux : les deux e-mails sont silencieusement ignorés (journalisés,
pas bloquants) plutôt que de faire échouer tout le webhook qui les
déclenche.

### c. Créer le Database Webhook (bienvenue)

Dans **Supabase → Database → Webhooks → Create a new hook** :

- Table : `public.profiles`
- Events : **Insert** et **Update**
- Type : **HTTP Request**, méthode **POST**
- URL : `https://prepacards.fr/api/webhooks/profil`
- HTTP Headers : ajoutez `x-webhook-secret` avec la **même valeur** que
  `WEBHOOK_SECRET` déposée juste avant.

La résiliation n'a rien de plus à configurer : elle s'appuie sur le
webhook Stripe déjà en place à l'étape 4.

### Vérifier

Créez un compte de test par mot de passe, confirmez-le depuis le lien
reçu : l'e-mail de bienvenue doit arriver dans la minute. Rejouez la
livraison depuis **Database → Webhooks → (le hook) → Logs** : la deuxième
livraison ne doit **pas** renvoyer un second e-mail (`deja_envoye: true`
dans la réponse). Pour la résiliation, résiliez l'abonnement de test et
attendez la fin de la période réglée (ou testez directement avec
**Webhooks → Envoyer un événement de test** sur `customer.subscription.deleted`
côté Stripe).

---

## Ce que la base contient

Une entrée `auth.users` (gérée par Supabase, jamais lue directement par ce
Worker), un profil (référence, état d'abonnement), et — si l'utilisateur
le demande — une sauvegarde **chiffrée sur sa machine** que le serveur ne
peut pas ouvrir.

Aucune carte lisible, aucun mot de passe vu par ce code : Supabase s'en
charge, avec sa propre sécurité.
