// Page des paquets gratuits
// ==========================
//
// Renvoie vers /decks/obtenir/ qui clique un paquet sans etre connecte. Le
// telechargement direct (lien statique classique, avec l'attribut download)
// continue de fonctionner sans detour pour qui l'est deja : aucun risque de
// casser le clic normal si ce script echoue a charger.
//
// Verification legere, sans le client Supabase (218 ko) : ce n'est qu'un
// coup d'œil au sessionStorage, la meme lecture que l'indicateur de l'en-tete.

(function () {
  function connecte() {
    try {
      var brut = sessionStorage.getItem('sb-ojnntqfafinxrousdvbn-auth-token');
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
})();
