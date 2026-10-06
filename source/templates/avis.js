// Mise en avant tournante des avis.
//
// Une carte a la fois est soulevee et soulignee, toutes les 4,5 s, pour que
// l'oeil aille de l'une a l'autre au lieu de survoler trois blocs identiques.
// C'est purement visuel : le texte ne bouge pas, rien n'est masque.
//
// Elle s'arrete des que la souris est sur une carte (la carte survolee prend
// la main), quand la section sort de l'ecran, et quand l'onglet n'est plus
// affiche. Avec « mouvement reduit », elle ne demarre jamais : seul le survol
// agit alors.
(function () {
  var grille = document.querySelector('.avis-grille');
  if (!grille) return;
  var cartes = [].slice.call(grille.querySelectorAll('.avis'));
  if (cartes.length < 2) return;

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (doux || !('IntersectionObserver' in window)) return;

  var courant = -1;
  var minuteur = null;
  var survol = false;
  var visible = false;

  function activer(rang) {
    cartes.forEach(function (carte, k) {
      carte.classList.toggle('actif', k === rang);
    });
    courant = rang;
  }

  function suivant() {
    if (survol || !visible) return;
    activer((courant + 1) % cartes.length);
  }

  function demarrer() {
    if (minuteur) return;
    if (courant < 0) activer(0);
    minuteur = window.setInterval(suivant, 4500);
  }

  function arreter() {
    window.clearInterval(minuteur);
    minuteur = null;
  }

  new IntersectionObserver(function (entrees) {
    visible = entrees[0].isIntersecting;
    if (visible) demarrer(); else arreter();
  }, { threshold: 0.35 }).observe(grille);

  cartes.forEach(function (carte, k) {
    carte.addEventListener('mouseenter', function () { survol = true; activer(k); });
    carte.addEventListener('mouseleave', function () { survol = false; });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) arreter();
    else if (visible) demarrer();
  });
})();
