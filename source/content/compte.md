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

<div id="compte-google" hidden>
<a class="bouton-google" href="/api/google?origine=site">
<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
<path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v7.5h12c-.2 2-1.5 5-4.4 7l6.7 5.2C42.2 36.2 45 30.6 45 24z"/>
<path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.7-5.2c-1.8 1.3-4.3 2.2-7.8 2.2-6 0-11-4-12.8-9.4l-7 5.4C7.8 41 15.3 46 24 46z"/>
<path fill="#FBBC05" d="M11.2 28.3c-.5-1.4-.7-2.8-.7-4.3s.3-3 .7-4.3l-7-5.4C2.9 17.1 2 20.4 2 24s.9 6.9 2.2 9.7l7-5.4z"/>
<path fill="#EA4335" d="M24 10.4c3.4 0 5.7 1.5 7 2.7l5.9-5.8C33.3 4 29.3 2 24 2 15.3 2 7.8 7 4.2 14.3l7 5.4C13 14.4 18 10.4 24 10.4z"/>
</svg>
Continuer avec Google</a>
<p class="compte-ou">ou</p>
</div>

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
