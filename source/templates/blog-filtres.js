// Recherche, tri et filtres de la bibliotheque du blog. Tout se passe cote
// client : les articles sont deja tous dans le HTML (le site est statique),
// ce script se contente de les trier et d'en masquer certains.
(function () {
  var liste = document.getElementById('liste-articles');
  if (!liste) return;

  var cartes = [].slice.call(liste.children);
  var champRecherche = document.getElementById('recherche-articles');
  var champTri = document.getElementById('tri-articles');
  var aucunResultat = document.getElementById('aucun-resultat');
  var radiosFiliere = [].slice.call(document.querySelectorAll('input[name="filiere"]'));
  var radiosMatiere = [].slice.call(document.querySelectorAll('input[name="matiere"]'));

  function normaliser(texte) {
    // Insensible aux accents : "generale" doit retrouver "générale".
    return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function valeurCochee(radios) {
    var actif = radios.filter(function (r) { return r.checked; })[0];
    return actif ? actif.value : 'toutes';
  }

  function appliquer() {
    var recherche = normaliser(champRecherche.value.trim());
    var filiere = valeurCochee(radiosFiliere);
    var matiere = valeurCochee(radiosMatiere);
    var visibles = 0;

    cartes.forEach(function (carte) {
      var titre = normaliser(carte.getAttribute('data-titre') || '');
      var okRecherche = !recherche || titre.indexOf(recherche) !== -1;
      var okFiliere = filiere === 'toutes' ||
        (carte.getAttribute('data-filiere') || '').split(' ').indexOf(filiere) !== -1;
      var okMatiere = matiere === 'toutes' ||
        (carte.getAttribute('data-matiere') || '').split(' ').indexOf(matiere) !== -1;
      var visible = okRecherche && okFiliere && okMatiere;
      carte.classList.toggle('masque', !visible);
      if (visible) visibles += 1;
    });

    if (aucunResultat) aucunResultat.hidden = visibles > 0;
  }

  function trier() {
    var mode = champTri.value;
    var triees = cartes.slice().sort(function (a, b) {
      if (mode === 'az' || mode === 'za') {
        var ta = a.getAttribute('data-titre') || '';
        var tb = b.getAttribute('data-titre') || '';
        return mode === 'az' ? ta.localeCompare(tb, 'fr') : tb.localeCompare(ta, 'fr');
      }
      var da = a.getAttribute('data-date') || '';
      var db = b.getAttribute('data-date') || '';
      return mode === 'ancien' ? da.localeCompare(db) : db.localeCompare(da);
    });
    triees.forEach(function (carte) { liste.appendChild(carte); });
  }

  champRecherche.addEventListener('input', appliquer);
  champTri.addEventListener('change', trier);
  radiosFiliere.concat(radiosMatiere).forEach(function (r) {
    r.addEventListener('change', appliquer);
  });

  champTri.value = 'recent';
})();
