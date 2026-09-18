// Demonstration animee de l'en-tete.
//
// Un enchainement de captures de l'application reelle, avec un curseur qui
// va cliquer ou il faut avant chaque changement d'ecran. Les positions sont
// en pourcentage de l'image, donc justes quelle que soit la taille affichee.
//
// La boucle ne tourne que pendant que le bloc est visible, comme celles de
// la section « Comment ca marche ».
(function () {
  var bloc = document.getElementById('demo-app');
  if (!bloc) return;

  var vues = [].slice.call(bloc.querySelectorAll('.demo-vue'));
  var curseur = bloc.querySelector('.demo-curseur');
  // La legende est passee SOUS le cadre : elle n'est plus un
  // descendant de #demo-app, d'ou la recherche dans le document.
  var legende = document.querySelector('.demo-legende');
  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // vue    : index de la capture affichee
  // cible  : ou le curseur va cliquer, en % de l'image ; null = pas de clic
  // texte  : ce que dit la legende
  // duree  : temps passe sur cette etape, en millisecondes
  var etapes = [
    { vue: 0, cible: [28, 19.5], duree: 2600,
      texte: 'Vos paquets, et ce qu’il reste à réviser aujourd’hui' },
    { vue: 1, cible: [50, 57.5], duree: 2400,
      texte: 'Un paquet : ce qui vous attend, puis c’est parti' },
    { vue: 2, cible: [50, 90.5], duree: 2600,
      texte: 'La question. Vous répondez de tête — ou à voix haute' },
    { vue: 3, cible: [62.5, 94], duree: 3000,
      texte: 'La réponse, et quatre boutons qui disent quand la carte revient' },
    { vue: 0, cible: [62, 3.7], duree: 2200,
      texte: 'Tout est mesuré, sans rien avoir à noter' },
    { vue: 4, cible: null, duree: 3400,
      texte: 'Temps passé, régularité, réussite : mois par mois' }
  ];


  function afficher(index) {
    var etape = etapes[index];
    vues.forEach(function (v, i) {
      v.classList.toggle('active', i === etape.vue);
    });
    legende.textContent = etape.texte;
  }

  if (doux) {
    // Mouvement reduit : on s'en tient a la premiere vue, sans diaporama.
    afficher(0);
    curseur.classList.remove('visible');
    return;
  }

  // La premiere vue est posee TOUT DE SUITE, avant tout observateur : le
  // CSS masque les vignettes des que JavaScript est actif, si bien qu'un
  // en-tete pas encore entre dans le champ de vision serait entierement
  // vide. C'est le cas sur mobile, ou la demonstration passe sous le pli.
  afficher(0);

  var minuteurs = [];
  var index = 0;
  var actif = false;

  function plus_tard(delai, action) {
    minuteurs.push(window.setTimeout(action, delai));
  }

  function vider() {
    minuteurs.forEach(window.clearTimeout);
    minuteurs = [];
  }

  function jouer() {
    if (!actif) return;
    var etape = etapes[index];
    afficher(index);

    if (etape.cible) {
      curseur.classList.add('visible');
      // Le deplacement est laisse a la transition CSS ; le clic part une
      // fois le curseur arrive, sinon l'onde se declencherait dans le vide.
      curseur.style.left = etape.cible[0] + '%';
      curseur.style.top = etape.cible[1] + '%';
      plus_tard(Math.max(0, etape.duree - 750), function () {
        curseur.classList.remove('clique');
        // Forcer un reflow relance l'animation meme si la classe vient
        // d'etre retiree dans le meme tour de boucle.
        void curseur.offsetWidth;
        curseur.classList.add('clique');
      });
    } else {
      curseur.classList.remove('visible');
    }

    plus_tard(etape.duree, function () {
      index = (index + 1) % etapes.length;
      jouer();
    });
  }

  function demarrer() {
    if (actif) return;
    actif = true;
    jouer();
  }

  function arreter() {
    actif = false;
    vider();
    curseur.classList.remove('visible', 'clique');
  }

  if (!('IntersectionObserver' in window)) {
    demarrer();
    return;
  }

  var observateur = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (entree) {
      if (entree.isIntersecting) demarrer();
      else arreter();
    });
  }, { threshold: 0.01 });
  observateur.observe(bloc);
})();
