/** Random source in [0, 1). Injected everywhere so the engine can be tested deterministically. */
export type Rng = () => number

/** Small seedable PRNG (mulberry32). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const randomInt = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1))

export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]

/** Standard normal sample (Box–Muller). */
export function gaussian(rng: Rng): number {
  const u = 1 - rng()
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x))
