# La Course aux nombres

Jeu adaptatif pour développer le sens du nombre chez les enfants de 5 à 8 ans. C'est une réimplémentation libre, en HTML et JavaScript, de *The Number Race* (Wilson, Dehaene et al., unité INSERM-CEA de neuro-imagerie cognitive, 2006), fidèle à la méthodologie publiée.

**Jouer : https://www.tintamarre.be/course-aux-nombres/**

> Projet indépendant, non affilié à l'INSERM, au CEA ni aux auteurs du logiciel original. Il s'appuie sur l'article en accès libre : Wilson, A. J., Dehaene, S., Pinel, P., Revkin, S. K., Cohen, L. & Cohen, D. (2006). *Principles underlying the design of "The Number Race", an adaptive computer game for remediation of dyscalculia.* Behavioral and Brain Functions, 2:19. https://doi.org/10.1186/1744-9081-2-19

## Documentation

- [Méthodologie](docs/methodologie.md) : principes, dimensions de difficulté, algorithme adaptatif, tableau des 14 niveaux, choix d'implémentation
- [Guide pour le praticien](docs/guide-praticien.md) : mise en route, fréquence, lecture du suivi
- [Plan](docs/PLAN.md) : ce qui est fait et la suite

## Développement

Prérequis : Node.js ≥ 22 et npm.

```sh
npm install
npm run dev       # http://localhost:5173/course-aux-nombres/
npm test          # tests du moteur (vitest)
npm run build     # type-check + build dans dist/
npm run test:flow # avec `npm run dev` lancé : joue automatiquement ~90 s dans Chrome headless, signale blocages et erreurs
```

`npm run test:flow -- 120 d=0.5,0.3,0.9` joue 120 s en forçant une difficulté (ici opérations, anémones et délai).

En développement, `?d=vitesse,distance,complexite` force la difficulté pour prévisualiser un niveau, par exemple `?d=0.5,0.2,0.75` pour une addition avec délai.

## Stack

Vue 3 (`<script setup>`), TypeScript, Vite et Tailwind CSS 4. Pas de dépendance à l'exécution en dehors de Vue. Le graphisme est entièrement en SVG, la voix passe par la Web Speech API et les sons par la Web Audio API.

## Structure

```
src/
  engine/          moteur pur, sans DOM, testé
    adaptive.ts    algorithme adaptatif multidimensionnel (matrice K 20×20×20)
    levels.ts      les 14 niveaux de complexité (tableau 1 de l'article)
    problem.ts     difficulté → problème (distance, délai, opérations)
    dots.ts        collections de pièces contrôlées en densité / luminance
    board.ts       piste, anémones, commentaires
    engine.test.ts
  composables/     profils (localStorage), réglages, voix, sons
  components/      écrans (accueil, tour de jeu avec piste et trésors, espace adulte) et sprites SVG
  data/            personnages, mots-nombres
docs/              documentation métier
```

## Données

Tout reste dans le `localStorage` du navigateur : profils, matrice de connaissances, historique des essais (5 000 au maximum par profil). Rien n'est envoyé à un serveur.

## Voix enregistrée

Toutes les phrases du jeu (environ 200) sont des fichiers audio pré-générés dans `public/audio/siwis/`, lus par Web Audio : même voix sur tous les appareils, sans clic, synchronisée au comptage. La synthèse vocale de l'appareil ne sert qu'en secours pour une phrase sans fichier.

Les phrases sont définies à un seul endroit, `src/data/phrases.ts`. Après une modification, on régénère les fichiers (hors ligne, sur sa machine ; prérequis : `uv` et `ffmpeg`) :

```sh
npx tsx scripts/list-phrases.ts > scripts/audio/phrases.json
uv run --project scripts/audio scripts/audio/generate.py
```

Voix : Piper `fr_FR-siwis-medium`, entraînée sur la SIWIS French Speech Synthesis Database (University of Edinburgh, https://datashare.is.ed.ac.uk/handle/10283/2353), licence CC BY 4.0.

## Tablette

Le jeu est pensé pour une tablette en paysage : gestes au toucher immédiat (`pointerdown`), cibles d'au moins 48 px, pas de zoom au double toucher, et son et voix déverrouillés au premier toucher (exigence d'iOS). La voix dépend des voix françaises installées sur l'appareil.

## Licence

Code : [MIT](LICENSE). L'article source est publié sous licence CC BY 2.0. Fichiers audio de la voix : CC BY 4.0 (voir « Voix enregistrée »).

## Déploiement

Chaque push sur `main` lance le workflow `.github/workflows/deploy.yml` (tests, build, puis GitHub Pages).
