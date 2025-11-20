import './style.css'
import { gsap } from "gsap";
// 📦 IMPORT DE MATTER.JS
import Matter from "matter-js";

// ===================================================
// 1. CONFIGURATION MATTER.JS (Le Monde Physique)
// ===================================================

const SVG_WIDTH = 1500;
const SVG_HEIGHT = 350;

// Création du moteur physique
const engine = Matter.Engine.create();
engine.world.gravity.y = 0; // Pas de gravité (vue de dessus / économiseur d'écran)

// Création du "Runner" (ce qui fait tourner le temps physique)
const runner = Matter.Runner.create();
Matter.Runner.run(runner, engine);

// Création des murs (Invisibles mais solides)
// Rectangle params: x, y, width, height, options
const wallOptions = { isStatic: true };
const wallThickness = 100; // Épaisseur des murs (hors champ)

const walls = [
  // Haut
  Matter.Bodies.rectangle(SVG_WIDTH / 2, -wallThickness / 2, SVG_WIDTH, wallThickness, wallOptions),
  // Bas
  Matter.Bodies.rectangle(SVG_WIDTH / 2, SVG_HEIGHT + wallThickness / 2, SVG_WIDTH, wallThickness, wallOptions),
  // Droite
  Matter.Bodies.rectangle(SVG_WIDTH + wallThickness / 2, SVG_HEIGHT / 2, wallThickness, SVG_HEIGHT, wallOptions),
  // Gauche
  Matter.Bodies.rectangle(-wallThickness / 2, SVG_HEIGHT / 2, wallThickness, SVG_HEIGHT, wallOptions)
];

Matter.World.add(engine.world, walls);

// ===================================================
// 2. CONFIGURATION VISUELLE (GSAP)
// ===================================================

const svg = document.querySelector("#blob-container");
const colors = ["#ff1400", "#ffc300", "#17f3af", "#03cfec", "#6e19e6", "#ff5801"];
let lastColor = null;
const BLOB_LIMIT = 10;
let isExploding = false;
const activeBlobs = []; // Stockera { element, data, body }

function getNextColor() {
  let newColor;
  do { newColor = colors[Math.floor(Math.random() * colors.length)]; } 
  while (newColor === lastColor);
  lastColor = newColor;
  return newColor;
}

// --- Fonction createBlob (Le "Wobble" visuel) ---
function createBlobVisual(options) {
  const points = [];
  const path = options.element;
  const slice = (Math.PI * 2) / options.numPoints;
  const startAngle = random(Math.PI * 2);

  const tl = gsap.timeline({ onUpdate: update });

  for (var i = 0; i < options.numPoints; i++) {
    const angle = startAngle + i * slice;
    const duration = random(options.minDuration, options.maxDuration);
    const point = { angle: angle, radius: options.minRadius };

    const tween = gsap.to(point, {
      radius: options.maxRadius,
      duration: duration,
      repeat: -1, yoyo: true, ease: "sine.inOut"
    });

    tl.add(tween, -random(duration));
    points.push(point);
  }

  options.tl = tl;
  options.points = points;

  function update() {
    const calculatedPoints = []; 
    for (const p of points) {
      // 💡 LA CLÉ : On utilise les coordonnées qui seront mises à jour depuis Matter.js
      calculatedPoints.push({
        x: options.centerX + Math.cos(p.angle) * p.radius,
        y: options.centerY + Math.sin(p.angle) * p.radius
      });
    }
    path.setAttribute("d", cardinal(calculatedPoints, true, 1));
  }

  return options;
}

// --- Spawn complet (Physique + Visuel) ---
function spawnBlob(x, y) {
  // 1. VISUEL (SVG)
  const newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  newPath.setAttribute("fill", getNextColor());
  newPath.setAttribute("fill-opacity", 0); 
  svg.appendChild(newPath);

  // Opacité cible : 0.5 demandée
  gsap.to(newPath, { duration: 0.5, attr: { "fill-opacity": 0.8 } });

  // Taille augmentée ici (60 -> 85)
  const minR = 100;  // Rayon quand le blob est "contracté"
  const maxR = 140;  // Rayon quand le blob est "gonflé"
  const avgRadius = (minR + maxR) / 2; // Rayon moyen pour la physique

  const blobData = createBlobVisual({
    element: newPath,
    numPoints: 8, // Un peu plus de points pour des gros blobs
    centerX: x,
    centerY: y,
    minRadius: minR, 
    maxRadius: maxR, 
    minDuration: 2,
    maxDuration: 4
  });

  // 2. PHYSIQUE (Matter.js)
  const blobBody = Matter.Bodies.circle(x, y, avgRadius, {
    restitution: 1,      // Rebondissement parfait (comme une balle magique)
    friction: 0,         // Pas de frottement
    frictionAir: 0,      // Pas de résistance à l'air (vitesse constante)
    frictionStatic: 0,
    density: 0.05        // Masse relative
  });

  // On lui donne une impulsion initiale
  const angle = random(0, Math.PI * 2);
  const speed = random(3, 6); // Vitesse adaptée à Matter.js
  Matter.Body.setVelocity(blobBody, {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed
  });

  // On ajoute le corps au monde physique
  Matter.World.add(engine.world, blobBody);

  // On retourne un objet composite
  return {
    data: blobData, // Le gestionnaire GSAP visuel
    body: blobBody, // Le corps physique
    element: newPath // L'élément DOM
  };
}

