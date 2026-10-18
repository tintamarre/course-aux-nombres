/**
 * The 14 levels of the "conceptual complexity" dimension, transcribed from Table 1 of
 * Wilson, Dehaene et al. (2006).
 */
export interface Level {
  level: number
  /** formats shown before the choice */
  dots: boolean
  spoken: boolean
  digits: boolean
  /** quantities restricted to 1–5 */
  smallRange: boolean
  /** gold pieces fade out in this many seconds, null = no fading */
  fadeSeconds: number | null
  /** anemone hazards on the board */
  hazards: boolean
  addition: boolean
  subtraction: boolean
  goal: string
}

const L = (
  level: number,
  [dots, spoken, digits]: [boolean, boolean, boolean],
  smallRange: boolean,
  fadeSeconds: number | null,
  hazards: boolean,
  addition: boolean,
  subtraction: boolean,
  goal: string,
): Level => ({ level, dots, spoken, digits, smallRange, fadeSeconds, hazards, addition, subtraction, goal })

const ___ = false
const YES = true

export const LEVELS: readonly Level[] = [
  L(1, [YES, ___, ___], YES, null, ___, ___, ___, 'Attention et traitement des petites quantités non symboliques'),
  L(2, [YES, ___, ___], ___, null, ___, ___, ___, 'Attention et traitement des grandes quantités non symboliques'),
  L(3, [YES, YES, YES], YES, null, ___, ___, ___, 'Lier les petites quantités non symboliques aux codes symboliques'),
  L(4, [YES, YES, YES], ___, null, ___, ___, ___, 'Lier les grandes quantités non symboliques aux codes symboliques'),
  L(5, [YES, YES, YES], ___, 4, ___, ___, ___, "Augmenter l'appui sur les codes symboliques"),
  L(6, [YES, YES, YES], ___, 1, ___, ___, ___, "Augmenter encore l'appui sur les codes symboliques"),
  L(7, [___, YES, YES], ___, null, ___, ___, ___, 'Appui complet sur les codes symboliques'),
  L(8, [___, ___, YES], ___, null, ___, ___, ___, 'Appui complet sur le code arabe'),
  L(9, [___, ___, YES], ___, null, YES, ___, ___, 'Attention portée à la quantité exacte'),
  L(10, [___, ___, YES], YES, null, YES, YES, ___, 'Compréhension et fluence des petites additions'),
  L(11, [___, ___, YES], ___, null, YES, YES, ___, 'Compréhension et fluence des additions plus grandes'),
  L(12, [___, ___, YES], YES, null, YES, ___, YES, 'Compréhension et fluence des petites soustractions'),
  L(13, [___, ___, YES], ___, null, YES, ___, YES, 'Compréhension et fluence des soustractions plus grandes'),
  L(14, [___, ___, YES], ___, null, YES, YES, YES, "Distinguer l'addition de la soustraction"),
]

/** l = floor(d_n · n) + 1 (paper), clamped so that d_n = 1 gives the last level. */
export const levelFromDifficulty = (dn: number): Level =>
  LEVELS[Math.min(LEVELS.length - 1, Math.floor(dn * LEVELS.length))]
