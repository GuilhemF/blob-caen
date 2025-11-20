# Interactive Blob Scene 🫧

Une expérience interactive web mettant en scène des formes organiques (blobs) qui rebondissent et interagissent physiquement entre elles, le tout pris en sandwich entre un fond et le logo du millénaire de Caen.

🔗 **Démonstration en direct :** [https://guilhemf.com/caen/](https://guilhemf.com/caen/)

## 🚀 Technologies

Ce projet a été réalisé avec des outils modernes pour la performance et la fluidité :

* **[Vite.dev](https://vite.dev/)** : Pour un environnement de développement ultra-rapide et un build optimisé.
* **[Matter.js](https://brm.io/matter-js/)** : Moteur physique 2D rigide. Il gère les déplacements, les rebonds réalistes sur les murs et les collisions entre les blobs.
* **[GSAP](https://gsap.com/)** (GreenSock) : Pour l'animation organique "liquide" (wobble) des formes SVG, les transitions de couleurs et les effets d'apparition/explosion.

## 🕹️ Fonctionnalités

* **Rendu Hybride** :
    * *Physique* : Chaque blob possède un corps invisible (`Matter.Bodies.circle`) qui gère sa position dans l'espace.
    * *Visuel* : Un path SVG suit la position du corps physique tout en étant déformé par GSAP pour créer l'illusion de gélatine.
* **Interactivité** : Cliquez n'importe où pour faire apparaître un nouveau blob.
* **Système de Limite** : Si trop de blobs sont créés, une animation d'explosion se déclenche ("Reset du chaos") et la scène repart à zéro.
* **Responsive** : La scène s'adapte à la largeur de l'écran tout en conservant son ratio d'aspect, assurant que le SVG, le fond et le logo restent parfaitement alignés.
* **Layering** : Structure en couches (Background > Blobs > Logo) utilisant `pointer-events: none` pour permettre de cliquer "à travers" le logo.

## 🛠️ Installation locale

Si vous souhaitez lancer le projet sur votre machine :

1.  Cloner le dépôt :
    ```bash
    git clone <votre-repo-url>
    cd <votre-dossier>
    ```

2.  Installer les dépendances :
    ```bash
    npm install
    ```

3.  Lancer le serveur de développement :
    ```bash
    npm run dev
    ```

4.  Pour construire la version de production :
    ```bash
    npm run build
    ```

## 📂 Structure

Le cœur de la logique se trouve dans `src/main.js`, qui orchestre la synchronisation entre le moteur physique (Matter.js) et le rendu graphique (GSAP/SVG).

---
*Fait avec ❤️, de la physique 2D et beaucoup de gélatine.*