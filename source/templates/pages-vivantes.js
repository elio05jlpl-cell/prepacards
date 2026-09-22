// Ce qui rend une page de contenu vivante : apparition des blocs au
// defilement, barre de progression de lecture, et sommaire lateral dont
// l'entree courante s'allume.
//
// Rien de tout cela n'est indispensable a la lecture : si le script
// echoue, la page reste complete et lisible. C'est pour cela que les
// regles d'apparition sont derriere html.js, pose par le script principal.
(function () {
  var feuille = document.querySelector('.feuille-texte');
  if (!feuille) return;

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Apparition des blocs -----------------------------------------
  var blocs = [].slice.call(feuille.children).filter(function (e) {
    return /^(H2|H3|P|UL|OL|TABLE|DIV)$/.test(e.tagName);
  });

  if (doux || !('IntersectionObserver' in window)) {
    blocs.forEach(function (e) { e.classList.add('vue'); });
  } else {
    var apparition = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('vue');
        apparition.unobserve(entree.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.02 });
    blocs.forEach(function (e) { apparition.observe(e); });

    // Ce qui est deja visible au chargement ne doit pas attendre un
    // defilement : sans cela, le haut de la page reste vide tant qu'on
    // n'a pas touche a la molette.
    window.setTimeout(function () {
      blocs.forEach(function (e) {
        var r = e.getBoundingClientRect();
        if (r.top < window.innerHeight) e.classList.add('vue');
      });
    }, 60);
  }

  if (doux) return;

  // --- Barre de progression ------------------------------------------
  var barre = document.createElement('div');
  barre.className = 'progression-lecture';
  document.body.appendChild(barre);

  // --- Sommaire lateral ----------------------------------------------
  //
  // Les articles de blog posent deja leur propre sommaire, cote serveur,
  // dans la colonne laterale (.sommaire-liste, dans templates/article.html).
  // On evite alors d'en construire un second flottant : on reutilise ses
  // liens tels quels pour l'entree active. Ailleurs (mentions legales,
  // pages de texte), on garde le sommaire flottant genere ici.
  var titres = [].slice.call(feuille.querySelectorAll('h2'));
  var liens = [];
  var listeExistante = document.querySelector('.sommaire-liste');

  if (listeExistante) {
    liens = [].slice.call(listeExistante.querySelectorAll('a'));
  } else if (titres.length >= 3) {
    var nav = document.createElement('nav');
    nav.className = 'sommaire-page';
    nav.setAttribute('aria-label', 'Sommaire de la page');
    var liste = document.createElement('ol');

    titres.forEach(function (titre, rang) {
      if (!titre.id) {
        titre.id = 'section-' + (rang + 1);
      }
      var item = document.createElement('li');
      var lien = document.createElement('a');
      lien.href = '#' + titre.id;
      lien.textContent = titre.textContent;
      item.appendChild(lien);
      liste.appendChild(item);
      liens.push(lien);
    });

    nav.appendChild(liste);
    document.body.appendChild(nav);
  }

  // --- Mise a jour, une seule fois par image ------------------------
  //
  // Le defilement declenche bien plus souvent que l'ecran ne se rafraichit.
  // On se contente donc de noter qu'il faut recalculer, et le calcul a lieu
  // au prochain rendu : la page reste fluide meme sur une machine lente.
  var enAttente = false;

  function majEtat() {
    enAttente = false;

    var hauteur = document.documentElement.scrollHeight - window.innerHeight;
    var part = hauteur > 0 ? window.scrollY / hauteur : 0;
    barre.style.transform = 'scaleX(' + Math.min(1, Math.max(0, part)) + ')';

    if (!liens.length) return;
    // Le titre courant est le dernier passe au-dessus du tiers superieur
    // de la fenetre : c'est la zone que l'oeil lit reellement.
    var repere = window.innerHeight / 3;
    var actif = 0;
    for (var i = 0; i < titres.length; i++) {
      if (titres[i].getBoundingClientRect().top <= repere) actif = i;
    }
    liens.forEach(function (l, i) {
      l.classList.toggle('actif', i === actif);
    });
  }

  function demander() {
    if (enAttente) return;
    enAttente = true;
    window.requestAnimationFrame(majEtat);
  }

  window.addEventListener('scroll', demander, { passive: true });
  window.addEventListener('resize', demander, { passive: true });
  majEtat();
})();
