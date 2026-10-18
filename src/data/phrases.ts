/**
 * Every sentence the game can say. The game builds its sentences ONLY with these functions, and
 * `allPhrases()` lists every possible output: that list is what scripts/audio turns into recorded
 * audio files, so each spoken sentence has its own clip (speech synthesis is only a fallback).
 */
import { CHARACTERS } from './characters'
import { NUMBER_WORDS, numberWord, operationWords } from './words'
import { HAZARD_PENALTY } from '../engine/board'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const phrases = {
  /** a number on its own: counting, presentation of a quantity */
  number: (n: number) => numberWord(n),
  /** the total, said again after counting (cardinal principle) */
  cardinal: (n: number) => `${cap(numberWord(n))} !`,
  chose: (n: number) => `Tu as choisi ${numberWord(n)}.`,
  /** when time ran out: the child gets the smaller treasure */
  got: (n: number) => `Tu as ${numberWord(n)}.`,
  compare: (big: number, small: number) => `${cap(numberWord(big))}, c'est plus grand que ${numberWord(small)}.`,
  // "plus" is always followed by "grand": a final "le plus" is read "le plu"
  verdictWin: 'Bravo, tu as le plus grand trésor !',
  verdictLose: 'Le crabe a le plus grand trésor !',
  verdictTimeout: 'Trop tard ! Le crabe a pris le plus grand trésor.',
  operation: (a: number, op: '+' | '-', b: number, result: number) => `${operationWords(a, op, b)}, égale ${numberWord(result)}.`,
  arrival: (square: number) => (square === 0 ? 'Retour au départ.' : `Case ${numberWord(square)}.`),
  arrived: 'Arrivé !',
  hazardPlayer: `Aïe, une anémone ! Tu recules de ${numberWord(HAZARD_PENALTY)}.`,
  hazardCrab: 'Le crabe tombe sur une anémone !',
  overtaken: 'Oh non ! Tu m’as dépassé !',
  crabAhead: 'Hi hi ! Je suis devant !',
  crabFarBehind: 'Je suis loin derrière !',
  crabFarAhead: 'Je suis loin devant !',
  hintMove: 'Touche tes pièces pour avancer !',
  reward: 'Bravo ! Tu as gagné la course ! Voici un poisson pour ton aquarium.',
  unlock: (article: string) => `Tu peux maintenant jouer avec ${article} !`,
  crabWon: 'Le crabe a gagné cette course. On recommence !',
  sessionEnd: "Bravo ! C'est fini pour aujourd'hui. À bientôt !",
}

/** Every sentence the game can produce (input of the audio generation). */
export function allPhrases(): string[] {
  const out = new Set<string>()
  const add = (s: string) => out.add(s)
  for (let n = 1; n < NUMBER_WORDS.length; n++) add(phrases.number(n))
  for (let n = 1; n <= 9; n++) {
    add(phrases.cardinal(n))
    add(phrases.chose(n))
    add(phrases.got(n))
    for (let small = 1; small < n; small++) add(phrases.compare(n, small))
  }
  // additions with a sum up to 9, subtractions with operands up to 9 (Table 1 notes)
  for (let a = 1; a <= 8; a++) for (let b = 1; a + b <= 9; b++) add(phrases.operation(a, '+', b, a + b))
  for (let a = 2; a <= 9; a++) for (let b = 1; b < a; b++) add(phrases.operation(a, '-', b, a - b))
  for (let sq = 0; sq < 20; sq++) add(phrases.arrival(sq))
  for (const c of CHARACTERS) add(phrases.unlock(c.article))
  for (const v of Object.values(phrases)) if (typeof v === 'string') add(v)
  return [...out]
}
