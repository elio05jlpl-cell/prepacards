// Formulaire de contact
// =====================
//
// Envoie le message au Worker (POST /api/contact). Si une cle de site
// Cloudflare Turnstile est renseignee ci-dessous, un controle anti-robot est
// affiche et son jeton joint a la demande ; le Worker le verifie des qu'il
// possede TURNSTILE_SECRET. Sans cle ici, le formulaire reste protege par le
// champ piege et le quota par adresse IP.

(function () {
  var zone = document.getElementById('contact-app');
  if (!zone) return;

  // Cle de SITE Turnstile (publique par conception). A renseigner apres avoir
  // cree le widget dans Cloudflare : Turnstile > Ajouter un widget.
  var CLE_SITE_TURNSTILE = '';

  var form = document.getElementById('contact-form');
  var email = document.getElementById('contact-email');
  var nom = document.getElementById('contact-nom');
  var sujet = document.getElementById('contact-sujet');
  var texte = document.getElementById('contact-message');
  var piege = document.getElementById('contact-piege');
  var etat = document.getElementById('contact-message-etat');
  var bouton = document.getElementById('contact-valider');
  var jeton = '';

  function dire(message, erreur) {
    etat.textContent = message || '';
    etat.hidden = !message;
    etat.className = 'compte-message' + (erreur ? ' erreur' : '');
  }

  if (CLE_SITE_TURNSTILE) {
    window.surTurnstile = function (j) { jeton = j; };
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = function () {
      if (window.turnstile) {
        window.turnstile.render('#contact-turnstile', {
          sitekey: CLE_SITE_TURNSTILE,
          callback: window.surTurnstile,
          'expired-callback': function () { jeton = ''; },
        });
      }
    };
    document.head.appendChild(s);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var adresse = email.value.trim();
    var message = texte.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(adresse)) {
      dire('Entrez une adresse e-mail valide.', true);
      email.focus();
      return;
    }
    if (message.length < 10) {
      dire('Votre message est trop court.', true);
      texte.focus();
      return;
    }
    if (CLE_SITE_TURNSTILE && !jeton) {
      dire('Validez d’abord la vérification anti-robot.', true);
      return;
    }

    bouton.disabled = true;
    var libelle = bouton.textContent;
    bouton.textContent = 'Envoi…';
    dire('');
    try {
      var reponse = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: adresse, nom: nom.value.trim(), sujet: sujet.value,
          message: message, site_web: piege.value, jeton: jeton,
        }),
      });
      var corps = await reponse.json().catch(function () { return {}; });
      if (!reponse.ok) throw new Error(corps.erreur || 'Envoi impossible. Réessayez dans un instant.');
      form.reset();
      jeton = '';
      if (window.turnstile) { try { window.turnstile.reset(); } catch (x) { /* rien */ } }
      dire('Merci, votre message est parti. Nous vous répondons par e-mail.', false);
    } catch (erreur) {
      dire(erreur.message || 'Envoi impossible. Réessayez dans un instant.', true);
    } finally {
      bouton.disabled = false;
      bouton.textContent = libelle;
    }
  });
})();
