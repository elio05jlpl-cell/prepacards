// Page du compte
// ===============
//
// Parle directement a Supabase (Auth + REST), protege par les regles RLS
// posees dans worker/schema.sql : plus de Worker entre le navigateur et la
// base pour se connecter, s'inscrire ou lire son abonnement. Le Worker ne
// garde que ce qu'aucune clef publique ne doit faire : ecrire l'abonnement
// depuis le webhook Stripe.
//
// La session est rangee en sessionStorage par defaut : elle disparait a la
// fermeture de l'onglet, ce qui vaut mieux sur un poste partage — et une salle
// informatique de lycee en est un. Seule la case « Rester connecte », cochee
// par l'utilisateur, la range en localStorage.

(function () {
  var zone = document.getElementById('compte-app');
  if (!zone || !window.supabase) return;

  var SUPABASE_URL = 'https://ojnntqfafinxrousdvbn.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbm50cWZhZmlueHJvdXNkdmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MzY4MTQsImV4cCI6MjEwNjExMjgxNH0.HFLJDmu8UwU8bz6WbE91HmVb8uljIGI-G1rVEZ3YIeY';

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

  var connexionEl = document.getElementById('compte-connexion');
  var tableauEl = document.getElementById('compte-tableau');
  var form = document.getElementById('compte-form');
  var message = document.getElementById('compte-message');
  var valider = document.getElementById('compte-valider');
  var basculer = document.getElementById('compte-basculer');
  var googleLien = document.getElementById('compte-google-lien');
  var oublieLien = document.getElementById('compte-oublie');
  var deconnexionLien = document.getElementById('compte-deconnexion');
  var identitesMessage = document.getElementById('compte-identites-message');
  var googleAssocierBtn = document.getElementById('compte-google-associer');
  var googleDissocierBtn = document.getElementById('compte-google-dissocier');
  var mdpForm = document.getElementById('compte-mdp-form');
  var supprimerBtn = document.getElementById('compte-supprimer');
  var creation = false;
  var identitesActuelles = [];

  // Page de connexion en deux temps : l'adresse, puis ce que son compte
  // demande (le mot de passe s'il existe, le choix d'un mot de passe sinon).
  var emailChamp = document.getElementById('compte-email');
  var mdpChamp = document.getElementById('compte-mdp');
  var etapeMdp = document.getElementById('compte-etape-mdp');
  var modifierLien = document.getElementById('compte-modifier');
  var mdpLibelle = document.getElementById('compte-mdp-libelle');
  var sousTitre = document.getElementById('connexion-sous');
  var SOUS_TITRE = sousTitre ? sousTitre.textContent : '';
  var etape = 'email';      // 'email' puis 'mdp'
  var secours = false;      // vrai si le service d'existence ne repond pas

  // Montre la page de connexion, seule et sans en-tete, ou le tableau de bord
  // avec le site autour. Un seul endroit decide, pour que les deux ne se
  // retrouvent jamais affiches ensemble.
  function montrerConnexion(oui) {
    var racine = document.documentElement;
    racine.classList.remove('compte-attente');
    racine.classList.toggle('compte-nu', oui);
    connexionEl.hidden = !oui;
    tableauEl.hidden = oui;
    if (oui && !window.matchMedia('(pointer: coarse)').matches) {
      try { emailChamp.focus({ preventScroll: true }); } catch (e) { /* ancien navigateur */ }
    }
  }

  function emailPlausible(valeur) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valeur);
  }

  function dire(texte, estErreur) {
    message.textContent = texte || '';
    message.hidden = !texte;
    message.className = 'compte-message' + (estErreur ? ' erreur' : '');
  }

  function direIdentites(texte, estErreur) {
    identitesMessage.textContent = texte || '';
    identitesMessage.hidden = !texte;
    identitesMessage.className = 'compte-message' + (estErreur ? ' erreur' : '');
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
    if (/manual linking is disabled/i.test(m)) return 'La liaison de comptes n’est pas encore activée côté serveur.';
    if (/(only identity|last identity|only remaining)/i.test(m)) return 'Impossible de dissocier : gardez au moins une méthode de connexion.';
    if (/identity is already linked/i.test(m)) return 'Ce compte Google est déjà associé à un autre compte PrépaCards.';
    return m || 'Demande refusée.';
  }

  function etatAbonnement(profil) {
    var statut = (profil && profil.statut) || '';
    var jusqu = profil && profil.valide_jusqu_au;
    var encoreValide = jusqu ? new Date(jusqu).getTime() > Date.now() : false;
    var actif = ['trialing', 'active', 'past_due'].indexOf(statut) !== -1 && encoreValide;
    if (actif) {
      return { abonne: true, statut: statut, offre: (profil && profil.offre) || '', valide_jusqu_au: jusqu || null };
    }
    // Essai gratuit de 30 jours, sans carte : profiles.essai_fin, pose a
    // l'inscription par le serveur.
    var essai = profil && profil.essai_fin;
    if (essai && new Date(essai).getTime() > Date.now()) {
      return { abonne: true, statut: 'essai', offre: '', valide_jusqu_au: essai };
    }
    return { abonne: false, statut: statut, offre: (profil && profil.offre) || '', valide_jusqu_au: jusqu || null };
  }

  function afficherTableau(email, profil, sauvegarde) {
    montrerConnexion(false);

    document.getElementById('compte-adresse').textContent = email || '';

    var a = etatAbonnement(profil);
    var etat = document.getElementById('compte-etat');
    if (a.abonne && a.statut === 'essai') {
      var finEssai = dateCourte(a.valide_jusqu_au);
      etat.innerHTML = '<p><strong>Essai gratuit en cours.</strong> '
        + (finEssai ? 'Jusqu’au ' + finEssai + '. ' : '')
        + 'Vous pouvez vous abonner dès maintenant : vous ne payez qu’à la fin '
        + 'de l’essai. <a href="/tarifs/">Voir l’offre</a></p>';
    } else if (a.abonne) {
      var offre = a.offre === 'annuel' ? 'annuelle'
        : (a.offre === 'mensuel' ? 'mensuelle' : '');
      var fin = dateCourte(a.valide_jusqu_au);
      etat.innerHTML = '<p><strong>Abonnement'
        + (offre ? ' ' + offre : '') + ' actif.</strong> '
        + (a.statut === 'trialing' ? 'Vous êtes en période d’essai. ' : '')
        + (fin ? 'Valable jusqu’au ' + fin + '.' : '') + '</p>';
    } else {
      etat.innerHTML = '<p><strong>Essai terminé, aucun abonnement.</strong> '
        + 'Vos cartes restent sur votre ordinateur. '
        + '<a href="/tarifs/">S’abonner</a></p>';
    }

    document.getElementById('compte-sauvegarde').textContent = sauvegarde
      ? 'Dernière sauvegarde le ' + dateCourte(sauvegarde.depose_le)
        + ' · ' + octetsLisibles(sauvegarde.octets)
        + (sauvegarde.cartes ? ' · ' + sauvegarde.cartes + ' cartes' : '')
      : 'Aucune sauvegarde déposée pour l’instant.';
  }

  // Decrit les methodes de connexion actives, et n'affiche « Dissocier »
  // que s'il en reste une autre ensuite : se retrouver hors de son propre
  // compte parce qu'on a retire sa seule methode serait irrattrapable.
  async function chargerIdentites() {
    try {
      var reponse = await client.auth.getUserIdentities();
      var identites = (reponse.data && reponse.data.identities) || [];
      identitesActuelles = identites;

      var aGoogle = identites.some(function (i) { return i.provider === 'google'; });
      var aMotDePasse = identites.some(function (i) { return i.provider === 'email'; });

      var methodes = [];
      if (aMotDePasse) methodes.push('mot de passe');
      if (aGoogle) methodes.push('Google');
      document.getElementById('compte-identites').textContent =
        'Connexion possible avec : ' + (methodes.length ? methodes.join(' et ') : '—') + '.';

      googleAssocierBtn.hidden = aGoogle;
      googleDissocierBtn.hidden = !aGoogle || !aMotDePasse;
      document.getElementById('compte-mdp-valider').textContent =
        aMotDePasse ? 'Changer le mot de passe' : 'Définir un mot de passe';
    } catch (e) {
      document.getElementById('compte-identites').textContent = '';
    }
  }

  async function chargerCompte() {
    var reponseUtilisateur = await client.auth.getUser();
    var utilisateur = reponseUtilisateur.data && reponseUtilisateur.data.user;
    if (!utilisateur) { montrerConnexion(true); return; }

    var profilReponse = await client.from('profiles').select('*').eq('id', utilisateur.id).single();
    var sauvegardeReponse = await client.from('sauvegardes')
      .select('octets,cartes,depose_le').eq('compte_id', utilisateur.id).maybeSingle();

    afficherTableau(utilisateur.email, profilReponse.data, sauvegardeReponse.data);
    chargerIdentites();
  }

  function majBouton() {
    // « Continuer » n'apparait qu'une fois l'adresse saisie : tant qu'elle
    // n'a pas la forme d'une adresse, il n'y a rien a valider.
    valider.hidden = !(etape === 'mdp' || emailPlausible(emailChamp.value.trim()));
  }

  function revenirEmail() {
    etape = 'email';
    creation = false;
    etapeMdp.hidden = true;
    mdpChamp.value = '';
    basculer.hidden = true;
    sousTitre.textContent = SOUS_TITRE;
    valider.textContent = 'Continuer';
    googleLien.classList.remove('mis-en-avant');
    dire('');
    majBouton();
  }

  function passerAuMotDePasse(mode, texte) {
    etape = 'mdp';
    creation = mode === 'creation';
    etapeMdp.hidden = false;
    mdpLibelle.textContent = creation ? 'Choisissez un mot de passe' : 'Mot de passe';
    mdpChamp.setAttribute('autocomplete', creation ? 'new-password' : 'current-password');
    mdpChamp.setAttribute('placeholder', creation ? '8 caractères minimum' : 'Votre mot de passe');
    valider.textContent = creation ? 'Créer mon compte' : 'Se connecter';
    valider.hidden = false;
    sousTitre.textContent = texte;
    // Le lien de bascule ne sert que si le serveur n'a pas pu dire de quel
    // cas il s'agit : on laisse alors la personne choisir.
    basculer.hidden = !secours;
    basculer.textContent = creation ? 'J’ai déjà un compte' : 'Créer un compte';
    dire('');
    mdpChamp.focus();
  }

  async function existence(email) {
    var reponse = await fetch('/api/compte/existe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email }),
    });
    if (reponse.status === 429) throw new Error('rate limit');
    if (!reponse.ok) return null;
    return reponse.json();
  }

  async function etapeAdresse(email) {
    valider.disabled = true;
    var libelle = valider.textContent;
    valider.textContent = 'Un instant…';
    dire('');
    try {
      var lecture = null;
      try { lecture = await existence(email); }
      catch (erreur) {
        if (/rate limit/i.test(erreur.message)) throw erreur;
        lecture = null;     // reseau ou service indisponible : mode de secours
      }
      secours = lecture === null;
      if (secours) {
        passerAuMotDePasse('connexion', 'Entrez votre mot de passe, ou créez un compte.');
      } else if (lecture.existe && lecture.mot_de_passe) {
        passerAuMotDePasse('connexion', 'Content de vous revoir. Entrez votre mot de passe.');
      } else if (lecture.existe) {
        // Compte ouvert avec Google, sans mot de passe : lui en demander un ici
        // le laisserait croire qu'il peut en definir un en le tapant.
        dire('Cette adresse est liée à un compte Google. Continuez avec Google ci-dessous.', false);
        googleLien.classList.add('mis-en-avant');
      } else {
        passerAuMotDePasse('creation', 'Aucun compte avec cette adresse : créons-le. Choisissez un mot de passe.');
      }
    } catch (erreur) {
      dire(traduireErreur(erreur), true);
    } finally {
      valider.disabled = false;
      if (etape === 'email') valider.textContent = libelle;
    }
  }

  async function etapeMotDePasse(email) {
    var mdp = mdpChamp.value;
    if (!mdp) { dire('Entrez votre mot de passe.', true); return; }
    if (creation && mdp.length < 8) {
      dire('Le mot de passe doit faire au moins 8 caractères.', true); return;
    }

    valider.disabled = true;
    var libelle = valider.textContent;
    valider.textContent = 'Un instant…';
    dire('');
    try {
      var resultat = creation
        // provenance : d'ou vient l'inscription, visible dans Supabase
        // (Authentication > Users > raw_user_meta_data). Aucune donnee
        // personnelle : un simple mot.
        ? await client.auth.signUp({
            email: email, password: mdp,
            options: { data: { provenance: 'site-compte' } },
          })
        : (retenirChoix('compte-rester'), await client.auth.signInWithPassword({ email: email, password: mdp }));
      if (resultat.error) throw resultat.error;
      mdpChamp.value = '';

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
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = emailChamp.value.trim();
    if (!emailPlausible(email)) { dire('Entrez une adresse e-mail valide.', true); return; }
    if (etape === 'email') await etapeAdresse(email);
    else await etapeMotDePasse(email);
  });

  // Modifier l'adresse en cours de route ramene a la premiere etape : le mot
  // de passe demande ne correspondrait plus au compte.
  emailChamp.addEventListener('input', function () {
    if (etape === 'mdp') revenirEmail();
    googleLien.classList.remove('mis-en-avant');
    majBouton();
  });

  modifierLien.addEventListener('click', function (e) {
    e.preventDefault();
    revenirEmail();
    emailChamp.focus();
    emailChamp.select();
  });

  basculer.addEventListener('click', function (e) {
    e.preventDefault();
    if (creation) passerAuMotDePasse('connexion', 'Entrez votre mot de passe, ou créez un compte.');
    else passerAuMotDePasse('creation', 'Choisissez un mot de passe pour créer votre compte.');
  });

  if (oublieLien) {
    oublieLien.addEventListener('click', async function (e) {
      e.preventDefault();
      var email = emailChamp.value.trim();
      if (!emailPlausible(email)) {
        dire('Entrez d’abord votre adresse e-mail pour recevoir un lien.', true);
        emailChamp.focus();
        return;
      }
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
    revenirEmail();
    montrerConnexion(true);
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

  if (googleAssocierBtn) {
    googleAssocierBtn.addEventListener('click', function () {
      client.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/compte/' },
      });
    });
  }

  if (googleDissocierBtn) {
    googleDissocierBtn.addEventListener('click', async function () {
      var identite = identitesActuelles.filter(function (i) { return i.provider === 'google'; })[0];
      if (!identite) return;
      googleDissocierBtn.disabled = true;
      try {
        var resultat = await client.auth.unlinkIdentity(identite);
        if (resultat.error) throw resultat.error;
        direIdentites('Compte Google dissocié.', false);
        await chargerIdentites();
      } catch (erreur) {
        direIdentites(traduireErreur(erreur), true);
      } finally {
        googleDissocierBtn.disabled = false;
      }
    });
  }

  if (mdpForm) {
    mdpForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var champ = document.getElementById('compte-nouveau-mdp');
      var nouveau = champ.value;
      if (nouveau.length < 8) { direIdentites('Le mot de passe doit faire au moins 8 caractères.', true); return; }

      var bouton = document.getElementById('compte-mdp-valider');
      var libelle = bouton.textContent;
      bouton.disabled = true;
      bouton.textContent = 'Un instant…';
      try {
        var resultat = await client.auth.updateUser({ password: nouveau });
        if (resultat.error) throw resultat.error;
        champ.value = '';
        direIdentites('Mot de passe mis à jour.', false);
        await chargerIdentites();
      } catch (erreur) {
        direIdentites(traduireErreur(erreur), true);
      } finally {
        bouton.disabled = false;
        bouton.textContent = libelle;
      }
    });
  }

  if (supprimerBtn) {
    supprimerBtn.addEventListener('click', async function () {
      if (!window.confirm(
        'Cette action est définitive : votre compte et votre sauvegarde '
        + 'seront supprimés. Continuer ?')) return;

      var suppressionMessage = document.getElementById('compte-suppression-message');
      function direSuppression(texte, estErreur) {
        suppressionMessage.textContent = texte || '';
        suppressionMessage.hidden = !texte;
        suppressionMessage.className = 'compte-message' + (estErreur ? ' erreur' : '');
      }

      supprimerBtn.disabled = true;
      direSuppression('Suppression en cours…', false);
      try {
        var sessionReponse = await client.auth.getSession();
        var session = sessionReponse.data && sessionReponse.data.session;
        if (!session) throw new Error('Session expirée, reconnectez-vous.');

        var reponse = await fetch('/api/compte/supprimer', {
          method: 'POST',
          headers: { authorization: 'Bearer ' + session.access_token },
        });
        var corps = await reponse.json().catch(function () { return {}; });
        if (!reponse.ok) throw new Error(corps.erreur || 'La suppression a échoué.');

        // Le compte n'existe plus cote serveur : rien a revoquer, on nettoie
        // seulement le navigateur.
        try { await client.auth.signOut(); } catch (e) { /* deja invalide */ }
        revenirEmail();
        montrerConnexion(true);
        dire('Votre compte a bien été supprimé.', false);
      } catch (erreur) {
        direSuppression(erreur.message || 'La suppression a échoué.', true);
        supprimerBtn.disabled = false;
      }
    });
  }

  client.auth.onAuthStateChange(function (evenement) {
    if (evenement === 'SIGNED_IN') chargerCompte();
    if (evenement === 'SIGNED_OUT') montrerConnexion(true);
  });

  chargerCompte();
})();
