// Page Importer : onglets Anki / Quizlet
// =====================================
//
// Un seul parcours est affiche a la fois, celui de l'onglet choisi. Sans ce
// script, rien n'est cache : les deux parcours se suivent sur la page et les
// onglets eux-memes ne s'affichent pas (voir style.css).
//
// L'adresse peut preselectionner un onglet : /importer-anki-quizlet/#quizlet.

(function () {
  var zone = document.getElementById('import-onglets');
  if (!zone) return;

  var onglets = Array.prototype.slice.call(zone.querySelectorAll('[role="tab"]'));
  if (!onglets.length) return;

  function choisir(onglet, deplacerFocus) {
    onglets.forEach(function (o) {
      var actif = o === onglet;
      o.setAttribute('aria-selected', actif ? 'true' : 'false');
      o.tabIndex = actif ? 0 : -1;
      var panneau = document.getElementById(o.getAttribute('aria-controls'));
      if (panneau) panneau.hidden = !actif;
    });
    if (deplacerFocus) onglet.focus();
  }

  onglets.forEach(function (onglet, i) {
    onglet.addEventListener('click', function () { choisir(onglet, false); });
    // Fleches gauche / droite, comme pour tout groupe d'onglets.
    onglet.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      choisir(onglets[(i + d + onglets.length) % onglets.length], true);
    });
  });

  var depart = /quizlet/i.test(window.location.hash) ? onglets[1] : onglets[0];
  choisir(depart || onglets[0], false);
}());
