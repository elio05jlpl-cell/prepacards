---
title: Votre compte PrépaCards : abonnement et sauvegarde
description: Retrouvez votre abonnement PrépaCards, réactivez l'application sur une nouvelle machine, consultez votre sauvegarde chiffrée et vos paquets gratuits.
slug: compte
robots: noindex, follow
---

<section class="section" markdown="1">
<div class="conteneur-texte" markdown="1">

<script>
// Avant le premier affichage : la page de connexion se montre seule, sans
// en-tete ni pied de page. Si une session existe (ou si l'on revient de
// Google), on attend de savoir laquelle plutot que de montrer le formulaire
// une fraction de seconde.
(function () {
  var racine = document.documentElement, session = false;
  try { session = !!sessionStorage.getItem('sb-ojnntqfafinxrousdvbn-auth-token'); } catch (e) { }
  if (/access_token|[?&]code=/.test(location.hash + location.search)) session = true;
  racine.classList.add(session ? 'compte-attente' : 'compte-nu');
})();
</script>

<div id="compte-app" class="compte-zone">
<div id="compte-connexion" class="connexion-page">
<span class="connexion-impulsion v" aria-hidden="true" style="--x:-720px;--duree:14s;--delai:-2s;--sens:normal"></span>
<span class="connexion-impulsion v" aria-hidden="true" style="--x:-240px;--duree:11s;--delai:-6s;--sens:reverse"></span>
<span class="connexion-impulsion v" aria-hidden="true" style="--x:240px;--duree:12s;--delai:-9s;--sens:normal"></span>
<span class="connexion-impulsion v" aria-hidden="true" style="--x:720px;--duree:15s;--delai:-4s;--sens:reverse"></span>
<span class="connexion-impulsion v" aria-hidden="true" style="--x:-240px;--duree:17s;--delai:-13s;--sens:normal"></span>
<span class="connexion-impulsion v" aria-hidden="true" style="--x:240px;--duree:16s;--delai:-1s;--sens:reverse"></span>
<div class="connexion-carte">
<span class="connexion-impulsion h haut" aria-hidden="true" style="--duree:18s;--delai:-5s;--sens:normal"></span>
<span class="connexion-impulsion h bas" aria-hidden="true" style="--duree:20s;--delai:-12s;--sens:reverse"></span>
<a class="connexion-logo" href="/" aria-label="PrépaCards, accueil"><img src="/img/logo.webp" width="52" height="52" alt=""></a>
<h1 class="connexion-titre">Commençons à réviser</h1>
<p class="connexion-sous" id="connexion-sous">Connectez-vous ou inscrivez-vous ci-dessous</p>
<form id="compte-form" class="connexion-form" autocomplete="on" novalidate>
<div class="connexion-ligne">
<label for="compte-email">Email</label>
<a href="#" id="compte-oublie" class="connexion-lien">Mot de passe oublié ?</a>
</div>
<input id="compte-email" class="connexion-champ" name="email" type="email" required
autocomplete="email" inputmode="email" placeholder="vous@exemple.fr">
<div id="compte-etape-mdp" class="connexion-etape" hidden>
<div class="connexion-ligne">
<label for="compte-mdp" id="compte-mdp-libelle">Mot de passe</label>
<a href="#" id="compte-modifier" class="connexion-lien">Modifier l'adresse</a>
</div>
<input id="compte-mdp" class="connexion-champ" name="mot_de_passe" type="password"
autocomplete="current-password" placeholder="8 caractères minimum">
<label class="connexion-rester"><input type="checkbox" id="compte-rester"> Rester connecté sur cet appareil</label>
</div>
<p id="compte-message" class="compte-message" hidden></p>
<div class="connexion-actions">
<a href="#" id="compte-basculer" class="connexion-lien" hidden>Créer un compte</a>
<button class="connexion-continuer" type="submit" id="compte-valider" hidden>Continuer</button>
</div>
</form>
<a class="connexion-google" href="#" id="compte-google-lien">
<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
<path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v7.5h12c-.2 2-1.5 5-4.4 7l6.7 5.2C42.2 36.2 45 30.6 45 24z"/>
<path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.7-5.2c-1.8 1.3-4.3 2.2-7.8 2.2-6 0-11-4-12.8-9.4l-7 5.4C7.8 41 15.3 46 24 46z"/>
<path fill="#FBBC05" d="M11.2 28.3c-.5-1.4-.7-2.8-.7-4.3s.3-3 .7-4.3l-7-5.4C2.9 17.1 2 20.4 2 24s.9 6.9 2.2 9.7l7-5.4z"/>
<path fill="#EA4335" d="M24 10.4c3.4 0 5.7 1.5 7 2.7l5.9-5.8C33.3 4 29.3 2 24 2 15.3 2 7.8 7 4.2 14.3l7 5.4C13 14.4 18 10.4 24 10.4z"/>
</svg>
<span>Continuer avec Google</span>
</a>
</div>
<p class="connexion-pied">
<a href="/cgu/">Conditions d'utilisation</a>
<a href="/confidentialite/">Politique de confidentialité</a>
</p>
</div>

<div id="compte-tableau" hidden>
<p class="compte-titre">Votre compte</p>
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

<h2>Mot de passe et connexion</h2>
<p id="compte-identites">Chargement…</p>
<p id="compte-identites-message" class="compte-message" hidden></p>
<p class="compte-actions-identite">
<button type="button" class="bouton-secondaire" id="compte-google-associer" hidden>Associer Google</button>
<button type="button" class="bouton-secondaire" id="compte-google-dissocier" hidden>Dissocier Google</button>
</p>
<form id="compte-mdp-form" class="compte-form">
<label for="compte-nouveau-mdp">Nouveau mot de passe</label>
<input id="compte-nouveau-mdp" name="nouveau_mot_de_passe" type="password"
autocomplete="new-password" placeholder="8 caractères minimum">
<button class="bouton-secondaire" type="submit" id="compte-mdp-valider">Changer le mot de passe</button>
</form>

<h2>Vos paquets gratuits</h2>
<p>Les 85 paquets d'anglais, d'allemand, d'espagnol, d'italien et les
formules de maths sont inclus avec votre compte, à tout moment.</p>
<p><a class="bouton-secondaire" href="/decks/">Voir les paquets</a></p>

<h2>Zone dangereuse</h2>
<aside class="encart encart-danger">
<p>Supprime définitivement votre compte et votre sauvegarde chiffrée.
Si un abonnement est actif, résiliez-le d'abord depuis le lien reçu
par e-mail lors du paiement — sinon Stripe continuerait à vous
prélever sans qu'aucun compte n'existe plus pour le récupérer. Vos
cartes, elles, restent sur votre ordinateur : cette suppression n'y
touche pas.</p>
<p id="compte-suppression-message" class="compte-message" hidden></p>
<button type="button" class="bouton-danger" id="compte-supprimer">Supprimer mon compte</button>
</aside>

<p class="compte-bascule"><a href="#" id="compte-deconnexion">Se déconnecter</a></p>
</div>

</div>

</div>
</section>
