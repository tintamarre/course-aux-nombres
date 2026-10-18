# Méthodologie

Ce document décrit comment le jeu met en œuvre les principes de *The Number Race* (« La Course aux nombres ») et signale chaque écart ou choix d'implémentation. La source de référence est l'article en accès libre (licence CC BY 2.0) :

> Wilson, A. J., Dehaene, S., Pinel, P., Revkin, S. K., Cohen, L. & Cohen, D. (2006). Principles underlying the design of "The Number Race", an adaptive computer game for remediation of dyscalculia. *Behavioral and Brain Functions*, 2:19. https://doi.org/10.1186/1744-9081-2-19

L'essai ouvert qui a évalué le logiciel est publié dans le même volume : Wilson, A. J., Revkin, S. K., Cohen, D., Cohen, L. & Dehaene, S. (2006). An open trial assessment of "The Number Race", an adaptive computer game for remediation of dyscalculia. *Behavioral and Brain Functions*, 2:20. https://doi.org/10.1186/1744-9081-2-20

Cette réimplémentation est indépendante : elle n'est affiliée ni à l'INSERM, ni au CEA, ni aux auteurs.

## 1. Principes pédagogiques

L'article pose quatre principes, que le jeu reprend tels quels.

1. **Renforcer le sens du nombre.** La tâche principale est la comparaison numérique : choisir la plus grande de deux quantités. Cette tâche sollicite fortement la représentation des quantités (sillon intrapariétal horizontal) et sa difficulté dépend de la distance numérique.
2. **Relier les représentations du nombre.** Les quantités sont présentées sous forme non symbolique (collections de pièces d'or), symbolique arabe (chiffres) et symbolique verbale (mots prononcés). Un étayage fait passer progressivement des quantités aux symboles, et chaque réponse est suivie des trois formats associés.
3. **Comprendre et automatiser l'arithmétique.** Aux niveaux élevés, de petites additions et soustractions doivent être résolues avant la comparaison, avec une concrétisation par des pièces qui s'ajoutent ou s'en vont, sous la pression d'un délai qui encourage la récupération en mémoire.
4. **Maximiser la motivation.** L'algorithme vise 75 % de réussite : l'enfant réussit souvent sans que ce soit trivial. S'y ajoutent les récompenses (poissons) et les personnages à débloquer.

Le lien nombre–espace est assuré par le plateau, où l'enfant avance d'autant de cases qu'il a gagné de pièces, comme dans les jeux de plateau linéaires de Siegler et Ramani.

## 2. Déroulement d'un tour

L'original enchaîne deux écrans (comparaison, puis plateau). Ici, les deux sont réunis sur **un seul écran**, plus simple à suivre pour un jeune enfant sur tablette : la piste occupe le haut de l'écran, les deux trésors le bas. La tâche et son déroulement restent identiques.

### Début de manche et pause

À la fin de chaque manche, tout reste affiché (piste, calculs, trésors) avec un bouton « ▶ » par-dessus : c'est un temps de pause pour regarder et commenter les résultats, et la manche suivante démarre au toucher. En début de séance et après une course, le bouton « ▶ » est seul à l'écran. Dans tous les cas, les trésors, et le chronomètre du crabe quand il y a un délai, n'apparaissent que lorsque l'enfant le touche : une manche ne démarre jamais pendant qu'il regarde ailleurs, et le temps de réponse enregistré part du moment où il est attentif. Le bouton peut être désactivé dans l'espace adulte.

### Comparaison

- Deux trésors sont présentés, à gauche et à droite. L'enfant touche celui qui contient le plus de pièces.
- Quand la dimension « vitesse » l'impose, une clé et un crabe apparaissent entre les deux trésors, et le crabe monte vers la clé dès la fin de la présentation. S'il l'atteint avant la réponse, il prend le plus grand trésor : l'essai est compté comme un échec et l'enfant reçoit le plus petit. Sans délai, ni clé ni crabe ne s'affichent.
- Le format avant le choix dépend du niveau de complexité (tableau 1 ci-dessous). Au format verbal, chaque nombre est prononcé pendant que le trésor correspondant est entouré, à gauche puis à droite.
- **Après le choix**, chaque trésor est montré dans les trois formats : pièces rangées par lignes de cinq, chiffre et nombre prononcé. Chaque trésor porte l'étiquette « à toi » ou « au crabe ».
- Pour une opération, la concrétisation est volontairement lente : on voit d'abord le premier terme (≈ 1 s), puis les pièces qui arrivent (addition) ou qui s'en vont (soustraction) (≈ 1,5 s). Le calcul est ensuite dit en entier (« trois plus deux égale cinq ») pendant que le résultat s'affiche.
- Le retour décrit ensuite la comparaison, à l'oral et à l'écrit. La phrase mathématique garde toujours les mêmes mots ; seule la formule d'encouragement varie (plusieurs variantes, jamais deux fois la même de suite, toujours positives) : « Tu as choisi deux. Cinq, c'est plus grand que deux. Le crabe a le plus grand trésor ! » Les phrases prononcées évitent un « le plus » en fin de phrase, que la synthèse vocale lit « le plu ».
- Le retour reste à l'écran au moins 3,5 s (6 s avec une opération), et l'enfant ne peut pas avancer avant la fin. Un enfant qui répond très vite reçoit donc quand même tout le retour, essentiel pour l'apprentissage.

### Déplacement sur la piste

- La piste est horizontale : **une seule piste numérotée**, commune aux deux personnages comme le plateau de l'original. Sa longueur dépend de la complexité au début de la course : 20 cases avec les quantités jusqu'à 5, 30 jusqu'à 9, 40 quand il y a des anémones. Au plus 20 cases sont affichées à la fois, pour que les cases restent assez grandes au doigt : la piste défile et suit l'animal qui joue, une flèche signale l'autre animal s'il sort de la vue et un petit drapeau indique l'arrivée. L'animal de l'enfant se tient au-dessus des cases, le crabe en dessous : on les voit tous les deux même sur la même case, et la comparaison des positions (qui est devant ?) se lit directement sur la ligne numérique.
- Chaque déplacement est affiché comme une opération sur la piste numérotée : « 7 + 4 = 11 » pour avancer, « 11 − 2 = 9 » pour reculer sur une anémone. Le résultat apparaît à l'arrivée. L'opération de l'enfant (étiquette blanche) et celle du crabe (étiquette rouge) restent visibles pendant le tour. C'est un ajout à l'original : il relie le déplacement à l'addition et à la soustraction.
- L'enfant avance d'autant de cases qu'il a de pièces, **en touchant les cases une à une** : à chaque toucher sur la case suivante, une pièce vole du trésor jusqu'à cette case (correspondance terme à terme visible), l'animal y avance et la voix dit **le numéro de la case** (surcomptage : de la case 6 avec 3 pièces, « sept, huit, neuf »). Une mauvaise case tremble. Si l'enfant hésite quelques secondes, la case suivante s'illumine doucement.
- **Écart avec l'article :** l'original comptait les pièces (« un, deux, trois »). Une fois les cases numérotées, nous avons choisi avec les praticiens de compter sur les numéros des cases, pour ne jamais faire entendre une suite (1, 2, 3) pendant qu'on en voit une autre (7, 8, 9), et pour préparer l'addition.
- Une fois arrivé, le déplacement est **lu comme un calcul** : « six plus trois, égale neuf » (« zéro plus huit, égale huit » au départ, « onze moins deux, égale neuf » sur une anémone). Avancée et recul restent affichés comme deux calculs séparés (« 7 + 6 = 13 » puis « 13 − 2 = 11 »), plutôt qu'en chaîne, qui ferait un mauvais usage du signe « = ».
- Le raccourci de l'article est conservé : toucher directement la case d'arrivée fait poser toutes les pièces en comptant.
- Pendant le retour, le plus grand trésor est marqué d'une étoile : en cas d'erreur, l'enfant voit lequel était le plus grand. Une case erronée tremble, sans autre pénalité.
- Puis c'est au crabe : ses pièces volent de son trésor vers la piste, il avance case par case pendant que l'ordinateur dit les numéros, et son calcul est lu de la même façon.
- Le crabe commente les dépassements et les grands écarts, avec des variantes : « Oh non ! Tu m'as dépassé ! », « Hé ! Tu me doubles ! », « Attends-moi ! »…
- À partir du niveau 9, des anémones apparaissent au hasard sur la piste ; elles valent pour les deux personnages. Elles sont visibles dès la présentation des trésors. Tomber dessus fait reculer, ce qui oblige à anticiper la case exacte d'arrivée (« attention portée à la quantité exacte »).
- Le premier arrivé gagne la course. Si c'est l'enfant, il reçoit un poisson pour son aquarium. Les poissons débloquent de nouveaux personnages, qui changent l'apparence mais jamais la tâche.

## 3. Les trois dimensions de difficulté

Chaque essai est un point `d = (d_s, d_d, d_n)` du cube `[0,1]³` : vitesse, distance et complexité.

### Distance (`d_d`)

Le plus grand nombre est tiré uniformément :

    x = floor((x_max − x_min + 1) · α + x_min),   α ~ U[0,1),  x_min = 2

avec `x_max = 5` aux niveaux à étendue restreinte et `x_max = 9` sinon. Le plus petit nombre vaut :

    y = min(floor(x · R^(d_d − 1)), x − 1),   R = 2

Ainsi `log y ≈ log x + (d_d − 1)·log R` : le rapport x/y vaut 2 à la difficulté minimale et tend vers 1 (nombres voisins) à la difficulté maximale. La distance est donc contrôlée en rapport de Weber, et non en différence absolue.

### Vitesse (`d_s`)

    si d_s < 0,3 :  pas de délai
    sinon :         v = r^(d_s − c) + v_min,   avec c = log(1 / (v_max − v_min)) / log(r) + 0,3

Paramètres : `v_min = 0,25 s`, `v_max = 10 s`, `r = 0,001`. Le délai vaut 10 s au seuil 0,3 et descend vers environ 0,33 s à `d_s = 1`. Comme le notent les auteurs, même un adulte n'atteint pas le plafond de cette dimension.

**Écart réglable : délai minimum.** Le praticien choisit dans l'espace adulte le délai le plus court accordé (2 s par défaut, 0,25 s pour retrouver l'article). Le délai donné à l'enfant est `max(v, délai minimum)`, et c'est ce délai effectif qui est enregistré. Au-delà du point où le minimum s'applique, la dimension « vitesse » n'est plus plus difficile pour l'enfant : l'algorithme y estime donc une réussite élevée et l'explore librement, ce qui est sans conséquence pour l'entraînement.

