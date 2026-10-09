---
title: Cookies et stockage local — PrépaCards
description: Ce que prepacards.fr dépose dans votre navigateur : aucun cookie, une session de connexion qui s'efface à la fermeture, une mesure d'audience sans traceur.
slug: cookies
---

# Cookies et stockage local

<p class="chapeau">Ce site dépose un seul cookie : celui qui retient votre choix
sur les cookies. Les préférences et la mesure d'audience, facultatives, ne
s'activent que si vous les acceptez. Cette page détaille ce qui est stocké,
pourquoi, et comment changer d'avis à tout moment.</p>

<p><button type="button" class="bouton" data-pc-cookies>Gérer mes choix</button></p>

## En bref

<div class="tableau-enveloppe" markdown="1">

| Élément | Type | Quand | Durée | Pourquoi | Consentement |
|---|---|---|---|---|---|
| `pc_consent` | Cookie | Dès que vous faites un choix | 6 mois | Retenir votre choix, pour ne pas le redemander à chaque page | Non, nécessaire |
| Session de connexion (`sb-…-auth-token`) | Stockage de session | Seulement si vous vous connectez | Jusqu'à la fermeture de l'onglet | Vous reconnaître d'une page à l'autre | Non, nécessaire |
| Session « rester connecté » (même clé) | Stockage local | Seulement si vous cochez la case | Jusqu'à votre déconnexion | Vous éviter de vous reconnecter | Non, demandé par vous |
| Préférences (`pc-prefs`) | Stockage local | Quand vous choisissez une filière, un filtre, ou lisez un article | Jusqu'à ce que vous retiriez votre accord | Retenir votre filière, vos filtres du blog, le dernier article lu | Oui |
| Cloudflare Web Analytics | Aucun stockage chez vous | À chaque page vue, si vous l'acceptez | — | Compter les pages vues | Oui |

</div>

Il n'y a ni cookie publicitaire, ni outil de suivi entre sites.

## Votre choix

À votre première visite, un bandeau vous propose **Tout refuser**, **Tout
accepter** ou **Personnaliser**, avec le même poids : refuser est aussi simple
qu'accepter. Tant que vous n'avez pas répondu, aucune mesure d'audience n'est
chargée et rien n'est conservé au-delà de l'onglet. Vous pouvez changer d'avis à tout moment avec le bouton « Gérer mes
choix » ci-dessus ou en pied de page. Le choix est redemandé au bout de six mois.

## Cookies nécessaires

**`pc_consent`** contient seulement `v1.m0` (mesure refusée) ou `v1.m1`
(acceptée). Il ne vous identifie pas et n'est envoyé à aucun tiers. Sans lui, le
bandeau reviendrait à chaque page.

**La session de connexion** : si vous vous connectez (page [Compte](/compte/),
ou pour obtenir un paquet gratuit), notre prestataire d'authentification,
Supabase, range un jeton dans le **stockage de session** de votre navigateur.
Ce n'est pas un cookie : il reste attaché à l'onglet et **s'efface dès que vous
le fermez**. Il ne contient pas votre mot de passe.

**Si vous cochez « Rester connecté sur cet appareil »** (connexion par adresse
et mot de passe), le même jeton est rangé dans le **stockage local** du
navigateur : il survit à la fermeture de l'onglet et s'efface **quand vous vous
déconnectez**. La case n'est jamais cochée d'avance ; ne l'utilisez pas sur un
ordinateur partagé. La connexion avec Google ne garde la session que pour
l'onglet en cours.

Ces deux éléments sont strictement nécessaires au service demandé : ils ne
requièrent pas votre consentement.

## Les préférences (facultatives)

Si vous les acceptez, le site retient, **sur votre appareil seulement** :

- **votre filière** (ECG, MPSI/PCSI, khâgne), choisie sur la page d'accueil, pour
  mettre en avant les guides qui vous concernent ;
- **vos filtres du blog** (filière, matière, tri, nombre d'articles par page),
  retrouvés à votre retour ;
- **le dernier article lu**, pour vous proposer de reprendre votre lecture.

Ces données ne quittent jamais votre navigateur : elles ne sont envoyées à
personne, pas même à nous. Si vous refusez, ces fonctions marchent quand même
pendant la visite, mais rien n'est conservé quand vous fermez l'onglet. Retirer
votre accord efface ces données.

## La mesure d'audience (facultative)

Si vous l'acceptez, le site charge **Cloudflare Web Analytics** pour compter les
pages vues et repérer les sites qui nous envoient des visiteurs. Son script
n'écrit ni cookie ni donnée dans votre navigateur (nous avons vérifié son
code), ne vous attribue pas d'identifiant et ne permet pas de vous suivre d'un
site à l'autre. Nous ne voyons que des totaux, pas des personnes. Il ne permet
donc pas de reconnaître un visiteur qui revient.

Si vous refusez, rien n'est chargé. Comme pour toute requête web, votre adresse
IP est vue par le serveur au moment du chargement de la page : voir
[Confidentialité](/confidentialite/#sur-ce-site).

## Les sites que vous quittez

Certains liens vous emmènent vers un autre site, qui applique ses propres
règles et peut déposer ses propres cookies dès que vous y arrivez :

- **Stripe**, si vous cliquez sur un bouton de paiement. Le paiement se fait sur
  une page de Stripe, pas sur prepacards.fr.
- **Google**, si vous choisissez « Continuer avec Google » pour vous connecter.
- **Les réseaux sociaux** (Instagram, TikTok, LinkedIn) du pied de page : ce sont
  de simples liens, aucun de leurs scripts n'est chargé ici.

Leurs politiques sont celles de ces éditeurs ; nous ne les contrôlons pas.

## L'application PrépaCards

L'application Windows n'est pas un site web : elle n'utilise ni cookie ni
navigateur pour fonctionner. Ses échanges avec le réseau sont décrits dans la
page [Confidentialité](/confidentialite/).

## Vérifier par vous-même

Ouvrez les outils de développement de votre navigateur (touche F12), onglet
*Application* (Chrome, Edge) ou *Stockage* (Firefox) : la rubrique *Cookies*
ne contient que `pc_consent` pour prepacards.fr, et la rubrique *Stockage de
session* ne contient une entrée que si vous êtes connecté. Pour effacer cette entrée sans fermer
l'onglet, déconnectez-vous depuis la page [Compte](/compte/).

## Une question

Écrivez à [contact@prepacards.fr](mailto:contact@prepacards.fr).

<p style="color:var(--gris);font-size:.9rem">Dernière mise à jour : 9 octobre
2026.</p>