// ===================================================
// 3. BOUCLE DE SYNCHRONISATION (SYNC LOOP)
// ===================================================

// Au lieu de "moveBlobs", on a "syncBlobs"
function syncBlobs() {
  for (const blob of activeBlobs) {
    // On copie la position du corps physique vers le visuel
    blob.data.centerX = blob.body.position.x;
    blob.data.centerY = blob.body.position.y;
    
    // (Le 'onUpdate' de createBlobVisual redessinera le blob automatiquement)
  }
}

// On branche la synchro sur le ticker GSAP
gsap.ticker.add(syncBlobs);

// ===================================================
// 4. LOGIQUE DE JEU (RESET / EXPLOSION)
// ===================================================

function resetScene() {
  for (const blob of activeBlobs) {
    blob.data.tl.kill(); // Stop GSAP
    blob.element.remove(); // Stop DOM
    Matter.World.remove(engine.world, blob.body); // Stop Matter.js
  }
  activeBlobs.length = 0;
}

function initScene() {
  for (let i = 0; i < 3; i++) {
    const newBlob = spawnBlob(
      random(100, SVG_WIDTH - 100), 
      random(100, SVG_HEIGHT - 100)
    );
    activeBlobs.push(newBlob);
  }
}

function triggerExplosion() {
  isExploding = true;
  
  // 1. On retire la physique immédiatement pour éviter les collisions bizarres pendant l'anim
  for (const blob of activeBlobs) {
    Matter.World.remove(engine.world, blob.body);
  }

  const blobDatas = activeBlobs.map(b => b.data); // Pour animer les rayons
  const elements = activeBlobs.map(b => b.element); // Pour animer l'opacité

  // Animation GSAP "Explosion"
  gsap.to(blobDatas, {
    duration: 0.6,
    minRadius: SVG_WIDTH * 0.6, // Devient énorme
    maxRadius: SVG_WIDTH * 0.8,
    ease: "expo.out"
  });

  gsap.to(elements, {
    duration: 0.6,
    attr: { "fill-opacity": 0 },
    ease: "power2.in",
    onComplete: () => {
      resetScene();
      initScene();
      isExploding = false;
    }
  });
}

svg.addEventListener("click", (event) => {
  if (isExploding) return;

  const newBlob = spawnBlob(event.offsetX, event.offsetY);
  activeBlobs.push(newBlob);

  if (activeBlobs.length >= BLOB_LIMIT) {
    triggerExplosion();
  }
});

// ===================================================
// 5. UTILITAIRES (CARDINAL & RANDOM)
// ===================================================

function cardinal(data, closed, tension) {
  if (data.length < 1) return "M0 0";
  if (tension == null) tension = 1;
  const size = data.length - (closed ? 0 : 1);
  let path = "M" + data[0].x + " " + data[0].y + " C";
  for (var i = 0; i < size; i++) {
    let p0, p1, p2, p3;
    if (closed) {
      p0 = data[(i - 1 + size) % size];
      p1 = data[i];
      p2 = data[(i + 1) % size];
      p3 = data[(i + 2) % size];
    } else {
      p0 = i == 0 ? data[0] : data[i - 1];
      p1 = data[i];
      p2 = data[i + 1];
      p3 = i == size - 1 ? p2 : data[i + 2];
    }
    const x1 = p1.x + ((p2.x - p0.x) / 6) * tension;
    const y1 = p1.y + ((p2.y - p0.y) / 6) * tension;
    const x2 = p2.x - ((p3.x - p1.x) / 6) * tension;
    const y2 = p2.y - ((p3.y - p1.y) / 6) * tension;
    path += " " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + p2.x + " " + p2.y;
  }
  return closed ? path + "z" : path;
}

function random(min, max) {
  if (max == null) { max = min; min = 0; }
  if (min > max) { const tmp = min; min = max; max = tmp; }
  return min + (max - min) * Math.random();
}

// Démarrage
initScene();