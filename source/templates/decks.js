// Page des paquets gratuits
// ==========================
//
// Deux choses, et seulement ces deux-la.
//
// 1. Renvoie vers /decks/obtenir/ qui clique un paquet sans etre connecte. Le
//    telechargement direct (lien statique classique, avec l'attribut download)
//    continue de fonctionner sans detour pour qui l'est deja : aucun risque de
//    casser le clic normal si ce script echoue a charger.
//    Verification legere, sans le client Supabase (218 ko) : ce n'est qu'un
//    coup d'œil au sessionStorage, la meme lecture que l'indicateur de l'en-tete.
//
// 2. Filtre la liste a mesure que l'on tape. Sans ce script la page reste une
//    liste complete : rien n'est cache tant qu'on ne cherche rien.

(function () {
  function connecte() {
    try {
      var brut = sessionStorage.getItem('sb-ojnntqfafinxrousdvbn-auth-token') || localStorage.getItem('sb-ojnntqfafinxrousdvbn-auth-token');
      var session = brut && JSON.parse(brut);
      return Boolean(session && session.refresh_token);
    } catch (e) {
      return false;
    }
  }

  document.querySelectorAll('.deck-carte').forEach(function (lien) {
    lien.addEventListener('click', function (e) {
      if (connecte()) return;
      e.preventDefault();
      var titre = lien.querySelector('.deck-titre');
      var parametres = new URLSearchParams({
        fichier: lien.getAttribute('href'),
        titre: titre ? titre.textContent : '',
      });
      window.location.href = '/decks/obtenir/?' + parametres.toString();
    });
  });

  // --- Recherche -----------------------------------------------------

  var champ = document.getElementById('decks-recherche');
  if (!champ) return;

  var compte = document.getElementById('decks-compte');
  var vide = document.getElementById('decks-vide');
  var texteCompte = compte ? compte.innerHTML : '';
  var total = compte ? parseInt(compte.getAttribute('data-total'), 10) : 0;

  // Sans accents ni majuscules : « Economie » doit trouver « Économie ».
  function normaliser(texte) {
    return (texte || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  var cartes = Array.prototype.slice.call(document.querySelectorAll('.deck-carte'))
    .map(function (carte) {
      return { noeud: carte, texte: normaliser(carte.textContent) };
    });
  var sections = Array.prototype.slice.call(document.querySelectorAll('.decks-matiere'));

  function filtrer() {
    var mots = normaliser(champ.value).split(/\s+/).filter(Boolean);
    var visibles = 0;

    cartes.forEach(function (c) {
      var ok = mots.every(function (m) { return c.texte.indexOf(m) !== -1; });
      c.noeud.hidden = !ok;
      if (ok) visibles += 1;
    });

    // Un theme sans paquet visible, et une matiere sans theme visible,
    // disparaissent : un titre seul au-dessus d'un vide ressemble a une panne.
    sections.forEach(function (section) {
      var reste = 0;
      section.querySelectorAll('.decks-groupe').forEach(function (titre) {
        var grille = titre.nextElementSibling;
        var n = grille ? grille.querySelectorAll('.deck-carte:not([hidden])').length : 0;
        titre.hidden = n === 0;
        if (grille) grille.hidden = n === 0;
        reste += n;
      });
      section.hidden = reste === 0;
    });

    if (vide) vide.hidden = visibles !== 0;
    if (compte) {
      compte.innerHTML = mots.length
        ? '<strong>' + visibles + ' paquet' + (visibles > 1 ? 's' : '') +
          '</strong> sur ' + total
        : texteCompte;
    }
  }

  champ.addEventListener('input', filtrer);
}());