### Complexité conceptuelle (`d_n`)

    l = floor(d_n · 14) + 1        (borné à 14)

Les 14 niveaux reprennent le **tableau 1** de l'article :

| Niveau | Points | Mots | Chiffres | Étendue 1–5 | Estompage | Anémones | Addition | Soustraction | Objectif |
|---|---|---|---|---|---|---|---|---|---|
| 1 | oui | | | oui | | | | | Petites quantités non symboliques |
| 2 | oui | | | | | | | | Grandes quantités non symboliques |
| 3 | oui | oui | oui | oui | | | | | Lier les petites quantités aux symboles |
| 4 | oui | oui | oui | | | | | | Lier les grandes quantités aux symboles |
| 5 | oui | oui | oui | | 4 s | | | | Augmenter l'appui sur les symboles |
| 6 | oui | oui | oui | | 1 s | | | | L'augmenter encore |
| 7 | | oui | oui | | | | | | Appui complet sur les symboles |
| 8 | | | oui | | | | | | Appui complet sur le code arabe |
| 9 | | | oui | | | oui | | | Attention à la quantité exacte |
| 10 | | | oui | oui | | oui | oui | | Petites additions |
| 11 | | | oui | | | oui | oui | | Additions plus grandes |
| 12 | | | oui | oui | | oui | | oui | Petites soustractions |
| 13 | | | oui | | | oui | | oui | Soustractions plus grandes |
| 14 | | | oui | | | oui | oui | oui | Distinguer addition et soustraction |

