// Rattacher le paiement au bon compte
// ====================================
//
// Sans ce script, le seul lien entre un paiement et un compte est l'adresse
// e-mail saisie chez Stripe. Payer avec celle de sa carte, ou celle de ses
// parents, laissait l'abonnement sans destinataire — et rien ne le
// signalait : l'argent partait, l'application restait bridee.
//
// On glisse donc dans le lien de paiement la reference du compte. Stripe la
// rend telle quelle au webhook (client_reference_id), qui credite ce compte
// quelle que soit l'adresse utilisee.
//
// Elle vient de deux endroits, dans cet ordre :
//
//   1. La session ouverte dans ce navigateur. C'est la plus sure : on peut
//      afficher l'adresse du compte, donc la personne verifie elle-meme.
//   2. Le parametre « ref » de l'adresse, que l'application ajoute quand
//      elle ouvre cette page. Le navigateur n'a alors aucune session, et
//      sans lui l'eleve devrait payer avec l'adresse exacte de son compte.
//
// Cette reference n'est pas un secret : elle voyage dans une adresse web,
// donc dans l'historique du navigateur. La connaitre permet au mieux
// d'OFFRIR un abonnement a ce compte en payant pour lui.
//
// Sans reference du tout, les liens ne sont pas touches : le rattachement
// se fera par l'adresse, comme avant.

(function () {
  var SUPABASE_URL = 'https://ojnntqfafinxrousdvbn.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbm50cWZhZmlueHJvdXNkdmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MzY4MTQsImV4cCI6MjEwNjExMjgxNH0.HFLJDmu8UwU8bz6WbE91HmVb8uljIGI-G1rVEZ3YIeY';

  var liens = Array.prototype.slice.call(
    document.querySelectorAll('a[href*="buy.stripe.com"]'));
  if (!liens.length) return;

  function marquer(reference, email) {
    if (!reference) return;
    liens.forEach(function (lien) {
      var url;
      try { url = new URL(lien.href); } catch (e) { return; }
      url.searchParams.set('client_reference_id', reference);
      // Pre-remplir l'adresse fait gagner une saisie sans rien imposer :
      // Stripe la laisse modifiable, et le rattachement n'en depend plus.
      if (email) url.searchParams.set('prefilled_email', email);
      lien.href = url.toString();
    });

    // Le dire, plutot que de le faire en silence : quelqu'un qui paie veut
    // savoir quel compte sera credite, surtout s'il s'apprete a saisir une
    // autre adresse que la sienne.
    var encart = document.getElementById('liste-attente');
    if (!encart || document.getElementById('paiement-compte')) return;
    var ligne = document.createElement('p');
    ligne.id = 'paiement-compte';
    if (email) {
      ligne.innerHTML = '<strong>Vous êtes connecté.</strong> Le paiement '
        + 'sera rattaché au compte <strong class="compte-vise"></strong>, '
        + 'quelle que soit l’adresse utilisée chez Stripe.';
      ligne.querySelector('.compte-vise').textContent = email;
    } else {
      ligne.innerHTML = '<strong>Le paiement rejoindra votre compte '
        + 'PrépaCards</strong>, quelle que soit l’adresse utilisée chez '
        + 'Stripe.';
    }
    encart.insertBefore(ligne, encart.firstChild);
  }

  function referenceDeLAdresse() {
    try {
      var valeur = new URL(window.location.href).searchParams.get('ref') || '';
      // On n'accepte que la forme attendue : cette valeur finit dans une
      // adresse envoyee a Stripe, et n'a aucune raison de contenir autre
      // chose que ce que le service fabrique.
      return /^pc_[A-Za-z0-9_-]{1,64}$/.test(valeur) ? valeur : '';
    } catch (e) { return ''; }
  }

  // --- La session ouverte dans ce navigateur -------------------------
  //
  // Supabase range sa session dans sessionStorage, sous une cle qui porte
  // l'identifiant du projet (« sb-<projet>-auth-token »). On la cherche par
  // sa FORME plutot que par son nom exact : la bibliotheque a deja change
  // de convention d'une version majeure a l'autre, et une cle en dur
  // casserait en silence — c'est exactement ce qui vient d'arriver.
  //
  // La version precedente lisait « prepacards_jeton », une cle de l'epoque
  // ou les comptes vivaient sur Cloudflare D1. Plus rien ne l'ecrivait
  // depuis le passage a Supabase : la condition echouait toujours, et un
  // eleve connecte SUR LE SITE payait sans que son abonnement rejoigne son
  // compte.
  function sessionSupabase() {
    try {
      var depots = [sessionStorage, localStorage];
      for (var d = 0; d < depots.length; d++) {
        for (var i = 0; i < depots[d].length; i++) {
          var cle = depots[d].key(i);
          if (!/^sb-.+-auth-token$/.test(cle)) continue;
          var brut = JSON.parse(depots[d].getItem(cle));
          if (brut && brut.access_token && brut.user && brut.user.id) return brut;
        }
      }
    } catch (e) { /* navigation privee, ou stockage refuse */ }
    return null;
  }

  var session = sessionSupabase();
  if (!session) { marquer(referenceDeLAdresse(), ''); return; }

  // La reference est lue directement dans la table des profils. Passer par
  // le worker demanderait d'y rouvrir une route, alors qu'il ne porte plus
  // que le webhook Stripe et la suppression de compte : la politique RLS de
  // Supabase fait deja le travail, chacun ne voyant que sa propre ligne.
  var adresse = SUPABASE_URL + '/rest/v1/profiles'
    + '?id=eq.' + encodeURIComponent(session.user.id)
    + '&select=reference';

  fetch(adresse, {
    headers: {
      accept: 'application/json',
      apikey: SUPABASE_ANON_KEY,
      authorization: 'Bearer ' + session.access_token,
    },
  }).then(function (r) {
    return r.ok ? r.json() : null;
  }).then(function (lignes) {
    var profil = lignes && lignes.length ? lignes[0] : null;
    if (profil && profil.reference) {
      marquer(profil.reference, session.user.email || '');
    } else {
      marquer(referenceDeLAdresse(), '');
    }
  }).catch(function () {
    // Service muet ou jeton perime : on retombe sur l'adresse, et sinon on
    // laisse les liens intacts plutot que d'empecher de payer.
    marquer(referenceDeLAdresse(), '');
  });
})();
