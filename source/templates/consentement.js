// Consentement aux cookies, preferences et mesure d'audience
// ===========================================================
//
// Le seul cookie du site est « pc_consent » : il garde le choix du visiteur six
// mois. Il est necessaire au bandeau lui-meme, donc exempte de consentement.
//
// Valeur : « v2.m1.p1 » (mesure acceptee, preferences acceptees ; 0 si
// refuse). Refuser est aussi simple qu'accepter : trois boutons de meme poids.
//
//  - La mesure d'audience Cloudflare n'est chargee que si elle est acceptee.
//  - Les preferences (filiere, filtres du blog, derniere lecture) sont rangees
//    en localStorage si elles sont acceptees ; sinon en sessionStorage, donc
//    seulement le temps de l'onglet, rien ne persiste.
(function () {
  var NOM = 'pc_consent';
  var DUREE = 60 * 60 * 24 * 183;   // six mois, en secondes
  var JETON = '__JETON__';
  var CLE_PREFS = 'pc-prefs';

  function lire() {
    var m = document.cookie.match(new RegExp('(?:^|; )' + NOM + '=v2\\.m([01])\\.p([01])'));
    return m ? { m: m[1] === '1', p: m[2] === '1' } : null;
  }
  function ecrire(mesure, prefs) {
    var securise = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = NOM + '=v2.m' + (mesure ? 1 : 0) + '.p' + (prefs ? 1 : 0) +
      '; Max-Age=' + DUREE + '; Path=/; SameSite=Lax' + securise;
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

  // ---- Preferences -------------------------------------------------------
  function depot() {
    var c = lire();
    return c && c.p ? localStorage : sessionStorage;
  }
  function toutes() {
    try { return JSON.parse(depot().getItem(CLE_PREFS) || '{}') || {}; } catch (e) { return {}; }
  }
  window.pcPrefs = {
    get: function (cle) { return toutes()[cle]; },
    set: function (cle, valeur) {
      try {
        var o = toutes();
        o[cle] = valeur;
        depot().setItem(CLE_PREFS, JSON.stringify(o));
      } catch (e) { /* stockage indisponible */ }
    },
  };
  // Acceptation : les choix faits pendant l'onglet passent en stockage durable.
  function migrer_vers_local() {
    try {
      var brut = sessionStorage.getItem(CLE_PREFS);
      if (brut) {
        var l = JSON.parse(localStorage.getItem(CLE_PREFS) || '{}');
        var s = JSON.parse(brut);
        for (var k in s) if (!(k in l)) l[k] = s[k];
        localStorage.setItem(CLE_PREFS, JSON.stringify(l));
        sessionStorage.removeItem(CLE_PREFS);
      }
    } catch (e) { }
  }
  function effacer_prefs() {
    try { localStorage.removeItem(CLE_PREFS); } catch (e) { }
  }

  // ---- Bandeau -----------------------------------------------------------
  var boite = null;
  function fermer() { if (boite) { boite.remove(); boite = null; } }

  function choisir(mesure, prefs) {
    var avant = lire();
    ecrire(mesure, prefs);
    fermer();
    if (prefs) migrer_vers_local(); else effacer_prefs();
    if (mesure) charger_mesure();
    // Retirer un accord deja donne : on recharge pour que la balise ou les
    // choix affiches disparaissent vraiment.
    if (avant && ((avant.m && !mesure) || (avant.p && !prefs))) location.reload();
    else appliquer();
  }

  function ouvrir(detail) {
    fermer();
    var actuel = lire() || { m: false, p: false };
    boite = document.createElement('div');
    boite.className = 'pc-cookies';
    boite.setAttribute('role', 'dialog');
    boite.setAttribute('aria-label', 'Choix sur les cookies');
    boite.innerHTML =
      '<p class="pc-titre">Vos choix sur les cookies</p>' +
      '<p class="pc-texte"><span class="pc-court">Un seul cookie nécessaire ; préférences et ' +
      'mesure d’audience facultatives.</span>' +
      '<span class="pc-long">PrépaCards dépose un seul cookie nécessaire : le souvenir de ce choix. ' +
      'Les préférences (votre filière, vos filtres, votre dernière lecture) et la mesure ' +
      'd’audience sont facultatives.</span> <a href="/cookies/">En savoir plus</a></p>' +
      '<div class="pc-detail"' + (detail ? '' : ' hidden') + '>' +
      '<label class="pc-ligne"><input type="checkbox" checked disabled> ' +
      '<span><strong>Nécessaires</strong> : mémoriser ce choix. Toujours actifs.</span></label>' +
      '<label class="pc-ligne"><input type="checkbox" id="pc-prefs-case"' + (actuel.p ? ' checked' : '') + '> ' +
      '<span><strong>Préférences</strong> : retenir votre filière, vos filtres du blog ' +
      'et le dernier article lu, sur cet appareil uniquement.</span></label>' +
      '<label class="pc-ligne"><input type="checkbox" id="pc-mesure-case"' + (actuel.m ? ' checked' : '') + '> ' +
      '<span><strong>Mesure d’audience</strong> : Cloudflare Web Analytics, ' +
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
      if (a === 'non') choisir(false, false);
      else if (a === 'oui') choisir(true, true);
      else if (boite.querySelector('.pc-detail').hidden) {
        boite.querySelector('.pc-detail').hidden = false;
        b.textContent = 'Enregistrer mon choix';
      } else {
        choisir(boite.querySelector('#pc-mesure-case').checked,
                boite.querySelector('#pc-prefs-case').checked);
      }
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

  // ---- Fonctions qui s'appuient sur les preferences ----------------------
  var FILIERES = ['commerciale', 'scientifique', 'litteraire'];

  // « Votre filiere » : accueil. Le bloc n'existe que s'il est ecrit dans la
  // page ; il reste cache sans JavaScript.
  function pour_vous() {
    var zone = document.getElementById('pour-vous');
    if (!zone) return;
    var f = window.pcPrefs.get('filiere');
    if (FILIERES.indexOf(f) === -1) f = null;
    zone.hidden = false;
    [].forEach.call(zone.querySelectorAll('[data-filiere]'), function (b) {
      var actif = b.getAttribute('data-filiere') === f;
      b.classList.toggle('actif', actif);
      b.setAttribute('aria-pressed', actif ? 'true' : 'false');
    });
    [].forEach.call(zone.querySelectorAll('[data-filiere-bloc]'), function (d) {
      d.hidden = d.getAttribute('data-filiere-bloc') !== f;
    });
    var invite = document.getElementById('pour-vous-invite');
    if (invite) invite.hidden = !!f;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('#pour-vous [data-filiere]');
    if (!b) return;
    var f = b.getAttribute('data-filiere');
    window.pcPrefs.set('filiere', window.pcPrefs.get('filiere') === f ? null : f);
    pour_vous();
  });

  // « Reprendre » : le dernier article lu, sur l'accueil et le blog.
  function reprendre() {
    var l = window.pcPrefs.get('lu');
    [].forEach.call(document.querySelectorAll('.reprendre'), function (z) {
      if (!l || !l.u || !l.t || l.u === location.pathname) { z.hidden = true; return; }
      z.textContent = '';
      z.appendChild(document.createTextNode('Reprendre votre lecture : '));
      var a = document.createElement('a');
      a.href = l.u;
      a.textContent = l.t;
      z.appendChild(a);
      z.hidden = false;
    });
  }
  function noter_lecture() {
    var h1 = document.querySelector('article.article h1');
    if (!h1 || !/^\/blog\/[^/]+\/$/.test(location.pathname)) return;
    window.pcPrefs.set('lu', { u: location.pathname, t: h1.textContent.trim() });
  }

  function appliquer() { pour_vous(); reprendre(); }

  var choix = lire();
  if (choix && choix.m) charger_mesure();
  if (!choix) ouvrir(false);
  appliquer();
  noter_lecture();
})();
