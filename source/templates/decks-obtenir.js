// Page « obtenir un paquet »
// ===========================
//
// Porte d'entree unique pour les 85 paquets gratuits : /decks/ redirige ici
// (voir decks.js) qui que ce soit qui clique un paquet sans etre connecte.
// Le fichier lui-meme reste un chemin statique ordinaire - cette page ne le
// protege pas, elle sert juste de frein a l'inscription. Une fois connecte,
// le telechargement se declenche seul.

(function () {
  var zone = document.getElementById('obtenir-app');
  if (!zone || !window.supabase) return;

  var SUPABASE_URL = 'https://ojnntqfafinxrousdvbn.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbm50cWZhZmlueHJvdXNkdmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MzY4MTQsImV4cCI6MjEwNjExMjgxNH0.HFLJDmu8UwU8bz6WbE91HmVb8uljIGI-G1rVEZ3YIeY';

  var parametres = new URLSearchParams(window.location.search);
  var fichier = parametres.get('fichier') || '';
  var titre = parametres.get('titre') || '';

  if (titre) {
    document.getElementById('obtenir-texte').textContent =
      'Authentifiez-vous pour obtenir gratuitement « ' + titre
      + ' », un paquet fait pour préparer HEC.';
  }

  // Par defaut la session vit en sessionStorage (elle s'efface a la fermeture
  // de l'onglet). Si l'utilisateur a coche « Rester connecte », elle est rangee
  // en localStorage, sous la meme cle. Le drapeau est efface a la deconnexion :
  // la case n'est jamais cochee d'avance, par egard pour les postes partages.
  var RESTER = 'pc-rester';
  function resteConnecte() { try { return localStorage.getItem(RESTER) === '1'; } catch (e) { return false; } }
  var stockageSession = {
    getItem: function (cle) {
      try { return sessionStorage.getItem(cle) || localStorage.getItem(cle); } catch (e) { return null; }
    },
    setItem: function (cle, valeur) {
      try {
        if (resteConnecte()) { localStorage.setItem(cle, valeur); sessionStorage.removeItem(cle); }
        else { sessionStorage.setItem(cle, valeur); localStorage.removeItem(cle); }
      } catch (e) { /* navigation privee */ }
    },
    removeItem: function (cle) {
      try {
        sessionStorage.removeItem(cle); localStorage.removeItem(cle);
        if (/-auth-token$/.test(cle)) localStorage.removeItem(RESTER);
      } catch (e) { }
    },
  };
  function retenirChoix(id) {
    var c = document.getElementById(id);
    try { localStorage.setItem(RESTER, c && c.checked ? '1' : '0'); } catch (e) { }
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storage: stockageSession, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  var connexionEl = document.getElementById('obtenir-connexion');
  var pretEl = document.getElementById('obtenir-pret');
  var form = document.getElementById('obtenir-form');
  var message = document.getElementById('obtenir-message');
  var valider = document.getElementById('obtenir-valider');
  var basculer = document.getElementById('obtenir-basculer');
  var googleLien = document.getElementById('obtenir-google-lien');
  var lienDirect = document.getElementById('obtenir-lien-direct');
  var creation = false;
  var declenche = false;

  function dire(texte, estErreur) {
    message.textContent = texte || '';
    message.hidden = !texte;
    message.className = 'compte-message' + (estErreur ? ' erreur' : '');
  }

  function traduireErreur(erreur) {
    var m = (erreur && erreur.message) || '';
    if (/invalid login credentials/i.test(m)) return 'Adresse ou mot de passe incorrect.';
    if (/already registered|user already exists/i.test(m)) return 'Un compte existe déjà pour cette adresse.';
    if (/password should be at least/i.test(m)) return 'Le mot de passe doit faire au moins 8 caractères.';
    if (/rate limit/i.test(m)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
    if (/email not confirmed/i.test(m)) return 'Confirmez d’abord votre adresse depuis l’e-mail reçu à l’inscription.';
    return m || 'Demande refusée.';
  }

  // Lien direct construit sans le declencher : au cas ou le navigateur
  // bloque le clic programmatique, ou par simple confiance a retrouver.
  if (lienDirect) lienDirect.href = fichier || '/decks/';

  function declencherTelechargement() {
    if (!fichier || declenche) return;
    declenche = true;
    var lien = document.createElement('a');
    lien.href = fichier;
    lien.download = '';
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
  }

  function afficherPret() {
    connexionEl.hidden = true;
    pretEl.hidden = false;
    declencherTelechargement();
  }

  if (basculer) {
    basculer.addEventListener('click', function (e) {
      e.preventDefault();
      creation = !creation;
      valider.textContent = creation ? 'Créer le compte et télécharger' : 'Se connecter et télécharger';
      basculer.textContent = creation ? 'J’ai déjà un compte' : 'Créer un compte';
      document.getElementById('obtenir-mdp').setAttribute(
        'autocomplete', creation ? 'new-password' : 'current-password');
      dire('');
    });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = document.getElementById('obtenir-email').value.trim();
    var mdp = document.getElementById('obtenir-mdp').value;
    if (!email || !mdp) { dire('Renseignez votre adresse et votre mot de passe.', true); return; }
    if (creation && mdp.length < 8) {
      dire('Le mot de passe doit faire au moins 8 caractères.', true); return;
    }

    valider.disabled = true;
    var libelle = valider.textContent;
    valider.textContent = 'Un instant…';
    dire('');
    try {
      var resultat = creation
        // emailRedirectTo ramene ici meme, fichier et titre compris dans
        // l'adresse : la confirmation de l'inscription declenche le
        // telechargement exactement comme une connexion directe.
        ? await client.auth.signUp({
            email: email, password: mdp,
            options: {
              emailRedirectTo: window.location.href,
              // D'ou vient l'inscription (visible dans Supabase).
              data: { provenance: 'site-paquets' },
            },
          })
        : (retenirChoix('obtenir-rester'), await client.auth.signInWithPassword({ email: email, password: mdp }));
      if (resultat.error) throw resultat.error;

      if (creation && !resultat.data.session) {
        dire('Compte créé. Vérifiez votre boîte mail : le téléchargement démarrera dès que vous aurez confirmé votre adresse.', false);
      }
      // Sinon, onAuthStateChange declenche afficherPret() juste apres.
    } catch (erreur) {
      dire(traduireErreur(erreur), true);
    } finally {
      valider.disabled = false;
      valider.textContent = libelle;
    }
  });

  if (googleLien) {
    googleLien.addEventListener('click', function (e) {
      e.preventDefault();
      client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href },
      });
    });
  }

  client.auth.onAuthStateChange(function (evenement) {
    if (evenement === 'SIGNED_IN') afficherPret();
  });

  // Deja connecte en arrivant (session existante, ou retour Google/e-mail
  // traite avant meme que l'ecouteur ci-dessus soit pose) : pas la peine
  // de montrer le formulaire pour le refermer aussitot.
  client.auth.getUser().then(function (reponse) {
    if (reponse.data && reponse.data.user) afficherPret();
  });
})();
