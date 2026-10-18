import { describe, expect, it } from 'vitest'
import { KnowledgeSpace, PAPER_PARAMS, PRIORS } from './adaptive'
import { BOARD_LENGTH, HAZARD_PENALTY, move, placeHazards } from './board'
import { layoutDots } from './dots'
import { LEVELS, levelFromDifficulty } from './levels'
import { chooseLarger, chooseSmaller, deadlineSeconds, generateProblem, makeOperation } from './problem'
import { mulberry32 } from './rng'

describe('levels (Table 1)', () => {
  it('has 14 levels mapped from d_n', () => {
    expect(LEVELS).toHaveLength(14)
    expect(levelFromDifficulty(0).level).toBe(1)
    expect(levelFromDifficulty(0.5).level).toBe(8)
    expect(levelFromDifficulty(1).level).toBe(14)
  })
  it('follows the pedagogical progression', () => {
    expect(LEVELS.filter((l) => l.dots).map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6])
    expect(LEVELS.filter((l) => l.spoken).map((l) => l.level)).toEqual([3, 4, 5, 6, 7])
    expect(LEVELS.filter((l) => l.hazards).map((l) => l.level)).toEqual([9, 10, 11, 12, 13, 14])
    expect(LEVELS[4].fadeSeconds).toBe(4)
    expect(LEVELS[5].fadeSeconds).toBe(1)
  })
})

describe('distance dimension', () => {
  it('chooses x in [2, x_max]', () => {
    expect(chooseLarger(9, 0)).toBe(2)
    expect(chooseLarger(9, 0.999)).toBe(9)
    expect(chooseLarger(5, 0.999)).toBe(5)
  })
  it('gives ratio 2 at the easiest level and adjacent numbers at the hardest', () => {
    expect(chooseSmaller(8, 0)).toBe(4)
    expect(chooseSmaller(8, 1)).toBe(7)
    expect(chooseSmaller(2, 1)).toBe(1)
    for (let x = 2; x <= 9; x++)
      for (let dd = 0; dd <= 1; dd += 0.05) {
        const y = chooseSmaller(x, dd)
        expect(y).toBeGreaterThanOrEqual(1)
        expect(y).toBeLessThan(x)
      }
  })
})

describe('speed dimension', () => {
  it('has no deadline below 0.3', () => {
    expect(deadlineSeconds(0)).toBeNull()
    expect(deadlineSeconds(0.29)).toBeNull()
  })
  it('starts at v_max and decreases towards v_min', () => {
    expect(deadlineSeconds(0.3)).toBeCloseTo(10, 5)
    const d1 = deadlineSeconds(1)!
    expect(d1).toBeGreaterThan(0.25)
    expect(d1).toBeLessThan(0.5)
    expect(deadlineSeconds(0.5)!).toBeLessThan(deadlineSeconds(0.4)!)
  })
})

describe('problems', () => {
  it('writes operations within the paper limits', () => {
    const rng = mulberry32(1)
    for (let k = 0; k < 500; k++) {
      const v = 1 + (k % 9)
      const add = makeOperation(rng, v, '+', 9)
      if (add) expect(add.a + add.b).toBe(v)
      const sub = makeOperation(rng, v, '-', 9)
      if (sub) {
        expect(sub.a - sub.b).toBe(v)
        expect(sub.a).toBeLessThanOrEqual(9)
        expect(sub.b).toBeGreaterThanOrEqual(1)
      }
    }
  })
  it('always has a strictly larger side matching the level', () => {
    const rng = mulberry32(2)
    for (let k = 0; k < 2000; k++) {
      const p = generateProblem([rng(), rng(), rng()], rng)
      const big = p.larger === 'left' ? p.left : p.right
      const small = p.larger === 'left' ? p.right : p.left
      expect(big.value).toBeGreaterThan(small.value)
      expect(big.value).toBeLessThanOrEqual(p.level.smallRange ? 5 : 9)
      const hasOp = !!(p.left.operation || p.right.operation)
      expect(hasOp).toBe(p.level.addition || p.level.subtraction)
    }
  })
})

