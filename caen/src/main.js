import './style.css'
// On importe 'gsap' en entier
import { gsap } from "gsap";

// ===================================================
// 1. MOTEUR DE BLOB (GSAP V3)
// ===================================================

/**
 * Crée l'animation "wobble" d'un blob.
 * N'anime QUE le rayon des points.
 */
function createBlob(options) {
  const points = [];
  const path = options.element;
  const slice = (Math.PI * 2) / options.numPoints;
  const startAngle = random(Math.PI * 2);

  // Syntaxe GSAP v3
  const tl = gsap.timeline({
    onUpdate: update // La fonction 'update' recalcule la position
  });

  for (var i = 0; i < options.numPoints; i++) {
    const angle = startAngle + i * slice;
    const duration = random(options.minDuration, options.maxDuration);

    // On stocke l'angle et le rayon (pas x/y)
    const point = {
      angle: angle,
      radius: options.minRadius
    };

    // On anime SEULEMENT le 'radius'
    const tween = gsap.to(point, {
      radius: options.maxRadius,
      duration: duration,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut" // Syntaxe v3 pour l'ease
    });

    tl.add(tween, -random(duration));
    points.push(point);
  }

  options.tl = tl;
  options.points = points;

  // 'update' recalcule x/y en temps réel
  // en se basant sur le centerX/Y (qui bouge)
  // et le radius (qui "wobble")
  function update() {
    const calculatedPoints = []; 
    for (const p of points) {
      calculatedPoints.push({
        x: options.centerX + Math.cos(p.angle) * p.radius,
        y: options.centerY + Math.sin(p.angle) * p.radius
      });
    }
    path.setAttribute("d", cardinal(calculatedPoints, true, 1));
  }

  return options;
}

/**
 * Fonction mathématique pour dessiner la courbe SVG
 */
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

/**
 * Fonction utilitaire pour un nombre aléatoire
 */
function random(min, max) {
  if (max == null) { max = min; min = 0; }
  if (min > max) { const tmp = min; min = max; max = tmp; }
  return min + (max - min) * Math.random();
}

// ===================================================
// 2. GESTION DE LA SCÈNE (EXPLOSION & RESET)
// ===================================================

const svg = document.querySelector("#blob-container");
const SVG_WIDTH = 600;
const SVG_HEIGHT = 600;

const colors = [
  "#ff1400", "#ffc300", "#17f3af",
  "#03cfec", "#6e19e6", "#ff5801"
];

const BLOB_LIMIT = 20; // Limite avant explosion
let lastColor = null;
const activeBlobs = []; // Tableau principal
let isExploding = false; // Sécurité

/**
 * Touche du chef : une couleur aléatoire (jamais la même 2x)
 */
function getNextColor() {
  let newColor;
  do {
    newColor = colors[Math.floor(Math.random() * colors.length)];
  } while (newColor === lastColor);
  lastColor = newColor;
  return newColor;
}

/**
 * Crée un nouveau blob (DOM et objet) à une position donnée
 */
function spawnBlob(x, y) {
  const newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  newPath.setAttribute("fill", getNextColor());
  newPath.setAttribute("fill-opacity", 0); // Pour fondu d'apparition
  svg.appendChild(newPath);

  // Animation d'apparition
  gsap.to(newPath, { duration: 0.5, attr: { "fill-opacity": 1 } });

  // 1. Crée l'objet blob et son anim "wobble"
  const blobData = createBlob({
    element: newPath,
    numPoints: 7,
    centerX: x,
    centerY: y,
    minRadius: 30,
    maxRadius: 45,
    minDuration: 2,
    maxDuration: 4
  });

  // 2. Ajoute la vitesse pour la physique
  const angle = random(0, Math.PI * 2);
  const speed = random(1, 2.5);
  blobData.velocityX = Math.cos(angle) * speed;
  blobData.velocityY = Math.sin(angle) * speed;

  return blobData;
}

/**
 * Vide la scène de tous les blobs
 */
function resetScene() {
  for (const blob of activeBlobs) {
    blob.tl.kill(); // Stoppe l'animation GSAP du blob
    blob.element.remove(); // Supprime l'élément SVG
  }
  activeBlobs.length = 0; // Vide le tableau
}

/**
 * Lance l'animation d'explosion
 */
