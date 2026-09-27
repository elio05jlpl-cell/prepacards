// Demonstration jouable de l'en-tete.
//
// Chaque etape est une vraie capture de l'application, avec un ou
// plusieurs boutons invisibles poses exactement sur le bouton reel de
// la capture. Le visiteur avance lui-meme, comme dans l'application.
(function () {
  var bloc = document.getElementById('demo-app');
  if (!bloc) return;

  var vues = [].slice.call(bloc.querySelectorAll('.demo-vue'));
  // La legende est passee SOUS le cadre : elle n'est plus un
  // descendant de #demo-app, d'ou la recherche dans le document.
  var legende = document.querySelector('.demo-legende');

  var LEGENDES = {
    accueil: 'Cliquez sur un paquet pour commencer à réviser',
    paquet: 'Cliquez sur « Étudier maintenant »',
    recto: 'Une carte de vocabulaire. Cliquez pour voir la réponse',
    verso: 'Dites si vous saviez : la carte revient au bon moment',
    stats: 'Tout est mesuré automatiquement, sans rien noter'
  };

  function afficher(etape) {
    vues.forEach(function (v) {
      v.classList.toggle('active', v.dataset.etape === etape);
    });
    if (legende) legende.textContent = LEGENDES[etape] || '';
  }

  bloc.addEventListener('click', function (evenement) {
    var bouton = evenement.target.closest('.demo-point');
    if (!bouton) return;
    afficher(bouton.dataset.cible);
  });

  afficher('accueil');
})();
