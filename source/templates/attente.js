// Liste d'attente : Mac, iPhone, Android
// ======================================
//
// Envoie l'adresse et les systemes coches au Worker (POST /api/attente).
// La reponse est la meme que l'adresse soit nouvelle ou deja inscrite : la
// page ne doit pas permettre de savoir qui est dans la liste.

(function () {
  var zone = document.getElementById('attente-app');
  if (!zone) return;

  var form = document.getElementById('attente-form');
  var email = document.getElementById('attente-email');
  var piege = document.getElementById('attente-piege');
  var message = document.getElementById('attente-message');
  var bouton = document.getElementById('attente-valider');

  function dire(texte, erreur) {
    message.textContent = texte || '';
    message.hidden = !texte;
    message.className = 'compte-message' + (erreur ? ' erreur' : '');
  }

  function plateformes() {
    return [].slice.call(form.querySelectorAll('input[name="plateformes"]:checked'))
      .map(function (c) { return c.value; });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var adresse = email.value.trim();
    var choix = plateformes();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(adresse)) {
      dire('Entrez une adresse e-mail valide.', true);
      email.focus();
      return;
    }
    if (!choix.length) { dire('Cochez au moins un système.', true); return; }

    bouton.disabled = true;
    var libelle = bouton.textContent;
    bouton.textContent = 'Un instant…';
    dire('');
    try {
      var reponse = await fetch('/api/attente', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: adresse, plateformes: choix, site_web: piege.value }),
      });
      var corps = await reponse.json().catch(function () { return {}; });
      if (!reponse.ok) throw new Error(corps.erreur || 'Inscription impossible.');
      form.reset();
      dire('C’est noté. Nous vous écrirons une seule fois, à la sortie de la version attendue.', false);
    } catch (erreur) {
      dire(erreur.message || 'Inscription impossible. Réessayez dans un instant.', true);
    } finally {
      bouton.disabled = false;
      bouton.textContent = libelle;
    }
  });
})();
