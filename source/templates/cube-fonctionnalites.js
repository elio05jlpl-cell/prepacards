// Pile 3D des fonctionnalites (Three.js) : six plaques metalliques
// empilees, une etiquette cliquable par plaque. Rendu WebGL, chargement et
// boucle d'animation ne demarrent que si ce bloc est visible a l'ecran et
// que le visiteur n'a pas demande un mouvement reduit - une pile immobile
// consommerait le GPU pour rien pendant que l'article se lit plus bas.
import * as THREE from 'three';
import { RoomEnvironment } from '/vendor/three-room-environment.js';

(function () {
  var bloc = document.getElementById('cube-fonctionnalites');
  if (!bloc) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.WebGLRenderingContext) return;

  var scene3d = bloc.querySelector('.cube3d-scene');
  var canevas = bloc.querySelector('.cube3d-canvas');
  var etiquettes = Array.prototype.slice.call(bloc.querySelectorAll('.cube3d-etiquette'));
  if (!canevas || !etiquettes.length) return;

  var demarre = false;

  function demarrer() {
    if (demarre) return;
    demarre = true;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canevas, antialias: true, alpha: true });
    } catch (e) {
      return; // Contexte WebGL indisponible : le repli HTML/CSS suffit.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(2.7, 2.3, 3.3);
    camera.lookAt(0, 0.15, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    var cle = new THREE.DirectionalLight(0xffffff, 1.6);
    cle.position.set(3, 5, 2);
    scene.add(cle);
    var contre = new THREE.DirectionalLight(0x9fc4ff, 0.5);
    contre.position.set(-3, 1, -2);
    scene.add(contre);

    var groupe = new THREE.Group();
    scene.add(groupe);

    var cotes = 1.9;
    var epaisseur = 0.055;
    var geometrie = new THREE.BoxGeometry(cotes, epaisseur, cotes);
    var nombre = etiquettes.length;
    var plaques = etiquettes.map(function (etiquette, i) {
      var materiau = new THREE.MeshPhysicalMaterial({
        color: 0xe8ecf2, metalness: 1, roughness: 0.3,
        clearcoat: 0.5, clearcoatRoughness: 0.25
      });
      var plaque = new THREE.Mesh(geometrie, materiau);
      // La premiere etiquette doit correspondre a la plaque du dessus : les
      // suivantes descendent (y decroissant) et reculent legerement, comme
      // une pile eventail vue de trois quarts.
      plaque.userData.y = -i * 0.16;
      plaque.userData.x = i * 0.055;
      plaque.userData.z = -i * 0.04;
      plaque.position.set(plaque.userData.x, plaque.userData.y, plaque.userData.z);
      groupe.add(plaque);
      return plaque;
    });

    var indiceActif = 0;

    function activer(indice, deplaceFocus) {
      if (indice === indiceActif) return;
      etiquettes[indiceActif].setAttribute('aria-pressed', 'false');
      indiceActif = indice;
      etiquettes[indiceActif].setAttribute('aria-pressed', 'true');
      if (deplaceFocus) etiquettes[indiceActif].focus();
    }

    etiquettes.forEach(function (etiquette, i) {
      etiquette.addEventListener('click', function () {
        activer(i, false);
        reprogrammerCycle();
      });
    });

    // Cycle automatique : avance seul tant que le visiteur ne choisit pas
    // lui-meme un onglet, et se remet a zero des qu'il le fait - inutile de
    // reprendre le defilement automatique la ou l'utilisateur vient d'agir.
    var minuteurCycle = null;
    function reprogrammerCycle() {
      window.clearTimeout(minuteurCycle);
      minuteurCycle = window.setTimeout(function () {
        activer((indiceActif + 1) % nombre, false);
        reprogrammerCycle();
      }, 4200);
    }
    reprogrammerCycle();
    scene3d.addEventListener('pointerenter', function () { window.clearTimeout(minuteurCycle); });
    scene3d.addEventListener('pointerleave', reprogrammerCycle);

    bloc.setAttribute('data-anime', 'pret');

    function redimensionner() {
      var rect = canevas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height, false);
    }
    redimensionner();
    window.addEventListener('resize', redimensionner);

    var visible = true;
    var observateur = new IntersectionObserver(function (entrees) {
      visible = entrees[0].isIntersecting;
      if (visible) boucle();
    }, { threshold: 0.05 });
    observateur.observe(bloc);

    var enCours = false;
    function boucle() {
      if (enCours || !visible) return;
      enCours = true;

      function image() {
        if (!visible) { enCours = false; return; }

        groupe.rotation.y += 0.0022;

        plaques.forEach(function (plaque, i) {
          // La plaque active se souleve un peu et avance vers la camera ;
          // les autres reprennent leur place dans la pile.
          var cibleY = plaque.userData.y + (i === indiceActif ? 0.22 : 0);
          var cibleZ = plaque.userData.z + (i === indiceActif ? 0.35 : 0);
          plaque.position.y += (cibleY - plaque.position.y) * 0.08;
          plaque.position.z += (cibleZ - plaque.position.z) * 0.08;
        });

        renderer.render(scene, camera);
        window.requestAnimationFrame(image);
      }
      image();
    }
    boucle();
  }

  var declencheur = new IntersectionObserver(function (entrees) {
    if (entrees[0].isIntersecting) {
      demarrer();
      declencheur.disconnect();
    }
  }, { threshold: 0.1 });
  declencheur.observe(bloc);
})();
