// Consentement aux cookies et a la mesure d'audience
// ===================================================
//
// Le seul cookie du site est celui-ci : « pc_consent », qui garde le choix du
// visiteur six mois. Il est necessaire au bandeau lui-meme (sans lui, on
// redemanderait a chaque page), donc exempte de consentement.
//
// Valeur : « v1.m1 » (mesure acceptee) ou « v1.m0 » (refusee). La mesure
// d'audience Cloudflare n'est chargee QUE si elle est acceptee. Refuser est
// aussi simple qu'accepter : deux boutons de meme poids, sur le premier ecran.
(function () {
  var NOM = 'pc_consent';
  var DUREE = 60 * 60 * 24 * 183;   // six mois, en secondes
  var JETON = '__JETON__';

  function lire() {
    var m = document.cookie.match(new RegExp('(?:^|; )' + NOM + '=v1\.m([01])'));
    return m ? m[1] === '1' : null;
  }
  function ecrire(mesure) {
    var securise = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = NOM + '=v1.m' + (mesure ? 1 : 0) + '; Max-Age=' + DUREE +
      '; Path=/; SameSite=Lax' + securise;
  }
  function charger_mesure() {
    if (!JETON || document.getElementById('pc-mesure')) return;
    var s = document.createElement('script');
    s.id = 'pc-mesure';
    s.type = 'module';
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: JETON }));
    document.head.appendChild(s);
  }

  var boite = null;
  function fermer() { if (boite) { boite.remove(); boite = null; } }

  function choisir(mesure) {
    var avant = lire();
    ecrire(mesure);
    fermer();
    if (mesure) charger_mesure();
    // Retirer son accord apres coup : la balise deja chargee ne se decharge
    // pas, on recharge la page pour qu'elle disparaisse vraiment.
    if (!mesure && avant === true) location.reload();
  }

  function ouvrir(detail) {
    fermer();
    var actuel = lire();
    boite = document.createElement('div');
    boite.className = 'pc-cookies';
    boite.setAttribute('role', 'dialog');
    boite.setAttribute('aria-label', 'Choix sur les cookies');
    boite.innerHTML =
      '<p class="pc-titre">Vos choix sur les cookies</p>' +
      '<p>PrépaCards dépose un seul cookie nécessaire : le souvenir de ce choix. ' +
      'La mesure d\u2019audience, facultative, compte les pages vues sans vous identifier. ' +
      '<a href="/cookies/">En savoir plus</a></p>' +
      '<div class="pc-detail"' + (detail ? '' : ' hidden') + '>' +
      '<label class="pc-ligne"><input type="checkbox" checked disabled> ' +
      '<span><strong>Nécessaires</strong> : mémoriser ce choix. Toujours actifs.</span></label>' +
      '<label class="pc-ligne"><input type="checkbox" id="pc-mesure-case"' +
      (actuel ? ' checked' : '') + '> ' +
      '<span><strong>Mesure d\u2019audience</strong> : Cloudflare Web Analytics, ' +
      'sans cookie ni identifiant.</span></label>' +
      '</div>' +
      '<div class="pc-actions">' +
      '<button type="button" class="pc-btn" data-pc="non">Tout refuser</button>' +
      '<button type="button" class="pc-btn" data-pc="oui">Tout accepter</button>' +
      '<button type="button" class="pc-btn" data-pc="perso">' +
      (detail ? 'Enregistrer mon choix' : 'Personnaliser') + '</button>' +
      '</div>';
    document.body.appendChild(boite);
    boite.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pc]');
      if (!b) return;
      var a = b.getAttribute('data-pc');
      if (a === 'non') choisir(false);
      else if (a === 'oui') choisir(true);
      else if (boite.querySelector('.pc-detail').hidden) {
        boite.querySelector('.pc-detail').hidden = false;
        b.textContent = 'Enregistrer mon choix';
      } else choisir(boite.querySelector('#pc-mesure-case').checked);
    });
    var premier = boite.querySelector('[data-pc="non"]');
    if (premier) premier.focus();
  }

  document.addEventListener('click', function (e) {
    var l = e.target.closest('[data-pc-cookies]');
    if (!l) return;
    e.preventDefault();
    ouvrir(true);
  });

  var choix = lire();
  if (choix === true) charger_mesure();
  else if (choix === null) ouvrir(false);
})();
