// Les ficelles : des etiquettes qu'on attrape et qu'on tire, reliees entre
// elles par des fils qui se tendent et se detendent.
//
// Regles du jeu :
//   - une etiquette ne traverse jamais une autre : elle s'arrete contre elle,
//     et elle reste dans la zone ;
//   - les fils sont tendus quand la distance depasse leur longueur au repos,
//     et font un pli (qui retombe vers le bas) quand les extremites se
//     rapprochent ; au lacher, le pli oscille brievement puis se stabilise ;
//   - au clavier, les fleches deplacent l'etiquette qui a le focus.
//
// Rien ne tourne en continu : on ne redessine que pendant un deplacement ou
// pendant les quelques centaines de millisecondes d'oscillation qui suivent.
//
// Sur ecran tactile on ne rend pas les etiquettes mobiles : les saisir
// bloquerait le defilement de la page, et il y en a assez pour couvrir la
// largeur d'un telephone. Elles restent en rangees, fils dessines.
(function () {
  var zone = document.querySelector('.ficelles-zone');
  if (!zone) return;

  var titre = document.querySelector('.ficelles-titre');
  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tactile = window.matchMedia('(pointer: coarse)').matches;

  // Le surlignage du debut du titre se deploie a l'arrivee de la section.
  if (titre) {
    if (doux || !('IntersectionObserver' in window)) {
      titre.classList.add('on');
    } else {
      var vigie = new IntersectionObserver(function (entrees) {
        if (entrees[0].isIntersecting) {
          titre.classList.add('on');
          vigie.disconnect();
        }
      }, { threshold: 0.6 });
      vigie.observe(titre);
    }
  }

  var NS = 'http://www.w3.org/2000/svg';
  var svg = zone.querySelector('.ficelles-fils');
  var rangs = [].slice.call(zone.querySelectorAll('.ficelles-rang'));
  var tags = [].slice.call(zone.querySelectorAll('.ficelle'));
  var ECART = 8;            // espace minimal entre deux etiquettes
  var etat = [];            // {el, x, y, w, h} par etiquette
  var fils = [];            // {a, pa, b, pb | fixe, repos, chemin, oscille}
  var largeur = 0, hauteur = 0;
  var dessin = false;       // un rafraichissement est deja programme
  var oscillation = false;  // la boucle d'oscillation tourne

  // ---- Mesure et construction ---------------------------------------------

  function mesurer() {
    zone.classList.remove('libre');
    tags.forEach(function (t) { t.style.transform = ''; });
    zone.style.height = '';
    var zr = zone.getBoundingClientRect();
    largeur = zr.width;
    hauteur = zr.height;
    etat = tags.map(function (t) {
      var r = t.getBoundingClientRect();
      return { el: t, x: r.left - zr.left, y: r.top - zr.top, w: r.width, h: r.height };
    });
    if (!tactile) {
      // On fige la hauteur AVANT de sortir les etiquettes du flux : sinon la
      // zone s'effondrerait.
      zone.style.height = hauteur + 'px';
      zone.classList.add('libre');
      etat.forEach(poser);
    }
    svg.setAttribute('viewBox', '0 0 ' + largeur + ' ' + hauteur);
    construireFils();
    dessiner();
  }

  function poser(s) {
    s.el.style.transform = 'translate3d(' + s.x + 'px,' + s.y + 'px,0)';
  }

  function port(i, cote) {
    var s = etat[i];
    if (cote === 'l') return { x: s.x, y: s.y + s.h / 2 };
    if (cote === 'r') return { x: s.x + s.w, y: s.y + s.h / 2 };
    if (cote === 't') return { x: s.x + s.w / 2, y: s.y };
    return { x: s.x + s.w / 2, y: s.y + s.h };
  }

  function distance(p, q) {
    return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y));
  }

  function ajouterFil(def) {
    var chemin = document.createElementNS(NS, 'path');
    svg.appendChild(chemin);
    def.chemin = chemin;
    def.oscille = null;
    var depart = extremite(def, 0);
    var arrivee = extremite(def, 1);
    // Un fil est un peu plus long que la distance de depart : il pend
    // legerement au repos, et se tend quand on tire.
    def.repos = distance(depart, arrivee) * 1.1 + 8;
    fils.push(def);
  }

  function extremite(f, bout) {
    if (bout === 0) return port(f.a, f.pa);
    return f.fixe ? f.fixe : port(f.b, f.pb);
  }

  function construireFils() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    fils = [];
    var indices = [];
    var n = 0;
    var zr = zone.getBoundingClientRect();
    var gauche = zr.left + 24;
    var droite = document.documentElement.clientWidth - zr.right + 24;
    rangs.forEach(function (rang) {
      var ligne = [];
      for (var k = 0; k < rang.children.length; k++) ligne.push(n++);
      indices.push(ligne);
    });

    indices.forEach(function (ligne, r) {
      // Dans la rangee : droite d'une etiquette vers gauche de la suivante.
      for (var k = 0; k + 1 < ligne.length; k++) {
        ajouterFil({ a: ligne[k], pa: 'r', b: ligne[k + 1], pb: 'l' });
      }
      // Vers les bords de la zone : la premiere et la derniere sont tenues.
      var premiere = ligne[0], derniere = ligne[ligne.length - 1];
      var yg = port(premiere, 'l').y + (r % 2 ? -34 : 30);
      var yd = port(derniere, 'r').y + (r % 2 ? 30 : -34);
      // Les fils filent jusqu'aux bords de la PAGE, pas seulement de la zone :
      // la section les rogne, ils paraissent venir de plus loin.
      ajouterFil({ a: premiere, pa: 'l', fixe: { x: -gauche, y: yg } });
      ajouterFil({ a: derniere, pa: 'r', fixe: { x: largeur + droite, y: yd } });
      // Vers la rangee du dessous : bas d'une etiquette, haut de la voisine.
      if (r + 1 < indices.length) {
        var suivante = indices[r + 1];
        ligne.forEach(function (i, k) {
          ajouterFil({ a: i, pa: 'b', b: suivante[Math.min(k, suivante.length - 1)], pb: 't' });
        });
      }
    });
  }

  // ---- Dessin --------------------------------------------------------------

  function dessiner() {
    dessin = false;
    var maintenant = performance.now();
    fils.forEach(function (f) {
      var p = extremite(f, 0), q = extremite(f, 1);
      var d = distance(p, q);
      // Le pli : proportionnel au mou, borne pour ne pas faire de boucle.
      var pli = Math.max(0, Math.min((f.repos - d) * 0.75, 70));
      if (f.oscille) {
        var t = (maintenant - f.oscille.debut) / 1000;
        var reste = f.oscille.amplitude * Math.exp(-t * 4.5) * Math.cos(t * 16);
        if (Math.abs(reste) < 0.25 && t > 0.2) f.oscille = null;
        else pli += reste;
      }
      var mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      // Les fils verticaux pendent de cote, les autres vers le bas.
      var vertical = Math.abs(p.x - q.x) < Math.abs(p.y - q.y);
      var cx = vertical ? mx + pli : mx;
      var cy = vertical ? my : my + pli * 2;
      f.chemin.setAttribute('d', 'M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1)
        + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1)
        + ' ' + q.x.toFixed(1) + ' ' + q.y.toFixed(1));
    });
  }

  function programmer() {
    if (dessin) return;
    dessin = true;
    window.requestAnimationFrame(dessiner);
  }

  function osciller(i, force) {
    if (doux) return;
    var debut = performance.now();
    fils.forEach(function (f) {
      if (f.a === i || f.b === i) {
        f.oscille = { debut: debut, amplitude: Math.min(18, force) };
      }
    });
    if (oscillation) return;
    oscillation = true;
    (function boucle() {
      dessiner();
      var encore = fils.some(function (f) { return f.oscille; });
      if (encore) window.requestAnimationFrame(boucle);
      else oscillation = false;
    })();
  }

  // ---- Deplacement avec collisions -----------------------------------------

  function chevauche(s, x, y, o) {
    return x < o.x + o.w + ECART && x + s.w + ECART > o.x
        && y < o.y + o.h + ECART && y + s.h + ECART > o.y;
  }

  function pas(i, axe, delta) {
    var s = etat[i];
    var x = s.x, y = s.y;
    if (axe === 'x') x += delta; else y += delta;
    x = Math.max(0, Math.min(largeur - s.w, x));
    y = Math.max(0, Math.min(hauteur - s.h, y));
    for (var k = 0; k < etat.length; k++) {
      if (k === i) continue;
      var o = etat[k];
      if (!chevauche(s, x, y, o)) continue;
      // On s'arrete contre l'etiquette rencontree, du cote d'ou l'on vient.
      if (axe === 'x') x = delta > 0 ? o.x - ECART - s.w : o.x + o.w + ECART;
      else y = delta > 0 ? o.y - ECART - s.h : o.y + o.h + ECART;
    }
    s.x = x; s.y = y;
  }

  function deplacer(i, cibleX, cibleY) {
    var s = etat[i];
    var dx = cibleX - s.x, dy = cibleY - s.y;
    // Par petits pas : un mouvement rapide ne doit pas « sauter » une voisine.
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
    for (var k = 0; k < n; k++) {
      pas(i, 'x', dx / n);
      pas(i, 'y', dy / n);
    }
    poser(s);
    programmer();
  }

  // ---- Souris et clavier ----------------------------------------------------

  function brancher() {
    tags.forEach(function (el, i) {
      var decalage = null;
      var dernier = null;

      el.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0) return;
        var zr = zone.getBoundingClientRect();
        decalage = { x: e.clientX - zr.left - etat[i].x, y: e.clientY - zr.top - etat[i].y };
        dernier = { t: performance.now(), x: e.clientX, y: e.clientY, v: 0 };
        el.setPointerCapture(e.pointerId);
        el.classList.add('saisie');
        e.preventDefault();
      });

      el.addEventListener('pointermove', function (e) {
        if (!decalage) return;
        var zr = zone.getBoundingClientRect();
        deplacer(i, e.clientX - zr.left - decalage.x, e.clientY - zr.top - decalage.y);
        var maintenant = performance.now();
        var dt = Math.max(1, maintenant - dernier.t);
        dernier.v = Math.sqrt(Math.pow(e.clientX - dernier.x, 2)
                            + Math.pow(e.clientY - dernier.y, 2)) / dt * 16;
        dernier.t = maintenant; dernier.x = e.clientX; dernier.y = e.clientY;
      });

      function lacher() {
        if (!decalage) return;
        decalage = null;
        el.classList.remove('saisie');
        osciller(i, 4 + (dernier ? dernier.v : 0));
      }
      el.addEventListener('pointerup', lacher);
      el.addEventListener('pointercancel', lacher);

      el.addEventListener('keydown', function (e) {
        var pas = e.shiftKey ? 40 : 14;
        var d = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0],
                  ArrowUp: [0, -pas], ArrowDown: [0, pas] }[e.key];
        if (!d) return;
        e.preventDefault();
        deplacer(i, etat[i].x + d[0], etat[i].y + d[1]);
        osciller(i, 6);
      });
    });
  }

  // ---- Demarrage ------------------------------------------------------------

  var pret = function () {
    mesurer();
    if (!tactile) brancher();
    var minuteur = null;
    var largeurVue = window.innerWidth;
    window.addEventListener('resize', function () {
      // Un changement de hauteur seul (barre d'adresse d'un mobile) ne doit
      // pas remettre les etiquettes a leur place.
      if (window.innerWidth === largeurVue) return;
      largeurVue = window.innerWidth;
      window.clearTimeout(minuteur);
      minuteur = window.setTimeout(mesurer, 150);
    });
  };

  // Les polices changent la taille des etiquettes : on mesure apres.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pret);
  else window.addEventListener('load', pret);
})();
