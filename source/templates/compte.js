// Page du compte
// ===============
//
// Parle directement a Supabase (Auth + REST), protege par les regles RLS
// posees dans worker/schema.sql : plus de Worker entre le navigateur et la
// base pour se connecter, s'inscrire ou lire son abonnement. Le Worker ne
// garde que ce qu'aucune clef publique ne doit faire : ecrire l'abonnement
// depuis le webhook Stripe.
//
// La session est rangee en sessionStorage et non en localStorage : elle
// disparait a la fermeture de l'onglet, ce qui vaut mieux sur un poste
// partage — et une salle informatique de lycee en est un.

(function () {
  var zone = document.getElementById('compte-app');
  if (!zone || !window.supabase) return;

  var SUPABASE_URL = 'https://ojnntqfafinxrousdvbn.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbm50cWZhZmlueHJvdXNkdmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MzY4MTQsImV4cCI6MjEwNjExMjgxNH0.HFLJDmu8UwU8bz6WbE91HmVb8uljIGI-G1rVEZ3YIeY';

  var stockageSession = {
    getItem: function (cle) { try { return sessionStorage.getItem(cle); } catch (e) { return null; } },
    setItem: function (cle, valeur) { try { sessionStorage.setItem(cle, valeur); } catch (e) { /* navigation privee */ } },
    removeItem: function (cle) { try { sessionStorage.removeItem(cle); } catch (e) { } },
  };

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storage: stockageSession, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  var connexionEl = document.getElementById('compte-connexion');
  var tableauEl = document.getElementById('compte-tableau');
  var form = document.getElementById('compte-form');
  var message = document.getElementById('compte-message');
  var valider = document.getElementById('compte-valider');
  var basculer = document.getElementById('compte-basculer');
  var googleLien = document.getElementById('compte-google-lien');
  var oublieLien = document.getElementById('compte-oublie');
  var deconnexionLien = document.getElementById('compte-deconnexion');
  var creation = false;

  function dire(texte, estErreur) {
    message.textContent = texte || '';
    message.hidden = !texte;
    message.className = 'compte-message' + (estErreur ? ' erreur' : '');
  }

  function dateCourte(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('fr-FR',
      { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function octetsLisibles(n) {
    if (!n) return '0 o';
    if (n < 1024) return n + ' o';
    if (n < 1048576) return Math.round(n / 1024) + ' ko';
    return (n / 1048576).toFixed(1) + ' Mo';
  }

  // Supabase repond en anglais : seuls les messages qu'un visiteur peut
  // vraiment declencher sont traduits, le reste retombe sur un message
  // generique plutot que d'afficher de l'anglais technique.
  function traduireErreur(erreur) {
    var m = (erreur && erreur.message) || '';
    if (/invalid login credentials/i.test(m)) return 'Adresse ou mot de passe incorrect.';
    if (/already registered|user already exists/i.test(m)) return 'Un compte existe déjà pour cette adresse.';
    if (/password should be at least/i.test(m)) return 'Le mot de passe doit faire au moins 8 caractères.';
    if (/rate limit/i.test(m)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
    if (/email not confirmed/i.test(m)) return 'Confirmez d’abord votre adresse depuis l’e-mail reçu à l’inscription.';
    return m || 'Demande refusée.';
  }

  function etatAbonnement(profil) {
    var statut = (profil && profil.statut) || '';
    var jusqu = profil && profil.valide_jusqu_au;
    var encoreValide = jusqu ? new Date(jusqu).getTime() > Date.now() : false;
    var actif = ['trialing', 'active', 'past_due'].indexOf(statut) !== -1 && encoreValide;
    return { abonne: actif, statut: statut, offre: (profil && profil.offre) || '', valide_jusqu_au: jusqu || null };
  }

  function afficherTableau(email, profil, sauvegarde) {
    connexionEl.hidden = true;
    tableauEl.hidden = false;

    document.getElementById('compte-adresse').textContent = email || '';

    var a = etatAbonnement(profil);
    var etat = document.getElementById('compte-etat');
    if (a.abonne) {
      var offre = a.offre === 'annuel' ? 'annuelle'
        : (a.offre === 'mensuel' ? 'mensuelle' : '');
      var fin = dateCourte(a.valide_jusqu_au);
      etat.innerHTML = '<p><strong>Offre complète'
        + (offre ? ' ' + offre : '') + ' active.</strong> '
        + (a.statut === 'trialing' ? 'Vous êtes en période d’essai. ' : '')
        + (fin ? 'Valable jusqu’au ' + fin + '.' : '') + '</p>';
    } else {
      etat.innerHTML = '<p><strong>Aucun abonnement sur ce compte.</strong> '
        + 'Vos cartes, la répétition espacée et les paquets gratuits restent '
        + 'accessibles. <a href="/tarifs/">Voir l’offre complète</a></p>';
    }

    document.getElementById('compte-sauvegarde').textContent = sauvegarde
      ? 'Dernière sauvegarde le ' + dateCourte(sauvegarde.depose_le)
        + ' · ' + octetsLisibles(sauvegarde.octets)
        + (sauvegarde.cartes ? ' · ' + sauvegarde.cartes + ' cartes' : '')
      : 'Aucune sauvegarde déposée pour l’instant.';
  }

  async function chargerCompte() {
    var reponseUtilisateur = await client.auth.getUser();
    var utilisateur = reponseUtilisateur.data && reponseUtilisateur.data.user;
    if (!utilisateur) return;

    var profilReponse = await client.from('profiles').select('*').eq('id', utilisateur.id).single();
    var sauvegardeReponse = await client.from('sauvegardes')
      .select('octets,cartes,depose_le').eq('compte_id', utilisateur.id).maybeSingle();

    afficherTableau(utilisateur.email, profilReponse.data, sauvegardeReponse.data);
  }

  basculer.addEventListener('click', function (e) {
    e.preventDefault();
    creation = !creation;
    valider.textContent = creation ? 'Créer le compte' : 'Se connecter';
    basculer.textContent = creation ? 'J’ai déjà un compte' : 'Créer un compte';
    document.getElementById('compte-mdp').setAttribute(
      'autocomplete', creation ? 'new-password' : 'current-password');
    dire('');
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = document.getElementById('compte-email').value.trim();
    var mdp = document.getElementById('compte-mdp').value;
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
        ? await client.auth.signUp({ email: email, password: mdp })
        : await client.auth.signInWithPassword({ email: email, password: mdp });
      if (resultat.error) throw resultat.error;
      document.getElementById('compte-mdp').value = '';

      if (creation && !resultat.data.session) {
        // La confirmation par e-mail est activee cote Supabase : pas de
        // session avant que l'adresse ne soit confirmee.
        dire('Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.', false);
      } else {
        await chargerCompte();
      }
    } catch (erreur) {
      dire(traduireErreur(erreur), true);
    } finally {
      valider.disabled = false;
      valider.textContent = libelle;
    }
  });

  if (oublieLien) {
    oublieLien.addEventListener('click', async function (e) {
      e.preventDefault();
      var email = document.getElementById('compte-email').value.trim();
      if (!email) { dire('Renseignez votre adresse pour recevoir un lien.', true); return; }
      dire('Envoi en cours…', false);
      try {
        await client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/mot-de-passe/',
        });
        dire('Si un compte existe pour cette adresse, un lien vient de lui être envoyé.', false);
      } catch (erreur) {
        dire(traduireErreur(erreur), true);
      }
    });
  }

  deconnexionLien.addEventListener('click', async function (e) {
    e.preventDefault();
    await client.auth.signOut();
    tableauEl.hidden = true;
    connexionEl.hidden = false;
  });

  if (googleLien) {
    googleLien.addEventListener('click', function (e) {
      e.preventDefault();
      client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/compte/' },
      });
    });
  }

  client.auth.onAuthStateChange(function (evenement) {
    if (evenement === 'SIGNED_IN') chargerCompte();
    if (evenement === 'SIGNED_OUT') { tableauEl.hidden = true; connexionEl.hidden = false; }
  });

  chargerCompte();
})();
