// Vitrine 3D de l'en-tete : un reseau de particules connectees, sur fond
// sombre, dans les couleurs de la marque. Purement decorative (aria-hidden
// dans le HTML) - a la difference du reste du site, elle ne montre pas
// l'application reelle, c'est un choix assume.
(function () {
  var bloc = document.getElementById('demo-verre');
  if (!bloc) return;
  var canvas = bloc.querySelector('.demo-3d-canvas');

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function activerRepli() {
    bloc.classList.add('en-repli');
  }

  var supportWebGL = false;
  try {
    var essai = document.createElement('canvas');
    supportWebGL = !!(window.WebGLRenderingContext &&
      (essai.getContext('webgl2') || essai.getContext('webgl')));
  } catch (e) {
    supportWebGL = false;
  }
  if (!supportWebGL) {
    activerRepli();
    return;
  }

  import('three').then(function (THREE) {
    demarrer(THREE);
  }).catch(function () {
    activerRepli();
  });

  function demarrer(THREE) {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) {
      activerRepli();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 30);
    camera.position.set(0, 0, 8.5);

    // Fond sombre degrade, pose dans la scene : c'est le contraste avec le
    // noir/violet qui fait ressortir les particules lumineuses - un fond
    // clair les auurait noyees (essaye, et abandonne pour cette raison).
    var fondCanvas = document.createElement('canvas');
    fondCanvas.width = fondCanvas.height = 512;
    var fctx = fondCanvas.getContext('2d');
    var degrade = fctx.createRadialGradient(256, 200, 40, 256, 256, 380);
    degrade.addColorStop(0, '#1c2454');
    degrade.addColorStop(.55, '#141a3d');
    degrade.addColorStop(1, '#0b0f24');
    fctx.fillStyle = degrade;
    fctx.fillRect(0, 0, 512, 512);
    var fondTexture = new THREE.CanvasTexture(fondCanvas);
    fondTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = fondTexture;

    // Texture ronde et douce pour chaque particule : un cercle plein donne
    // un carre visible aux coins, une lueur degradee se fond dans le noir.
    var particuleCanvas = document.createElement('canvas');
    particuleCanvas.width = particuleCanvas.height = 64;
    var pctx = particuleCanvas.getContext('2d');
    var lueur = pctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    lueur.addColorStop(0, 'rgba(255,255,255,1)');
    lueur.addColorStop(.4, 'rgba(255,255,255,.7)');
    lueur.addColorStop(1, 'rgba(255,255,255,0)');
    pctx.fillStyle = lueur;
    pctx.fillRect(0, 0, 64, 64);
    var particuleTexture = new THREE.CanvasTexture(particuleCanvas);

    var groupe = new THREE.Group();
    scene.add(groupe);

    var NB = 85;
    var PORTEE = 2.0; // distance en dessous de laquelle deux particules se relient
    var LIMITE = { x: 4.6, y: 3, z: 2.4 };
    var COULEUR_A = new THREE.Color('#5b8dff'); // bleu de la charte
    var COULEUR_B = new THREE.Color('#9b6bff'); // violet de la charte

    var positions = new Float32Array(NB * 3);
    var vitesses = [];
    var couleursBase = new Float32Array(NB * 3);
    var couleursActuelles = new Float32Array(NB * 3);

    for (var i = 0; i < NB; i++) {
      var x = (Math.random() * 2 - 1) * LIMITE.x;
      var y = (Math.random() * 2 - 1) * LIMITE.y;
      var z = (Math.random() * 2 - 1) * LIMITE.z;
      positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
      vitesses.push(new THREE.Vector3(
        (Math.random() - .5) * .012,
        (Math.random() - .5) * .012,
        (Math.random() - .5) * .008
      ));
      var teinte = new THREE.Color().lerpColors(COULEUR_A, COULEUR_B, Math.random());
      couleursBase[i * 3] = teinte.r; couleursBase[i * 3 + 1] = teinte.g; couleursBase[i * 3 + 2] = teinte.b;
      couleursActuelles[i * 3] = teinte.r; couleursActuelles[i * 3 + 1] = teinte.g; couleursActuelles[i * 3 + 2] = teinte.b;
    }

    var geometrieParticules = new THREE.BufferGeometry();
    geometrieParticules.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometrieParticules.setAttribute('color', new THREE.BufferAttribute(couleursActuelles, 3));
    var materiauParticules = new THREE.PointsMaterial({
      size: .16, map: particuleTexture, vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    var particules = new THREE.Points(geometrieParticules, materiauParticules);
    groupe.add(particules);

    // Lignes entre particules proches : le tampon est dimensionne au pire
    // cas (toutes les paires), et seule la portion reellement utilisee est
    // dessinee via setDrawRange - reecrire un tableau a chaque image serait
    // couteux, le redimensionner le serait plus encore.
    var MAX_SEGMENTS = 220;
    var lignePositions = new Float32Array(MAX_SEGMENTS * 2 * 3);
    var ligneCouleurs = new Float32Array(MAX_SEGMENTS * 2 * 3);
    var geometrieLignes = new THREE.BufferGeometry();
    geometrieLignes.setAttribute('position', new THREE.BufferAttribute(lignePositions, 3));
    geometrieLignes.setAttribute('color', new THREE.BufferAttribute(ligneCouleurs, 3));
    var materiauLignes = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: .45,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var lignes = new THREE.LineSegments(geometrieLignes, materiauLignes);
    groupe.add(lignes);

    function ajusterTaille() {
      var r = bloc.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / Math.max(r.height, 1);
      camera.updateProjectionMatrix();
    }
    ajusterTaille();
    window.addEventListener('resize', ajusterTaille);

    var sourisNDC = new THREE.Vector2(2, 2); // hors cadre par defaut
    var sourisX = 0, sourisY = 0;
    window.addEventListener('pointermove', function (e) {
      var r = bloc.getBoundingClientRect();
      sourisX = ((e.clientX - r.left) / Math.max(r.width, 1)) * 2 - 1;
      sourisY = ((e.clientY - r.top) / Math.max(r.height, 1)) * 2 - 1;
      sourisNDC.set(sourisX, -sourisY);
    });
    window.addEventListener('pointerleave', function () {
      sourisNDC.set(2, 2);
    });

    function dessiner() {
      // Reflet du reseau : les particules avancent, rebondissent sur les
      // bords, et les liens se recalculent selon la distance du moment.
      var pos = geometrieParticules.attributes.position.array;
      for (var i = 0; i < NB; i++) {
        var ix = i * 3;
        pos[ix] += vitesses[i].x; pos[ix + 1] += vitesses[i].y; pos[ix + 2] += vitesses[i].z;
        if (pos[ix] > LIMITE.x || pos[ix] < -LIMITE.x) vitesses[i].x *= -1;
        if (pos[ix + 1] > LIMITE.y || pos[ix + 1] < -LIMITE.y) vitesses[i].y *= -1;
        if (pos[ix + 2] > LIMITE.z || pos[ix + 2] < -LIMITE.z) vitesses[i].z *= -1;
      }
      geometrieParticules.attributes.position.needsUpdate = true;

      // Lueur au voisinage du curseur : rayon projete sur un plan a z=0
      // pour retrouver un point 3D comparable aux positions des particules.
      raycaster.setFromCamera(sourisNDC, camera);
      var toucheZ0 = raycaster.ray.intersectPlane(planZ0, pointSouris3D);

      var couleurs = geometrieParticules.attributes.color.array;
      for (var j = 0; j < NB; j++) {
        var jx = j * 3;
        var eclat = 1;
        if (toucheZ0) {
          var dx = pos[jx] - pointSouris3D.x;
          var dy = pos[jx + 1] - pointSouris3D.y;
          var dz = pos[jx + 2] - pointSouris3D.z;
          var d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 2.4) eclat = 1 + (1 - d2 / 2.4) * 1.8;
        }
        couleurs[jx] = couleursBase[jx] * eclat;
        couleurs[jx + 1] = couleursBase[jx + 1] * eclat;
        couleurs[jx + 2] = couleursBase[jx + 2] * eclat;
      }
      geometrieParticules.attributes.color.needsUpdate = true;

      // Segments entre particules proches, jusqu'a la limite du tampon.
      var lignePos = geometrieLignes.attributes.position.array;
      var ligneCoul = geometrieLignes.attributes.color.array;
      var compte = 0;
      var portee2 = PORTEE * PORTEE;
      for (var a = 0; a < NB && compte < MAX_SEGMENTS; a++) {
        var ax = a * 3;
        for (var b = a + 1; b < NB && compte < MAX_SEGMENTS; b++) {
          var bx = b * 3;
          var dxl = pos[ax] - pos[bx];
          var dyl = pos[ax + 1] - pos[bx + 1];
          var dzl = pos[ax + 2] - pos[bx + 2];
          var dist2 = dxl * dxl + dyl * dyl + dzl * dzl;
          if (dist2 < portee2) {
            var o = compte * 6;
            lignePos[o] = pos[ax]; lignePos[o + 1] = pos[ax + 1]; lignePos[o + 2] = pos[ax + 2];
            lignePos[o + 3] = pos[bx]; lignePos[o + 4] = pos[bx + 1]; lignePos[o + 5] = pos[bx + 2];
            var oc = compte * 6;
            ligneCoul[oc] = couleurs[ax]; ligneCoul[oc + 1] = couleurs[ax + 1]; ligneCoul[oc + 2] = couleurs[ax + 2];
            ligneCoul[oc + 3] = couleurs[bx]; ligneCoul[oc + 4] = couleurs[bx + 1]; ligneCoul[oc + 5] = couleurs[bx + 2];
            compte++;
          }
        }
      }
      geometrieLignes.setDrawRange(0, compte * 2);
      geometrieLignes.attributes.position.needsUpdate = true;
      geometrieLignes.attributes.color.needsUpdate = true;

      renderer.render(scene, camera);
    }

    var raycaster = new THREE.Raycaster();
    var planZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    var pointSouris3D = new THREE.Vector3();

    if (doux) {
      // Mouvement reduit : le reseau reste immobile, une seule image rendue.
      dessiner();
      return;
    }

    var actif = false;

    function animer() {
      if (!actif) return;
      requestAnimationFrame(animer);
      groupe.rotation.y += (sourisX * .18 - groupe.rotation.y) * .03;
      groupe.rotation.x += (-sourisY * .1 - groupe.rotation.x) * .03;
      dessiner();
    }

    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) {
          if (!actif) { actif = true; animer(); }
        } else {
          actif = false;
        }
      });
    }, { threshold: .01 });
    observateur.observe(bloc);
  }
})();
