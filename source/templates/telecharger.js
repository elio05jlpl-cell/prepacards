// Page Telecharger : le bouton apparait pour une personne connectee
// ================================================================
//
// PrepaCards n'a plus de version gratuite : on commence par un compte (30
// jours d'essai, sans carte), puis on telecharge. Ce script montre le vrai
// bouton quand une session existe, la meme lecture legere que decks.js - sans
// charger le client Supabase.
//
// Sans lui, la page propose de creer le compte, et la page du compte porte
// elle-meme un bouton de telechargement : personne n'est bloque.

(function () {
  var bloc = document.getElementById('telechargement-bloc');
  if (!bloc) return;

  var connecte = false;
  try {
    var brut = sessionStorage.getItem('sb-ojnntqfafinxrousdvbn-auth-token')
      || localStorage.getItem('sb-ojnntqfafinxrousdvbn-auth-token');
    var session = brut && JSON.parse(brut);
    connecte = Boolean(session && session.refresh_token);
  } catch (e) { connecte = false; }

  if (!connecte) return;
  var compte = bloc.querySelector('.telechargement-compte');
  var pret = bloc.querySelector('.telechargement-pret');
  if (compte) compte.hidden = true;
  if (pret) pret.hidden = false;
}());
