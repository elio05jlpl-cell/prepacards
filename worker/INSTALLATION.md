# Mettre en service la base des comptes

**Le service est en ligne depuis le 20 septembre 2026.** Il reste un seul
geste, le seul qui produise un secret : le webhook Stripe.

---

## Ce qui est fait

1. **Base D1 créée** — `prepacards`, région **WEUR** (Union européenne,
   comme l'annonce la page de confidentialité).
   Identifiant : `b7a894a6-0c11-46b0-97b1-40ae5f066dbc`. Ce n'est pas un
   secret : il n'ouvre rien sans les droits du compte Cloudflare.
2. **Tables créées** — `comptes`, `sessions`, `sauvegardes`,
   `evenements_stripe`.
3. **Worker branché** — `static/wrangler.jsonc` porte désormais `main` et
   `d1_databases`.

Éprouvé contre la vraie base, pas seulement en local : inscription,
reconnexion, mot de passe faux refusé, doublon refusé, jeton révoqué,
sauvegarde de 120 ko rendue octet pour octet, événement Stripe non signé
refusé. Les comptes d'essai ont été effacés.

---

## Ce qui reste : le webhook Stripe

Sans lui, un paiement ne débloque rien : le service n'apprend jamais que la
personne a payé.

Dans Stripe : **Développeurs → Webhooks → Ajouter un point de terminaison**.

- Adresse : `https://prepacards.fr/api/stripe`
- Événements : `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`

Stripe affiche alors une **clé de signature** (`whsec_…`). Déposez-la
directement dans Cloudflare, depuis ce dossier :

```
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

La commande la demande sans l'afficher. **Ne me l'envoyez pas, ne la mettez
pas dans le dépôt.** Qui la détient peut fabriquer de faux événements de
paiement et s'offrir un abonnement à vie.

En attendant, le service **échoue fermé** : faute de secret,
`signatureStripeValide` refuse tout événement au lieu de l'accepter sans
vérifier. Personne ne peut s'offrir un abonnement en forgeant une requête.

### Vérifier

Dans Stripe, **Webhooks → Envoyer un événement de test** : le tableau de
bord doit afficher une réponse **200**. Puis payez une fois pour de bon avec
votre propre carte, et regardez si le compte passe abonné — un test signé ne
prouve pas que Stripe envoie les champs attendus.

---

## Deux pièges rencontrés, à ne pas réintroduire

**Cloudflare plafonne PBKDF2 à 100 000 itérations par appel.** Au-delà :
`NotSupportedError`. Le hachage enchaîne donc deux tours de 100 000. Piège :
ce plafond n'existe **que sur le vrai réseau** — `wrangler dev --local`
passe par le crypto de Node et accepte 200 000 sans broncher. Un essai en
local ne prouve rien ici ; il faut `--remote`.

**D1 ne rend pas les colonnes BLOB exploitables.** La sauvegarde revenait
vide, sans erreur. Elle est rangée en base64 avec une empreinte SHA-256
vérifiée à la reprise.

## Ce que la base contient

Une adresse e-mail, une empreinte de mot de passe, l'état de l'abonnement,
et — si l'utilisateur le demande — une sauvegarde **chiffrée sur sa
machine** que le serveur ne peut pas ouvrir.

Aucune carte lisible. C'est ce qui permet de continuer à dire que les cartes
ne sortent pas de l'ordinateur.
