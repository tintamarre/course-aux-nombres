# Plan

## Version 0.1 (cette version)

- [x] Moteur pur et testé : algorithme adaptatif 20 × 20 × 20 aux paramètres de l'article, 14 niveaux du tableau 1, génération des problèmes (distance R = 2, délai 10 s → 0,25 s), collections contrôlées en densité ou en luminance, plateau et anémones
- [x] Écran de comparaison : formats selon le niveau, voix, estompage à 4 s ou 1 s, crabe minuté, retour dans les trois formats, concrétisation des opérations
- [x] Écran du plateau : correspondance terme à terme, comptage à voix haute, raccourci par la case d'arrivée, tour du crabe, commentaires de position
- [x] Récompenses : aquarium, 6 personnages à débloquer
- [x] Espace adulte : profils locaux, point de départ (prior), suivi, cartes de connaissance, export CSV, réglages, durée de séance
- [x] Documentation : méthodologie, guide du praticien
- [x] Déploiement GitHub Pages

## Version 0.2

- [x] Un seul écran : piste horizontale (un couloir de 20 cases par personnage) au-dessus des trésors, pièces numérotées posées directement depuis le trésor
- [x] Rythme : verdict en une phrase, comptage du crabe en un seul énoncé synchronisé, attentes raccourcies
- [x] Son : déverrouillage au premier toucher (iOS), plus de coupures entre phrases, enveloppes sans clics
- [x] Tablette : gestes au toucher immédiat, cibles ≥ 48 px, pas de survol collant ni d'appui long, invitation à tourner en mode portrait
- [x] Création du joueur directement sur l'accueil (« Comment t'appelles-tu ? »)
- [x] Cases numérotées et déplacements affichés comme opérations (« 7 + 4 = 11 », « 11 − 2 = 9 »)
- [x] Choix de l'animal à la création du profil ; les autres à gagner, visibles sur l'accueil avec cadenas
- [x] Une seule piste commune aux deux personnages (enfant au-dessus, crabe en dessous), anémones communes
- [x] Minuteur de séance : fine ligne en haut de l'écran, sans chiffre
- [x] Comptage des pièces (1, 2, 3…) avec pièces qui volent du trésor vers leur case, total redit et case d'arrivée annoncée ; étoile sur le plus grand trésor
- [x] Délai minimum réglable pour le crabe (2 s par défaut, 0,25 s comme l'article)
- [x] Bouton « ▶ » au début de chaque manche (désactivable)
- [x] Calculs du déplacement lus à voix haute ; variantes des encouragements et des remarques du crabe
- [x] Voix enregistrée : ~200 phrases générées hors ligne avec Piper (Siwis, CC BY 4.0), lues par Web Audio, synthèse en secours
- [x] Meilleure prononciation : choix automatique de la voix la plus naturelle, choix manuel avec « Écouter », aide pour installer une voix améliorée
- [x] Retour après le choix lent et descriptif (calcul dit en entier, comparaison expliquée, durée minimale)
- [x] Son sans grésillement (sons pré-calculés, sortie audio maintenue éveillée), tours plus rapides, enregistrement différé du profil

## Idées pour la suite

- Second « monde » graphique (les auteurs en ont ajouté un dans la version révisée pour la variété), par exemple l'espace ou la jungle, avec la même logique
- Page d'enregistrement dans l'espace adulte pour remplacer la voix Siwis par une voix humaine belge (même liste de phrases)
- Application installable hors ligne (PWA), utile en cabinet sans réseau
- Export et import d'un profil (fichier JSON) pour changer d'appareil
- Rapport imprimable du suivi pour le dossier de l'enfant
- Le prolongement « L'Attrape-Nombres » (nombres à deux chiffres, base 10), sur le même moteur adaptatif