Additions : somme ≤ 9 (≤ 5 aux niveaux restreints). Soustractions : termes ≤ 9, donc résultat ≤ 8 (termes ≤ 5 aux niveaux restreints).

### Contrôle des collections de pièces

L'article précise que les collections sont « contrôlées en densité ou en luminance ». À chaque essai, l'un des deux contrôles est tiré au hasard :

- **luminance** : la surface d'or totale est identique quel que soit le nombre de pièces, qui sont donc plus petites quand elles sont plus nombreuses ;
- **densité** : les pièces gardent la même taille et la surface qu'elles occupent grandit avec le nombre (rayon de l'enveloppe ∝ √n).

Aucun indice non numérique unique (surface totale, taille des pièces, étendue) ne permet ainsi de répondre de façon fiable.

## 4. Algorithme adaptatif multidimensionnel

La connaissance de l'enfant est modélisée par une matrice `K` de 20 × 20 × 20 probabilités de réussite estimées sur le cube. Paramètres de l'article : `n = 3, m = 20, c = 0,5, S = 0,75, t = 0,05, i = 0,02, α = 0,7, σ = 0,05, ω = 0,5, g = 4`.

**Choix de la difficulté**

1. Réussite désirée : `s = S` pendant les 5 premiers essais, puis `s = S − α·(r − S)`, où `r` est le taux de réussite sur les 20 derniers essais. Après une série de réussites, on vise donc plus difficile.
2. On cherche les cellules de `K` dont la valeur est dans `s ± t`, en élargissant `t` de `i` jusqu'à en trouver.
3. On en tire une au hasard, convertie en coordonnées dans `[0,1]³`.
4. La difficulté finale est tirée d'une gaussienne centrée sur ce point (σ = 0,05).

**Mise à jour après la réponse** (γ = 1 si réussite, 0 sinon)

1. Voisinage : pour chaque cellule à une distance L1 `|v|₁ ≤ g`, avec `β = 1 − |v|₁ / (g + 1)` : `k ← (1 − ωβ)·k + ωβγ`.
2. En cas de réussite, toutes les cellules plus faciles sur les trois axes : `β = 0,5`, même formule.
3. En cas d'échec, toutes les cellules plus difficiles sur les trois axes : `β = 0,5`, `k ← (1 − ωβ)·k + 0,5·ωβγ`.

