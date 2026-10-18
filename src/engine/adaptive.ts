/**
 * Multidimensional adaptive algorithm of The Number Race.
 *
 * Faithful implementation of "Algorithm specifications" in Wilson, Dehaene et al. (2006),
 * Principles underlying the design of "The Number Race", an adaptive computer game for
 * remediation of dyscalculia. Behavioral and Brain Functions 2:19 (CC BY 2.0).
 *
 * The child's knowledge is a matrix K of estimated success probabilities over the
 * learning cube [0,1]^n, discretised in m steps per dimension. Each trial, a difficulty
 * d is chosen so that p(success) stays close to S = 75 %, and K is updated from the outcome.
 */
import { clamp, gaussian, type Rng } from './rng'

export interface AdaptiveParams {
  /** number of dimensions */
  n: number
  /** resolution of K on each dimension */
  m: number
  /** chance success rate, initial value of K */
  c: number
  /** average desired success rate */
  S: number
  /** tolerance when looking for cells close to the desired success */
  t: number
  /** tolerance increment when no cell is found */
  i: number
  /** learning rate adjustment factor */
  alpha: number
  /** standard deviation of the scatter function */
  sigma: number
  /** adjustment rate of K */
  omega: number
  /** generalising distance (L1, in matrix cells) */
  g: number
  /** window used to compute the recent success rate */
  window: number
}

/** Parameter values used in the original implementation (paper, end of "Updating of the knowledge space"). */
export const PAPER_PARAMS: AdaptiveParams = {
  n: 3,
  m: 20,
  c: 0.5,
  S: 0.75,
  t: 0.05,
  i: 0.02,
  alpha: 0.7,
  sigma: 0.05,
  omega: 0.5,
  g: 4,
  window: 20,
}

/**
 * Prior knowledge. The paper's first version started from zero knowledge (K = c everywhere);
 * the revised version "can be preprogrammed to assume a moderate amount of prior knowledge
 * (e.g. a cube of high probability of success ranging from 0 to 0.4 on all dimensions)".
 */
export interface Prior {
  /** side of the high-success cube anchored at the origin, 0 = no prior */
  cube: number
  /** estimated success inside the cube */
  value: number
}

export const PRIORS = {
  aucun: { cube: 0, value: 0 },
  debutant: { cube: 0.2, value: 0.9 },
  modere: { cube: 0.4, value: 0.9 },
} as const satisfies Record<string, Prior>

export type PriorName = keyof typeof PRIORS

/** Difficulty vector, each coordinate in [0,1]. Order: [speed, distance, complexity]. */
export type Difficulty = number[]

export class KnowledgeSpace {
  readonly p: AdaptiveParams
  readonly K: Float64Array
  /** recent outcomes (1 = success), most recent last */
  history: number[]

  constructor(p: AdaptiveParams = PAPER_PARAMS, prior: Prior = PRIORS.modere, K?: ArrayLike<number>, history: number[] = []) {
    this.p = p
    this.K = new Float64Array(p.m ** p.n)
    if (K) {
      this.K.set(K)
    } else {
      this.K.fill(p.c)
      if (prior.cube > 0) {
        const lim = prior.cube * (p.m - 1) + 1e-9
        this.forEachCell((idx, flat) => {
          if (idx.every((x) => x <= lim)) this.K[flat] = prior.value
        })
      }
    }
    this.history = history.slice(-p.window)
  }

  /** Index tuple → flat offset. */
  flat(idx: number[]): number {
    let f = 0
    for (let k = 0; k < this.p.n; k++) f = f * this.p.m + idx[k]
    return f
  }

  private forEachCell(fn: (idx: number[], flat: number) => void): void {
    const { m, n } = this.p
    const idx = new Array<number>(n).fill(0)
    for (let f = 0; f < this.K.length; f++) {
      let r = f
      for (let k = n - 1; k >= 0; k--) {
        idx[k] = r % m
        r = Math.floor(r / m)
      }
      fn(idx, f)
    }
  }

  get(d: Difficulty): number {
    return this.K[this.flat(d.map((x) => Math.round(x * (this.p.m - 1))))]
  }

  /** Step 1: desired success for this trial. */
  desiredSuccess(): number {
    const { S, alpha } = this.p
    if (this.history.length < 5) return S
    const r = this.history.reduce((a, b) => a + b, 0) / this.history.length
    return clamp(S - alpha * (r - S), 0, 1)
  }

  /** Steps 1–4: choose the difficulty of the next problem. */
  select(rng: Rng): Difficulty {
    const { m, n, sigma } = this.p
    const s = this.desiredSuccess()
    let t = this.p.t
    let candidates: number[] = []
    while (candidates.length === 0) {
      for (let f = 0; f < this.K.length; f++) if (Math.abs(this.K[f] - s) <= t) candidates.push(f)
      t += this.p.i
    }
    let r = candidates[Math.floor(rng() * candidates.length)]
    const d = new Array<number>(n)
    for (let k = n - 1; k >= 0; k--) {
      d[k] = (r % m) / (m - 1)
      r = Math.floor(r / m)
    }
    return d.map((x) => clamp(x + sigma * gaussian(rng), 0, 1))
  }

  /** Update K with the outcome of a problem presented at difficulty d. */
  update(d: Difficulty, success: boolean): void {
    const { m, omega, g, window } = this.p
    const gamma = success ? 1 : 0
    const pos = d.map((x) => x * (m - 1))
    this.forEachCell((idx, f) => {
      // 1. generalise weakly to neighbouring problems
      let l1 = 0
      for (let k = 0; k < idx.length; k++) l1 += Math.abs(pos[k] - idx[k])
      if (l1 <= g) {
        const beta = 1 - l1 / (g + 1)
        this.K[f] = (1 - omega * beta) * this.K[f] + omega * beta * gamma
      }
      const beta = 0.5
      if (success && idx.every((x, k) => x <= pos[k])) {
        // 2. success: generalise to all simpler problems
        this.K[f] = (1 - omega * beta) * this.K[f] + omega * beta * gamma
      } else if (!success && idx.every((x, k) => x >= pos[k])) {
        // 3. failure: generalise to all harder problems (γ = 0, so only the decay term remains)
        this.K[f] = (1 - omega * beta) * this.K[f] + 0.5 * omega * beta * gamma
      }
    })
    this.history.push(gamma)
    if (this.history.length > window) this.history.shift()
  }

  /** Mean estimated success, an index of the "knowledge volume" (paper, Figure 2b). */
  volume(threshold = 0.75): number {
    let v = 0
    for (const k of this.K) if (k >= threshold) v++
    return v / this.K.length
  }

  /** Mean of K over one axis, giving an m × m map of the two others (for the adult dashboard). */
  projection(dropAxis: number): number[][] {
    const { m } = this.p
    const out = Array.from({ length: m }, () => new Array<number>(m).fill(0))
    this.forEachCell((idx, f) => {
      const [a, b] = idx.filter((_, k) => k !== dropAxis)
      out[a][b] += this.K[f] / m
    })
    return out
  }
}
