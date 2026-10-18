/**
 * Board screen of the race. The paper does not give the board length nor the hazard penalty:
 * the values below are our own choices, documented in docs/methodologie.md.
 */
import { randomInt, type Rng } from './rng'

/** squares 1..BOARD_LENGTH on one horizontal track shared by both characters, both start on square 0 */
export const BOARD_LENGTH = 20
/** anemones on the track */
export const HAZARD_COUNT = 3
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

/** New anemones "appear at random on some board squares", never under a character. */
export function placeHazards(rng: Rng, occupied: readonly number[], count = HAZARD_COUNT): number[] {
  const hazards: number[] = []
  let guard = 0
  while (hazards.length < count && guard++ < 1000) {
    const sq = randomInt(rng, 2, BOARD_LENGTH - 2)
    if (!hazards.includes(sq) && !occupied.includes(sq)) hazards.push(sq)
  }
  return hazards.sort((a, b) => a - b)
}

export type PositionComment = 'overtaken' | 'crabAhead' | 'crabFarBehind' | 'crabFarAhead'

/**
 * What the competitor says about the relative position (paper: "I'm way behind!", "Oh no! You've
 * overtaken me!"). Returns the key of the sentence in src/data/phrases.ts.
 */
export function positionComment(playerBefore: number, crabBefore: number, player: number, crab: number): PositionComment | null {
  if (playerBefore <= crabBefore && player > crab) return 'overtaken'
  if (crabBefore <= playerBefore && crab > player) return 'crabAhead'
  if (player - crab >= 6) return 'crabFarBehind'
  if (crab - player >= 6) return 'crabFarAhead'
  return null
}
