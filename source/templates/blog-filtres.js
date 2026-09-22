// Recherche, tri, filtres et pagination de la bibliotheque du blog. Tout se
// passe cote client : les articles sont deja tous dans le HTML (le site est
// statique), ce script se contente de les trier, d'en masquer certains et
// de n'en afficher qu'une page a la fois.
(function () {
  var liste = document.getElementById('liste-articles');
  if (!liste) return;

  var cartes = [].slice.call(liste.children);
  var champRecherche = document.getElementById('recherche-articles');
  var champTri = document.getElementById('tri-articles');
  var champTaille = document.getElementById('taille-page');
  var aucunResultat = document.getElementById('aucun-resultat');
  var pagesNav = document.getElementById('pagination-pages');
  var radiosFiliere = [].slice.call(document.querySelectorAll('input[name="filiere"]'));
  var radiosMatiere = [].slice.call(document.querySelectorAll('input[name="matiere"]'));

  var pageActuelle = 1;

  function normaliser(texte) {
    // Insensible aux accents : "generale" doit retrouver "générale".
    return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function valeurCochee(radios) {
    var actif = radios.filter(function (r) { return r.checked; })[0];
    return actif ? actif.value : 'toutes';
  }

  function correspond(carte) {
    var recherche = normaliser(champRecherche.value.trim());
    var filiere = valeurCochee(radiosFiliere);
    var matiere = valeurCochee(radiosMatiere);
    var titre = normaliser(carte.getAttribute('data-titre') || '');
    var okRecherche = !recherche || titre.indexOf(recherche) !== -1;
    var okFiliere = filiere === 'toutes' ||
      (carte.getAttribute('data-filiere') || '').split(' ').indexOf(filiere) !== -1;
    var okMatiere = matiere === 'toutes' ||
      (carte.getAttribute('data-matiere') || '').split(' ').indexOf(matiere) !== -1;
    return okRecherche && okFiliere && okMatiere;
  }

  function comparer(a, b) {
    var mode = champTri.value;
    if (mode === 'az' || mode === 'za') {
      var ta = a.getAttribute('data-titre') || '';
      var tb = b.getAttribute('data-titre') || '';
      return mode === 'az' ? ta.localeCompare(tb, 'fr') : tb.localeCompare(ta, 'fr');
    }
    var da = a.getAttribute('data-date') || '';
    var db = b.getAttribute('data-date') || '';
    return mode === 'ancien' ? da.localeCompare(db) : db.localeCompare(da);
  }

  function rendrePagination(nbPages) {
    pagesNav.innerHTML = '';
    if (nbPages <= 1) return;
    for (var i = 1; i <= nbPages; i++) {
      var bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'pagination-page' + (i === pageActuelle ? ' actif' : '');
      bouton.textContent = String(i);
      bouton.setAttribute('aria-current', i === pageActuelle ? 'page' : 'false');
      bouton.addEventListener('click', (function (n) {
        return function () {
          pageActuelle = n;
          actualiser(false);
          liste.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
      })(i));
      pagesNav.appendChild(bouton);
    }
  }

  function actualiser(reinitialiserPage) {
    if (reinitialiserPage) pageActuelle = 1;

    var correspondantes = cartes.filter(correspond).sort(comparer);
    var taille = parseInt(champTaille.value, 10) || 10;
    var nbPages = Math.max(1, Math.ceil(correspondantes.length / taille));
    if (pageActuelle > nbPages) pageActuelle = nbPages;

    var debut = (pageActuelle - 1) * taille;
    var visibles = correspondantes.slice(debut, debut + taille);

    // Remet les cartes retenues dans l'ordre du tri, puis n'affiche que la
    // page courante parmi elles.
    correspondantes.forEach(function (carte) { liste.appendChild(carte); });
    cartes.forEach(function (carte) {
      carte.classList.toggle('masque', visibles.indexOf(carte) === -1);
    });

    if (aucunResultat) aucunResultat.hidden = correspondantes.length > 0;
    rendrePagination(nbPages);
  }

  champRecherche.addEventListener('input', function () { actualiser(true); });
  champTri.addEventListener('change', function () { actualiser(true); });
  champTaille.addEventListener('change', function () { actualiser(true); });
  radiosFiliere.concat(radiosMatiere).forEach(function (r) {
    r.addEventListener('change', function () { actualiser(true); });
  });

  champTri.value = 'recent';
  champTaille.value = '10';
  actualiser(true);
})();