**Connaissances préalables.** La première version partait de `K = 0,5` partout, et les auteurs ont constaté qu'environ 250 essais étaient nécessaires pour atteindre la zone proximale de l'enfant. La version révisée peut supposer « un cube de forte probabilité de réussite de 0 à 0,4 sur toutes les dimensions ». Le jeu propose trois départs à la création du profil : *aucun* (version 2006), *débutant* (cube 0–0,2) et *modéré* (cube 0–0,4, recommandé). Dans le cube, `K` vaut 0,9.

Les tests (`src/engine/engine.test.ts`) simulent un apprenant à connaissance fixe. Ils vérifient que le taux de réussite reste entre 65 et 85 % après calibration et que la carte apprise reflète bien la zone de compétence.

## 5. Choix d'implémentation non précisés par l'article

| Élément | Choix | Raison |
|---|---|---|
| Piste | Horizontale, une seule piste commune ; 20, 30 ou 40 cases selon la complexité au début de la course ; défile au-delà de 20 cases | Comme l'original ; des courses de plusieurs tours même avec de grands nombres ; cases d'au moins 48 px au toucher |
| Anémones | 5 sur la piste de 40 cases, communes aux deux personnages, placées au hasard au début de la course et fixes jusqu’à la fin, jamais sous un personnage | « apparaissent au hasard sur certaines cases » |
| Recul sur une anémone | 2 cases | Assez pour compter, sans décourager sur une piste courte |
| Arrivée | Il suffit d'atteindre ou de dépasser la dernière case | Évite les tours bloqués |
| Début du délai | Après la présentation (fin de la voix) | Pour ne pas pénaliser l'écoute des nombres |
| Côté de l'opération | Tiré au hasard ; l'autre côté si la valeur ne s'écrit pas avec cette opération | Le tableau ne précise pas |
| Niveau 14 | Une seule opération par essai, + ou − tiré au hasard | Lecture la plus simple de « distinguer addition et soustraction » |
| Personnages | 6 animaux marins ; l'enfant choisit le sien à la création du profil, les autres se débloquent à 3, 7, 12, 18 et 25 poissons | Le choix initial favorise l'appropriation ; les suivants restent des récompenses (« débloquer un nouveau personnage ») ; l'aquarium continue de se remplir au-delà |
| Voix | Voix enregistrée : environ 200 fichiers audio générés une fois avec Piper (voix Siwis, CC BY 4.0), lus par Web Audio ; la synthèse vocale de l'appareil ne sert qu'en secours | Même voix et même prononciation sur tous les appareils ; chaque nombre compté démarre exactement avec sa pièce ; la synthèse variait d'un appareil à l'autre (accent, prononciation « le plu », grésillements, voix muette sur certains Mac) |
| Rythme | Le crabe avance en même temps qu'il compte ; toute phrase encore en cours est coupée au passage à l'écran suivant, pour que la voix ne prenne jamais de retard sur le jeu | Les auteurs ont accéléré le plateau dans la version révisée, la lenteur lassait les enfants |
| Tablette | Gestes au toucher immédiat, son et voix déverrouillés au premier toucher (exigence d'iOS), mode paysage | Public cible en cabinet et en classe |
| Durée de séance | Réglable, 20 min par défaut (30 min dans l'étude) ; fine ligne de progression en haut de l'écran, sans chiffre, mise à jour toutes les 5 s | La séance se clôt à la fin du tour en cours ; aucun nombre affiché, pour ne pas interférer avec ceux de la tâche |

## 6. Limiter les distracteurs

À la demande, et dans l'esprit de l'outil (public avec troubles attentionnels fréquents) :

- le fond marin est **statique** : rien ne bouge derrière la tâche ;
- l'écran de jeu ne contient que la piste et les deux trésors, sans score, minuterie chiffrée ni décoration animée ; la clé et le crabe minuteur n'apparaissent que lorsqu'il y a un délai ;
- les seuls mouvements qui attendent l'enfant ont une fonction : la pièce suivante rebondit doucement pour montrer qu'il faut la toucher ;
- les sons sont brefs et doux, et peuvent être coupés ;
- les animations servent la tâche (le crabe matérialise le délai, les pièces qui arrivent ou partent concrétisent l'opération) ;
- l'aquarium et le choix du personnage ne sont visibles qu'à l'accueil et après une victoire ;
- `prefers-reduced-motion` est respecté.

## 7. Limites

Comme le rappellent les auteurs, le jeu ne travaille que les quantités de 1 à 9 et n'aborde ni la numération de position, ni la multiplication, ni les fractions. Il ne « guérit » pas la dyscalculie : c'est un outil d'entraînement à intégrer dans une prise en charge.
