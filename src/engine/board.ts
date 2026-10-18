/**
 * Board screen of the race. The paper does not give the board length nor the hazard penalty:
 * the values below are our own choices, documented in docs/methodologie.md.
 */
import { randomInt, type Rng } from './rng'

/** squares 1..BOARD_LENGTH on one horizontal lane per character, both start on square 0 */
export const BOARD_LENGTH = 20
/** anemones per lane */
export const HAZARD_COUNT = 2
/** squares a character goes back when landing on an anemone */
export const HAZARD_PENALTY = 2

export interface Move {
  from: number
  /** square reached by counting, before any hazard */
  landing: number
  /** final square */
  to: number
  hitHazard: boolean
  finished: boolean
}

export function move(from: number, steps: number, hazards: readonly number[]): Move {
  const landing = Math.min(BOARD_LENGTH, from + steps)
  const finished = landing >= BOARD_LENGTH
  const hitHazard = !finished && hazards.includes(landing)
  return { from, landing, to: hitHazard ? Math.max(0, landing - HAZARD_PENALTY) : landing, hitHazard, finished }
}

/** New anemones "appear at random on some board squares", never under the character. */
export function placeHazards(rng: Rng, occupied: readonly number[], count = HAZARD_COUNT): number[] {
  const hazards: number[] = []
  let guard = 0
  while (hazards.length < count && guard++ < 1000) {
    const sq = randomInt(rng, 2, BOARD_LENGTH - 2)
    if (!hazards.includes(sq) && !occupied.includes(sq)) hazards.push(sq)
  }
  return hazards.sort((a, b) => a - b)
}

/** What the competitor says about the relative position (paper: "I'm way behind!", "Oh no! You've overtaken me!"). */
export function positionComment(playerBefore: number, crabBefore: number, player: number, crab: number): string | null {
  if (playerBefore <= crabBefore && player > crab) return 'Oh non ! Tu m’as dépassé !'
  if (crabBefore <= playerBefore && crab > player) return 'Hi hi ! Je suis devant !'
  if (player - crab >= 6) return 'Je suis loin derrière !'
  if (crab - player >= 6) return 'Je suis loin devant !'
  return null
}