describe('gold pieces', () => {
  it('never overlap', () => {
    const rng = mulberry32(3)
    for (const control of ['luminance', 'density'] as const)
      for (let n = 1; n <= 9; n++)
        for (let k = 0; k < 20; k++) {
          const dots = layoutDots(n, control, rng)
          expect(dots).toHaveLength(n)
          for (let i = 0; i < n; i++)
            for (let j = i + 1; j < n; j++)
              expect(Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y)).toBeGreaterThanOrEqual(dots[i].r + dots[j].r)
        }
  })
  it('keeps total area constant under luminance control', () => {
    const area = (n: number) => layoutDots(n, 'luminance', mulberry32(n)).reduce((a, d) => a + d.r ** 2, 0)
    expect(area(3)).toBeCloseTo(area(9), 5)
  })
})

describe('board', () => {
  it('moves, finishes and applies hazards', () => {
    expect(move(0, 5, []).to).toBe(5)
    expect(move(27, 5, []).finished).toBe(true)
    expect(move(27, 5, []).to).toBe(BOARD_LENGTH)
    const m = move(4, 3, [7])
    expect(m.hitHazard).toBe(true)
    expect(m.to).toBe(7 - HAZARD_PENALTY)
  })
  it('places hazards away from the characters', () => {
    const rng = mulberry32(4)
    for (let k = 0; k < 100; k++) {
      const h = placeHazards(rng, [5, 9])
      expect(h).toHaveLength(3)
      expect(h).not.toContain(5)
      expect(h).not.toContain(9)
    }
  })
})

describe('adaptive algorithm', () => {
  it('initialises K to chance or to the prior cube', () => {
    expect(new KnowledgeSpace(PAPER_PARAMS, PRIORS.aucun).get([1, 1, 1])).toBe(0.5)
    const k = new KnowledgeSpace(PAPER_PARAMS, PRIORS.modere)
    expect(k.get([0.35, 0.35, 0.35])).toBe(0.9)
    expect(k.get([0.5, 0, 0])).toBe(0.5)
  })

  it('raises easier problems after a success and lowers harder ones after a failure', () => {
    const k = new KnowledgeSpace(PAPER_PARAMS, PRIORS.aucun)
    k.update([0.5, 0.5, 0.5], true)
    expect(k.get([0.1, 0.1, 0.1])).toBeGreaterThan(0.5)
    expect(k.get([0.9, 0.9, 0.9])).toBe(0.5)
    k.update([0.5, 0.5, 0.5], false)
    expect(k.get([0.9, 0.9, 0.9])).toBeLessThan(0.5)
  })

  /** Simulated learner with a fixed knowledge: succeeds when the problem is inside its ability box. */
  function simulate(ability: number[], trials: number, seed: number) {
    const rng = mulberry32(seed)
    const k = new KnowledgeSpace(PAPER_PARAMS, PRIORS.aucun)
    const outcomes: number[] = []
    for (let t = 0; t < trials; t++) {
      const d = k.select(rng)
      const inside = d.every((x, i) => x <= ability[i])
      const success = inside ? rng() < 0.95 : rng() < 0.2
      k.update(d, success)
      outcomes.push(success ? 1 : 0)
    }
    return { k, outcomes }
  }

  it('keeps the success rate close to 75 %', () => {
    const { outcomes } = simulate([0.6, 0.8, 0.5], 600, 5)
    const late = outcomes.slice(200)
    const rate = late.reduce((a, b) => a + b, 0) / late.length
    expect(rate).toBeGreaterThan(0.65)
    expect(rate).toBeLessThan(0.85)
  })

  it('learns the shape of the knowledge space', () => {
    const { k } = simulate([0.6, 0.8, 0.5], 600, 6)
    expect(k.get([0.2, 0.2, 0.2])).toBeGreaterThan(0.8)
    expect(k.get([0.95, 0.95, 0.95])).toBeLessThan(0.4)
  })
})
