// Choix d'un nouveau mot de passe
// ================================
//
// Le lien recu par e-mail ramene ici avec un jeton dans le FRAGMENT de
// l'adresse ; Supabase le lit tout seul (detectSessionInUrl) et ouvre une
// session de recuperation, signalee par l'evenement PASSWORD_RECOVERY. Le
// fragment n'est jamais transmis au serveur ni, par l'en-tete « referer »,
// au site suivant.

(function () {
  var zone = document.getElementById('mdp-app');
  if (!zone || !window.supabase) return;

  var SUPABASE_URL = 'https://ojnntqfafinxrousdvbn.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbm50cWZhZmlueHJvdXNkdmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MzY4MTQsImV4cCI6MjEwNjExMjgxNH0.HFLJDmu8UwU8bz6WbE91HmVb8uljIGI-G1rVEZ3YIeY';

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, detectSessionInUrl: true },
  });

  var formulaire = document.getElementById('mdp-formulaire');
  var sansJeton = document.getElementById('mdp-sans-jeton');
  var fini = document.getElementById('mdp-fini');
  var form = document.getElementById('mdp-form');
  var message = document.getElementById('mdp-message');
  var valider = document.getElementById('mdp-valider');
  var pretAEnregistrer = false;

  function dire(texte, estErreur) {
    message.textContent = texte || '';
    message.hidden = !texte;
    message.className = 'compte-message' + (estErreur ? ' erreur' : '');
  }

  client.auth.onAuthStateChange(function (evenement) {
    if (evenement === 'PASSWORD_RECOVERY') {
      pretAEnregistrer = true;
      formulaire.hidden = false;
    }
  });

  // Le lien est absent, perime ou deja utilise : Supabase ne declenche
  // alors jamais PASSWORD_RECOVERY. On laisse un court instant pour que
  // l'evenement, s'il doit arriver, ait le temps d'arriver.
  setTimeout(function () {
    if (!pretAEnregistrer) sansJeton.hidden = false;
  }, 1500);

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
      var resultat = await client.auth.updateUser({ password: nouveau });
      if (resultat.error) throw resultat.error;
      // Par precaution, toutes les sessions ouvertes ailleurs sont
      // fermees : si le mot de passe a ete oublie parce que quelqu'un
      // d'autre s'en servait, le laisser connecte n'aurait aucun sens.
      await client.auth.signOut({ scope: 'global' });
      formulaire.hidden = true;
      fini.hidden = false;
    } catch (erreur) {
      dire((erreur && erreur.message) || 'Serveur injoignable. Réessayez.', true);
      valider.disabled = false;
      valider.textContent = libelle;
    }
  });
})();
