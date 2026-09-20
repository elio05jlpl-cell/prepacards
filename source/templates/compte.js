// Page du compte
// ===============
//
// Elle parle au meme service que l'application : /api/connexion,
// /api/inscription, /api/abonnement. Aucune logique metier ici, seulement
// l'affichage — les regles vivent dans le Worker, et les dupliquer dans le
// navigateur reviendrait a les rendre modifiables par le visiteur.
//
// Le jeton est range dans sessionStorage et non dans localStorage : il
// disparait a la fermeture de l'onglet, ce qui vaut mieux sur un poste
// partage — et une salle informatique de lycee en est un.

(function () {
  var zone = document.getElementById('compte-app');
  if (!zone) return;

  var CLE = 'prepacards_jeton';
  var connexion = document.getElementById('compte-connexion');
  var tableau = document.getElementById('compte-tableau');
  var form = document.getElementById('compte-form');
  var message = document.getElementById('compte-message');
  var valider = document.getElementById('compte-valider');
  var basculer = document.getElementById('compte-basculer');
  var creation = false;

  function jeton() {
    try { return sessionStorage.getItem(CLE) || ''; } catch (e) { return ''; }
  }
  function rangerJeton(valeur) {
    try { valeur ? sessionStorage.setItem(CLE, valeur) : sessionStorage.removeItem(CLE); }
    catch (e) { /* navigation privee : la session vivra le temps de la page */ }
  }

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

  async function api(chemin, options) {
    options = options || {};
    var entetes = { accept: 'application/json' };
    if (options.corps) entetes['content-type'] = 'application/json';
    if (options.jeton) entetes.authorization = 'Bearer ' + options.jeton;
    var reponse = await fetch('/api' + chemin, {
      method: options.methode || (options.corps ? 'POST' : 'GET'),
      headers: entetes,
      body: options.corps ? JSON.stringify(options.corps) : undefined
    });
    var donnees = {};
    try { donnees = await reponse.json(); } catch (e) { /* corps vide */ }
    if (!reponse.ok) {
      // Un 404 sur /api ne vient pas du visiteur : c'est le service qui
      // n'est pas la. Lui repondre « demande refusee » lui ferait relire
      // son mot de passe pendant des minutes pour rien.
      var defaut = (reponse.status === 404 || reponse.status === 405)
        ? 'Le service de comptes n’est pas encore ouvert. Réessayez plus tard.'
        : 'Demande refusée.';
      var erreur = new Error(donnees.erreur || defaut);
      erreur.statut = reponse.status;
      throw erreur;
    }
    return donnees;
  }

  function afficherTableau(donnees) {
    connexion.hidden = true;
    tableau.hidden = false;

    document.getElementById('compte-adresse').textContent = donnees.email || '';

    var a = donnees.abonnement || {};
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

    var s = donnees.sauvegarde;
    document.getElementById('compte-sauvegarde').textContent = s
      ? 'Dernière sauvegarde le ' + dateCourte(s.depose_le)
        + ' · ' + octetsLisibles(s.octets)
        + (s.cartes ? ' · ' + s.cartes + ' cartes' : '')
      : 'Aucune sauvegarde déposée pour l’instant.';
  }

  async function charger() {
    var courant = jeton();
    if (!courant) return;
    try {
      afficherTableau(await api('/abonnement', { jeton: courant }));
    } catch (e) {
      // Session expiree ou serveur muet : on revient au formulaire plutot
      // que de laisser une page a moitie remplie.
      rangerJeton('');
    }
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
      var donnees = await api(creation ? '/inscription' : '/connexion', {
        corps: { email: email, mot_de_passe: mdp, origine: 'site' }
      });
      rangerJeton(donnees.jeton);
      document.getElementById('compte-mdp').value = '';
      afficherTableau(donnees);
    } catch (erreur) {
      dire(erreur.statut ? erreur.message
        : 'Serveur injoignable. Vérifiez votre connexion et réessayez.', true);
    } finally {
      valider.disabled = false;
      valider.textContent = libelle;
    }
  });

  document.getElementById('compte-deconnexion').addEventListener('click',
    async function (e) {
      e.preventDefault();
      var courant = jeton();
      rangerJeton('');
      if (courant) { try { await api('/deconnexion', { methode: 'POST', jeton: courant }); } catch (x) {} }
      tableau.hidden = true;
      connexion.hidden = false;
    });

  // --- Retour de Google ----------------------------------------------
  //
  // Le service renvoie ici avec un code a usage unique dans le fragment.
  // Le fragment, et non la requete : il n'est jamais transmis au serveur
  // ni au site suivant par l'en-tete « referer ». On l'efface de l'adresse
  // des qu'il est consomme, pour qu'il ne traine pas dans l'historique.

  var EXPLICATIONS = {
    annule: 'Connexion Google annulée.',
    etat: 'La connexion a expiré ou a été ouverte depuis un autre '
      + 'navigateur. Réessayez.',
    refus: 'Google n’a pas confirmé votre identité. Réessayez, ou '
      + 'connectez-vous avec un mot de passe.',
    indisponible: 'La connexion Google n’est pas encore disponible.'
  };

  function lireFragment() {
    var brut = (window.location.hash || '').replace(/^#/, '');
    if (!brut) return null;
    var champs = {};
    brut.split('&').forEach(function (paire) {
      var i = paire.indexOf('=');
      if (i > 0) {
        try {
          champs[paire.slice(0, i)] = decodeURIComponent(paire.slice(i + 1));
        } catch (e) { /* fragment abime : on l'ignore */ }
      }
    });
    return champs;
  }

  function nettoyerAdresse() {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      window.location.hash = '';
    }
  }

  async function retourDeGoogle(champs) {
    if (champs.google) {
      nettoyerAdresse();
      dire(EXPLICATIONS[champs.google] || 'La connexion Google a échoué.', true);
      return true;
    }
    if (!champs.connexion) return false;

    nettoyerAdresse();
    dire('Connexion en cours…', false);
    try {
      var donnees = await api('/google/echange', {
        corps: { code: champs.connexion, origine: champs.origine || 'site' }
      });
      rangerJeton(donnees.jeton);
      dire('');
      afficherTableau(donnees);
    } catch (erreur) {
      dire(erreur.statut ? erreur.message
        : 'Serveur injoignable. Réessayez.', true);
    }
    return true;
  }

  // Le bouton Google n'apparait que si le service sait le traiter : la
  // page est statique et ne peut pas le deviner seule. Mieux vaut pas de
  // bouton qu'un bouton qui ne mene nulle part.
  function proposerGoogle() {
    var bloc = document.getElementById('compte-google');
    if (!bloc) return;
    fetch('/api/capacites', { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.google) bloc.hidden = false; })
      .catch(function () { /* on laisse le formulaire seul */ });
  }

  (async function demarrer() {
    var champs = lireFragment();
    if (champs && await retourDeGoogle(champs)) { proposerGoogle(); return; }
    proposerGoogle();
    charger();
  })();
})();
