// Choix d'un nouveau mot de passe
// ================================
//
// Le jeton arrive dans le FRAGMENT de l'adresse, jamais dans la requete :
// un fragment n'est transmis ni au serveur ni, par l'en-tete « referer »,
// au site suivant. On l'efface de la barre d'adresse des qu'il est lu,
// pour qu'il ne traine pas dans l'historique d'un poste partage.

(function () {
  var zone = document.getElementById('mdp-app');
  if (!zone) return;

  var formulaire = document.getElementById('mdp-formulaire');
  var sansJeton = document.getElementById('mdp-sans-jeton');
  var fini = document.getElementById('mdp-fini');
  var form = document.getElementById('mdp-form');
  var message = document.getElementById('mdp-message');
  var valider = document.getElementById('mdp-valider');
  var jeton = '';

  function dire(texte, estErreur) {
    message.textContent = texte || '';
    message.hidden = !texte;
    message.className = 'compte-message' + (estErreur ? ' erreur' : '');
  }

  (function lireJeton() {
    var brut = (window.location.hash || '').replace(/^#/, '');
    brut.split('&').forEach(function (paire) {
      var i = paire.indexOf('=');
      if (i > 0 && paire.slice(0, i) === 'jeton') {
        try { jeton = decodeURIComponent(paire.slice(i + 1)); } catch (e) { }
      }
    });
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  })();

  if (!jeton) { sansJeton.hidden = false; return; }
  formulaire.hidden = false;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var nouveau = document.getElementById('mdp-nouveau').value;
    var confirme = document.getElementById('mdp-confirme').value;

    if (nouveau.length < 8) {
      dire('Le mot de passe doit faire au moins 8 caractères.', true); return;
    }
    if (nouveau !== confirme) {
      dire('Les deux mots de passe ne correspondent pas.', true); return;
    }

    valider.disabled = true;
    var libelle = valider.textContent;
    valider.textContent = 'Un instant…';
    dire('');
    try {
      var reponse = await fetch('/api/mot-de-passe/changer', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ jeton: jeton, mot_de_passe: nouveau })
      });
      var donnees = {};
      try { donnees = await reponse.json(); } catch (x) { }
      if (!reponse.ok) throw new Error(donnees.erreur || 'Demande refusée.');
      formulaire.hidden = true;
      fini.hidden = false;
    } catch (erreur) {
      dire(erreur.message || 'Serveur injoignable. Réessayez.', true);
      valider.disabled = false;
      valider.textContent = libelle;
    }
  });
})();
