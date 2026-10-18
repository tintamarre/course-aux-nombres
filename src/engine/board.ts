/**
 * Board screen of the race. The paper does not give the board length nor the hazard penalty:
 * the values below are our own choices, documented in docs/methodologie.md.
 */
import type { Level } from './levels'
import { randomInt, type Rng } from './rng'

/** shortest track: squares 1..20, both characters start on square 0 */
export const BOARD_LENGTH = 20
/** longest track (levels with anemones) */
export const MAX_BOARD_LENGTH = 40
/** squares a character goes back when landing on an anemone */
export const HAZARD_PENALTY = 2

/**
 * The track gets longer as the numbers get bigger, so that a race keeps several turns:
 * 20 squares with quantities up to 5, 30 up to 9, 40 when anemones are on the board.
 * Fixed for a whole race (decided by the level of its first problem).
 */
export function boardLength(level: Level): number {
  if (level.hazards) return MAX_BOARD_LENGTH
  return level.smallRange ? BOARD_LENGTH : 30
}

/** traps on a track: 3 on 20 squares, 5 on 40 */
export const hazardCount = (length: number): number => Math.round(length / 8)

export interface Move {
  from: number
  /** square reached by counting, before any hazard */
  landing: number
  /** final square */
  to: number
  hitHazard: boolean
  finished: boolean
}

export function move(from: number, steps: number, hazards: readonly number[], length = BOARD_LENGTH): Move {
  const landing = Math.min(length, from + steps)
  const finished = landing >= length
  const hitHazard = !finished && hazards.includes(landing)
  return { from, landing, to: hitHazard ? Math.max(0, landing - HAZARD_PENALTY) : landing, hitHazard, finished }
}

/**
 * Anemones "appear at random on some board squares" (from square `from`, to put them ahead of the
 * characters in a race already started), never under a character, and never so close
 * to each other that going back from one lands on (or just by) another.
 */
export function placeHazards(rng: Rng, occupied: readonly number[], length = BOARD_LENGTH, from = 2): number[] {
  const count = hazardCount(length)
  const hazards: number[] = []
  let guard = 0
  const first = Math.min(Math.max(2, from), length - 2)
  while (hazards.length < count && guard++ < 1000) {
    const sq = randomInt(rng, first, length - 2)
    if (!occupied.includes(sq) && hazards.every((h) => Math.abs(h - sq) > HAZARD_PENALTY)) hazards.push(sq)
  }
  return hazards.sort((a, b) => a - b)
}

/** The traps all work the same way (go back 2); only their look and sentence change, for fun. */
export const HAZARD_KINDS = ['anemone', 'urchin', 'jellyfish'] as const
export type HazardKind = (typeof HAZARD_KINDS)[number]

/** kind of the trap on a square: taken in turn along the track, so every race shows a mix */
export const hazardKind = (hazards: readonly number[], sq: number): HazardKind =>
  HAZARD_KINDS[Math.max(0, hazards.indexOf(sq)) % HAZARD_KINDS.length]

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
