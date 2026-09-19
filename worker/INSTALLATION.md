# Mettre en service la base des comptes

Tout le code est écrit et éprouvé. Il reste quatre gestes à faire dans vos
comptes Cloudflare et Stripe — je ne peux pas les faire à votre place, et je
ne dois jamais voir les secrets qu'ils produisent.

Tant que ces gestes ne sont pas faits, le service **n'est pas branché** :
`static/wrangler.jsonc` ne contient ni `main` ni `d1_databases`. C'est
volontaire. Un identifiant de base invalide fait échouer `wrangler deploy`,
et plus rien ne se met en ligne — y compris la publication automatique des
articles du blog.

---

## 1. Créer la base

```
npx wrangler d1 create prepacards
```

La commande affiche un `database_id`. Notez-le : c'est la seule valeur de
cette procédure qui n'est pas un secret, vous pouvez me la donner.

## 2. Créer les tables

```
npx wrangler d1 execute prepacards --remote --file=worker/schema.sql
```

## 3. Déposer le secret du webhook Stripe

Dans Stripe : **Développeurs → Webhooks → Ajouter un point de terminaison**.

- Adresse : `https://prepacards.fr/api/stripe`
- Événements : `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`

Stripe affiche alors une **clé de signature** (`whsec_…`). Déposez-la
directement dans Cloudflare :

```
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

La commande la demande sans l'afficher. **Ne me l'envoyez pas, ne la mettez
pas dans le dépôt.** Qui la détient peut fabriquer de faux événements de
paiement et s'offrir un abonnement à vie.

## 4. Brancher le service

Donnez-moi le `database_id` de l'étape 1. Je recopie dans
`static/wrangler.jsonc` le contenu de `wrangler-comptes.jsonc`, et le
service part au déploiement suivant.

---

## Vérifier que ça marche

```
curl -s -X POST https://prepacards.fr/api/inscription \
  -H "content-type: application/json" \
  -d '{"email":"essai@exemple.fr","mot_de_passe":"motdepasse1"}'
```

Doit répondre un `jeton`. Puis, dans Stripe, **Webhooks → Envoyer un
événement de test** : le tableau de bord doit afficher une réponse 200.

## Ce que la base contient

Une adresse e-mail, une empreinte de mot de passe, l'état de l'abonnement,
et — si l'utilisateur le demande — une sauvegarde **chiffrée sur sa
machine** que le serveur ne peut pas ouvrir.

Aucune carte lisible. C'est ce qui permet de continuer à dire que les cartes
ne sortent pas de l'ordinateur ; en revanche la phrase « aucun serveur » de
la page de confidentialité devra être réécrite le jour de l'activation.
