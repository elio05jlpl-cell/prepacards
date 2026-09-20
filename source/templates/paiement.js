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

  var jeton = '';
  try { jeton = sessionStorage.getItem('prepacards_jeton') || ''; } catch (e) { }

  if (!jeton) { marquer(referenceDeLAdresse(), ''); return; }

  fetch('/api/abonnement', {
    headers: { accept: 'application/json', authorization: 'Bearer ' + jeton },
  }).then(function (r) {
    return r.ok ? r.json() : null;
  }).then(function (donnees) {
    if (donnees && donnees.reference) marquer(donnees.reference, donnees.email);
    else marquer(referenceDeLAdresse(), '');
  }).catch(function () {
    // Service muet : on retombe sur l'adresse, et sinon on laisse les liens
    // intacts plutot que d'empecher de payer.
    marquer(referenceDeLAdresse(), '');
  });
})();
