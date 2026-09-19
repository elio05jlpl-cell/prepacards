---
title: Votre compte PrépaCards : abonnement et sauvegarde
description: Retrouvez votre abonnement PrépaCards, réactivez l'application sur une nouvelle machine, consultez votre sauvegarde chiffrée et vos paquets gratuits.
slug: compte
robots: noindex, follow
---

<section class="section" markdown="1">
<div class="conteneur-texte" markdown="1">

<div id="compte-app" class="compte-zone">

  <h1>Votre compte</h1>

  <div id="compte-connexion">
    <p class="chapeau">Avec l'adresse utilisée au paiement. Il sert à
      retrouver votre abonnement sur une autre machine — vos cartes, elles,
      restent sur votre ordinateur.</p>

    <form id="compte-form" class="compte-form" autocomplete="on">
      <label for="compte-email">Adresse e-mail</label>
      <input id="compte-email" name="email" type="email" required
             autocomplete="email" placeholder="vous@exemple.fr">

      <label for="compte-mdp">Mot de passe</label>
      <input id="compte-mdp" name="mot_de_passe" type="password" required
             autocomplete="current-password" placeholder="8 caractères minimum">

      <p id="compte-message" class="compte-message" hidden></p>

      <button class="bouton" type="submit" id="compte-valider">Se connecter</button>
      <p class="compte-bascule">
        <a href="#" id="compte-basculer">Créer un compte</a>
      </p>
    </form>
  </div>

  <div id="compte-tableau" hidden>
    <p class="chapeau" id="compte-adresse"></p>

    <div class="encart" id="compte-etat"></div>

    <h2>Réactiver sur une autre machine</h2>
    <p>Installez PrépaCards, puis <strong>Outils → Compte et abonnement</strong>
      et connectez-vous avec cette même adresse. L'abonnement suit le compte,
      pas la machine.</p>
    <p><a class="bouton-secondaire" href="/telecharger/">Télécharger l'application</a></p>

    <h2>Votre sauvegarde</h2>
    <p id="compte-sauvegarde">Aucune sauvegarde déposée.</p>
    <p>La sauvegarde est <strong>chiffrée sur votre ordinateur</strong> avant
      d'être envoyée. Nous ne pouvons pas l'ouvrir, et elle ne se restaure
      que depuis l'application, avec votre mot de passe.</p>

    <h2>Facturation et résiliation</h2>
    <p>Tout se fait depuis le lien présent dans l'e-mail envoyé par Stripe
      lors du paiement : changer de carte, récupérer une facture, résilier.
      L'abonnement reste actif jusqu'au terme déjà réglé.</p>

    <h2>Vos paquets gratuits</h2>
    <p>Les 85 paquets d'anglais, d'allemand, d'espagnol, d'italien et les
      formules de maths sont accessibles sans compte, à tout moment.</p>
    <p><a class="bouton-secondaire" href="/decks/">Voir les paquets</a></p>

    <p class="compte-bascule"><a href="#" id="compte-deconnexion">Se déconnecter</a></p>
  </div>

</div>

</div>
</section>