function triggerExplosion() {
  isExploding = true;
  
  const allElements = activeBlobs.map(b => b.element);

  // 1. Anime les objets blob (leur rayon)
  gsap.to(activeBlobs, {
    duration: 0.7,
    minRadius: SVG_WIDTH * 0.8,
    maxRadius: SVG_WIDTH * 0.9,
    ease: "power2.in",
    onComplete: () => {
      // 2. Quand c'est fini, on reset et on relance
      resetScene();
      initScene();
      isExploding = false;
    }
  });

  // 3. Anime les éléments SVG (leur opacité) en parallèle
  gsap.to(allElements, {
    duration: 0.7,
    attr: { "fill-opacity": 0 },
    ease: "power2.in"
  });
}

/**
 * Met en place la scène de départ
 */
function initScene() {
  for (let i = 0; i < 3; i++) {
    const newBlob = spawnBlob(
      random(100, SVG_WIDTH - 100), 
      random(100, SVG_HEIGHT - 100)
    );
    activeBlobs.push(newBlob);
  }
}

// ===================================================
// 3. MOTEUR PHYSIQUE (DÉPLACEMENT & COLLISION)
// ===================================================

/**
 * Fonction appelée à chaque frame par GSAP pour tout faire bouger
 */
function moveBlobs() {
  
  // 1. MISE À JOUR POSITION
  for (const blobData of activeBlobs) {
    blobData.centerX += blobData.velocityX;
    blobData.centerY += blobData.velocityY;
  }

  // 2. DÉTECTION COLLISION BLOB-À-BLOB
  for (let i = 0; i < activeBlobs.length; i++) {
    const blobA = activeBlobs[i];
    
    for (let j = i + 1; j < activeBlobs.length; j++) {
      const blobB = activeBlobs[j];

      // Détection
      const dx = blobB.centerX - blobA.centerX;
      const dy = blobB.centerY - blobA.centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = blobA.maxRadius + blobB.maxRadius;

      if (distance < minDistance) {
        
        // Résolution pénétration
        const overlap = (minDistance - distance) / 2;
        const normX = dx / distance;
        const normY = dy / distance;

        blobA.centerX -= normX * overlap;
        blobA.centerY -= normY * overlap;
        blobB.centerX += normX * overlap;
        blobB.centerY += normY * overlap;

        // Calcul rebond
        const vA_normal = blobA.velocityX * normX + blobA.velocityY * normY;
        const vB_normal = blobB.velocityX * normX + blobB.velocityY * normY;

        const vA_tangent_x = blobA.velocityX - vA_normal * normX;
        const vA_tangent_y = blobA.velocityY - vA_normal * normY;
        const vB_tangent_x = blobB.velocityX - vB_normal * normX;
        const vB_tangent_y = blobB.velocityY - vB_normal * normY;

        const vA_normal_new = vB_normal;
        const vB_normal_new = vA_normal;

        blobA.velocityX = vA_tangent_x + vA_normal_new * normX;
        blobA.velocityY = vA_tangent_y + vA_normal_new * normY;
        blobB.velocityX = vB_tangent_x + vB_normal_new * normX;
        blobB.velocityY = vB_tangent_y + vB_normal_new * normY;
      }
    }
  }

  // 3. GESTION REBONDS MURS
  for (const blobData of activeBlobs) {
    const margin = blobData.maxRadius;
    
    if (blobData.centerX - margin < 0 || blobData.centerX + margin > SVG_WIDTH) {
      blobData.velocityX *= -1;
      blobData.centerX = Math.max(margin, Math.min(SVG_WIDTH - margin, blobData.centerX));
    }
    
    if (blobData.centerY - margin < 0 || blobData.centerY + margin > SVG_HEIGHT) {
      blobData.velocityY *= -1;
      blobData.centerY = Math.max(margin, Math.min(SVG_HEIGHT - margin, blobData.centerY));
    }
  }
}

// ===================================================
// 4. DÉMARRAGE ET INTERACTIVITÉ
// ===================================================

// Écouteur de clic
svg.addEventListener("click", (event) => {
  if (isExploding) return; // Pas de clic pendant l'explosion

  const newBlob = spawnBlob(event.offsetX, event.offsetY);
  activeBlobs.push(newBlob);

  // Vérif limite
  if (activeBlobs.length >= BLOB_LIMIT) {
    triggerExplosion();
  }
});

// On attache le moteur physique au "coeur" de GSAP
gsap.ticker.add(moveBlobs);

// On lance la scène !
initScene();