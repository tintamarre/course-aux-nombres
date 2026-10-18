/**
 * Every sentence the game can say. The game builds its sentences ONLY with these functions, and
 * `allPhrases()` lists every possible output: that list is what scripts/audio turns into recorded
 * audio files, so each spoken sentence has its own clip (speech synthesis is only a fallback).
 */
import { CHARACTERS } from './characters'
import { numberWord, operationWords } from './words'
import { HAZARD_PENALTY, MAX_BOARD_LENGTH } from '../engine/board'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Verdicts vary so that the praise does not become repetitive. Only the encouragement varies:
 * the mathematical sentence (« cinq, c'est plus grand que deux ») always keeps the same words,
 * which matters for learning. Every variant stays positive, even after a mistake.
 * (No sentence ends with « le plus »: speech engines read it « le plu ».)
 */
export const VERDICTS = {
  win: [
    'Bravo, tu as le plus grand trésor !',
    'Super ! Le plus gros trésor est pour toi !',
    'Bien joué ! Tu as trouvé le plus grand trésor !',
    'Génial ! C’est toi qui as le plus de pièces !',
    'Oui ! Ce trésor est plus grand, il est à toi !',
    'Très bien ! Tu as choisi le plus grand trésor !',
  ],
  lose: [
    'Le crabe a le plus grand trésor !',
    'Oh ! Le plus gros trésor était de l’autre côté.',
    'Pas cette fois ! Le crabe a plus de pièces.',
    'Le crabe a eu le plus grand trésor. On continue !',
    'Presque ! Le plus grand trésor était l’autre.',
  ],
  timeout: [
    'Trop tard ! Le crabe a pris le plus grand trésor.',
    'Le crabe a été plus rapide ! Il prend le plus grand trésor.',
    'Oh, le crabe est arrivé le premier à la clé !',
  ],
} as const

/** What the crab says about the race (paper: "I'm way behind!", "Oh no! You've overtaken me!"), with variants. */
export const COMMENTS = {
  overtaken: ['Oh non ! Tu m’as dépassé !', 'Zut ! Tu es passé devant moi !', 'Hé ! Tu me doubles !', 'Tu vas trop vite pour moi !'],
  crabAhead: ['Hi hi ! Je suis devant !', 'Je passe devant toi !', 'À moi la première place !'],
  crabFarBehind: ['Je suis loin derrière !', 'Attends-moi !', 'Tu es loin devant moi !'],
  crabFarAhead: ['Je suis loin devant !', 'Rattrape-moi si tu peux !', 'Je file vers l’arrivée !'],
} as const

const lastPicked = new Map<readonly string[], string>()
/** A random variant, never the same as the previous one of the same list. */
export function pickVariant(list: readonly string[]): string {
  const options = list.length > 1 ? list.filter((x) => x !== lastPicked.get(list)) : list
  const choice = options[Math.floor(Math.random() * options.length)]
  lastPicked.set(list, choice)
  return choice
}

export const phrases = {
  /** a number on its own: counting, presentation of a quantity */
  number: (n: number) => numberWord(n),
  chose: (n: number) => `Tu as choisi ${numberWord(n)}.`,
  /** when time ran out: the child gets the smaller treasure */
  got: (n: number) => `Tu as ${numberWord(n)}.`,
  compare: (big: number, small: number) => `${cap(numberWord(big))}, c'est plus grand que ${numberWord(small)}.`,
  verdictWin: () => pickVariant(VERDICTS.win),
  verdictLose: () => pickVariant(VERDICTS.lose),
  verdictTimeout: () => pickVariant(VERDICTS.timeout),
  operation: (a: number, op: '+' | '-', b: number, result: number) => `${operationWords(a, op, b)}, égale ${numberWord(result)}.`,
  arrived: 'Arrivé !',
  hazardPlayer: `Aïe, une anémone ! Tu recules de ${numberWord(HAZARD_PENALTY)}.`,
  hazardCrab: 'Le crabe tombe sur une anémone !',
  comment: (key: keyof typeof COMMENTS) => pickVariant(COMMENTS[key]),
  hintMove: 'Touche les cases une à une pour avancer !',
  readyPrompt: 'Prêt ? Touche le bouton pour commencer !',
  reward: 'Bravo ! Tu as gagné la course ! Voici un poisson pour ton aquarium.',
  unlock: (article: string) => `Tu peux maintenant jouer avec ${article} !`,
  crabWon: 'Le crabe a gagné cette course. On recommence !',
  sessionEnd: "Bravo ! C'est fini pour aujourd'hui. À bientôt !",
}

/** Every sentence the game can produce (input of the audio generation). */
export function allPhrases(): string[] {
  const out = new Set<string>()
  const add = (s: string) => out.add(s)
  // counting on along the track: every square number
  for (let n = 1; n <= MAX_BOARD_LENGTH; n++) add(phrases.number(n))
  for (let n = 1; n <= 9; n++) {
    add(phrases.chose(n))
    add(phrases.got(n))
    for (let small = 1; small < n; small++) add(phrases.compare(n, small))
  }
  // additions with a sum up to 9, subtractions with operands up to 9 (Table 1 notes)
  for (let a = 1; a <= 8; a++) for (let b = 1; a + b <= 9; b++) add(phrases.operation(a, '+', b, a + b))
  for (let a = 2; a <= 9; a++) for (let b = 1; b < a; b++) add(phrases.operation(a, '-', b, a - b))
  // moves on the numbered track, read as operations: « sept plus quatre, égale onze »
  for (let from = 0; from < MAX_BOARD_LENGTH; from++)
    for (let n = 1; n <= 9 && from + n <= MAX_BOARD_LENGTH; n++) add(phrases.operation(from, '+', n, from + n))
  // going back on an anemone (anemones are never on the first two or the last two squares)
  for (let sq = 2; sq <= MAX_BOARD_LENGTH - 2; sq++) add(phrases.operation(sq, '-', HAZARD_PENALTY, sq - HAZARD_PENALTY))
  for (const c of CHARACTERS) add(phrases.unlock(c.article))
  for (const list of [...Object.values(VERDICTS), ...Object.values(COMMENTS)]) list.forEach(add)
  for (const v of Object.values(phrases)) if (typeof v === 'string') add(v)
  return [...out]
}
