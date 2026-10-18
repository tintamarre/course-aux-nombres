/**
 * Converts a point d = (d_s, d_d, d_n) of the learning space into a concrete comparison problem
 * ("Operational definition of our three adaptive dimensions", Wilson, Dehaene et al. 2006).
 */
import type { Difficulty } from './adaptive'
import { levelFromDifficulty, type Level } from './levels'
import { pick, randomInt, type Rng } from './rng'

export const X_MIN = 2
/** maximum ratio x / y */
export const R = 2

export const DEADLINE = {
  vMin: 0.25,
  vMax: 10,
  r: 0.001,
  /** difficulty level at which the deadline begins to be instituted */
  alpha: 0.3,
}

export type Side = 'left' | 'right'
export type Operator = '+' | '-'

export interface Operation {
  a: number
  b: number
  op: Operator
}

export interface Quantity {
  value: number
  /** present when the quantity is shown as an addition or a subtraction */
  operation?: Operation
}

/** Gold-piece sets are controlled either for total luminance (same total area) or for density. */
export type DotControl = 'luminance' | 'density'

export interface Problem {
  difficulty: Difficulty
  level: Level
  left: Quantity
  right: Quantity
  larger: Side
  /** seconds before the competitor steals the larger quantity, null = no deadline */
  deadline: number | null
  dotControl: DotControl
}

/** x = floor((x_max − x_min + 1)·α + x_min), α uniform in [0,1). */
export function chooseLarger(xMax: number, u: number): number {
  return Math.min(xMax, Math.floor((xMax - X_MIN + 1) * u + X_MIN))
}

/** y = min(floor(x·R^(d_d − 1)), x − 1), so that log y ≈ log x + (d_d − 1)·log R. */
export function chooseSmaller(x: number, dd: number): number {
  return Math.max(1, Math.min(Math.floor(x * R ** (dd - 1)), x - 1))
}

/** v = r^(d_s − c) + v_min with c = log(1 / (v_max − v_min)) / log r + α; no deadline below α. */
export function deadlineSeconds(ds: number): number | null {
  const { vMin, vMax, r, alpha } = DEADLINE
  if (ds < alpha) return null
  const c = Math.log(1 / (vMax - vMin)) / Math.log(r) + alpha
  return r ** (ds - c) + vMin
}

/**
 * Express a value as an addition (sum ≤ x_max) or a subtraction (operands ≤ x_max, so a result
 * of at most x_max − 1, as in the paper: operands of 9 or below, result of 8 or below).
 * Returns null when the value cannot be written with this operator.
 */
export function makeOperation(rng: Rng, value: number, op: Operator, xMax: number): Operation | null {
  if (op === '+') {
    if (value < 2) return null
    const a = randomInt(rng, 1, value - 1)
    return { a, b: value - a, op }
  }
  if (value > xMax - 1) return null
  const b = randomInt(rng, 1, xMax - value)
  return { a: value + b, b, op }
}

export function generateProblem(d: Difficulty, rng: Rng): Problem {
  const [ds, dd, dn] = d
  const level = levelFromDifficulty(dn)
  const xMax = level.smallRange ? 5 : 9
  const x = chooseLarger(xMax, rng())
  const y = chooseSmaller(x, dd)

  const larger: Side = rng() < 0.5 ? 'left' : 'right'
  let big: Quantity = { value: x }
  let small: Quantity = { value: y }

  const ops: Operator[] = [...(level.addition ? ['+' as const] : []), ...(level.subtraction ? ['-' as const] : [])]
  if (ops.length > 0) {
    const op = pick(rng, ops)
    // the operation goes on a random side; fall back to the other one if the value cannot be written
    const order = rng() < 0.5 ? ['big', 'small'] : ['small', 'big']
    for (const which of order) {
      const operation = makeOperation(rng, which === 'big' ? x : y, op, xMax)
      if (operation) {
        if (which === 'big') big = { ...big, operation }
        else small = { ...small, operation }
        break
      }
    }
  }

  return {
    difficulty: d,
    level,
    left: larger === 'left' ? big : small,
    right: larger === 'left' ? small : big,
    larger,
    deadline: deadlineSeconds(ds),
    dotControl: rng() < 0.5 ? 'luminance' : 'density',
  }
}
