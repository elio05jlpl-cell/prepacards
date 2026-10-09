---
title: Cookies et stockage local — PrépaCards
description: Ce que prepacards.fr dépose dans votre navigateur : aucun cookie, une session de connexion qui s'efface à la fermeture, une mesure d'audience sans traceur.
slug: cookies
---

# Cookies et stockage local

<p class="chapeau">Ce site ne dépose aucun cookie. Il écrit une seule chose dans
votre navigateur, et seulement si vous vous connectez : votre session, qui
disparaît quand vous fermez l'onglet. Cette page détaille ce qui est stocké,
ce qui ne l'est pas, et pourquoi il n'y a pas de bandeau de consentement.</p>

## En bref

<div class="tableau-enveloppe" markdown="1">

| Élément | Où | Quand | Durée | Pourquoi |
|---|---|---|---|---|
| Cookies | — | Jamais | — | Le site n'en dépose aucun |
| Session de connexion (`sb-…-auth-token`) | Stockage de session du navigateur | Seulement si vous vous connectez | Jusqu'à la fermeture de l'onglet | Vous reconnaître d'une page à l'autre |
| Mesure d'audience Cloudflare | Rien n'est écrit chez vous | À chaque page vue | — | Compter les pages vues |

</div>

## Ce que le site écrit dans votre navigateur

**Rien, tant que vous ne vous connectez pas.** Lire le blog, consulter les
comparatifs ou télécharger l'application ne dépose ni cookie ni donnée dans
votre navigateur.

**Si vous vous connectez** (page [Compte](/compte/), ou pour obtenir un paquet
gratuit), notre prestataire d'authentification, Supabase, range un jeton de
session dans le **stockage de session** de votre navigateur. Ce n'est pas un
cookie : il reste attaché à l'onglet, n'est envoyé à aucun site tiers, et
**s'efface dès que vous le fermez**. Il sert uniquement à vous éviter de
retaper votre mot de passe à chaque page. Il ne contient pas votre mot de
passe.

Ce stockage est strictement nécessaire au service que vous demandez en vous
connectant. À ce titre, il ne requiert pas votre consentement.

## La mesure d'audience

Le site utilise **Cloudflare Web Analytics** pour compter les pages vues et
repérer les sites qui nous envoient des visiteurs. Son script ne dépose aucun
cookie et n'écrit rien dans le stockage de votre navigateur : nous avons vérifié
son code, qui n'en contient aucun usage. Il ne vous attribue pas d'identifiant
et ne permet pas de vous suivre d'un site à l'autre. Nous ne voyons que des
totaux.

Comme pour toute requête web, votre adresse IP est vue par le serveur au moment
du chargement ; ce traitement est décrit dans la page
[Confidentialité](/confidentialite/#sur-ce-site).

## Pourquoi il n'y a pas de bandeau

Un bandeau de consentement est exigé quand un site dépose ou lit des traceurs
non indispensables au service : cookies publicitaires, identifiants de suivi,
mesure d'audience qui garde une trace chez le visiteur. Ce n'est pas le cas ici.
Le seul élément écrit, la session de connexion, est nécessaire au service ; la
mesure d'audience n'écrit rien chez vous.

Ajouter un bandeau « par précaution » vous demanderait un clic sans rien
protéger, et ne reflèterait pas ce que fait le site. Si cela change, par
exemple si nous ajoutions un outil qui dépose un cookie, nous mettrions à jour
cette page et demanderions votre accord **avant** toute activation.

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
est vide pour prepacards.fr, et la rubrique *Stockage de session* ne contient une
entrée que si vous êtes connecté. Pour effacer cette entrée sans fermer
l'onglet, déconnectez-vous depuis la page [Compte](/compte/).

## Une question

Écrivez à [contact@prepacards.fr](mailto:contact@prepacards.fr).

<p style="color:var(--gris);font-size:.9rem">Dernière vérification : 9 octobre
2026.</p>
