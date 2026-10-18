/**
 * Layout of a set of gold pieces. Following the paper, sets are "controlled for density or
 * luminance", so that the child cannot rely on a single non-numerical cue:
 * - luminance: the total gold area is the same whatever the number, pieces shrink as n grows;
 * - density: pieces keep the same size and the area they occupy grows with n.
 */
import type { DotControl } from './problem'
import type { Rng } from './rng'

export interface Dot {
  x: number
  y: number
  r: number
}

/** side of the square box the dots are drawn in (SVG user units) */
export const BOX = 200
const CENTER = BOX / 2
const GAP = 4
/** total area of a luminance-controlled set: five pieces of radius 18 */
const TOTAL_AREA = 5 * Math.PI * 18 ** 2
const DENSITY_RADIUS = 14
/** envelope radius of a density-controlled set of one piece; grows with √n */
const DENSITY_SPREAD = 30

export function radiusFor(n: number, control: DotControl): number {
  return control === 'luminance' ? Math.min(34, Math.sqrt(TOTAL_AREA / (n * Math.PI))) : DENSITY_RADIUS
}

export function layoutDots(n: number, control: DotControl, rng: Rng): Dot[] {
  const r = radiusFor(n, control)
  const envelope = control === 'density' ? Math.min(CENTER - r, DENSITY_SPREAD * Math.sqrt(n)) : CENTER - r
  for (let attempt = 0; attempt < 200; attempt++) {
    const dots: Dot[] = []
    let tries = 0
    while (dots.length < n && tries < 2000) {
      tries++
      const angle = rng() * 2 * Math.PI
      const dist = Math.sqrt(rng()) * envelope
      const x = CENTER + dist * Math.cos(angle)
      const y = CENTER + dist * Math.sin(angle)
      if (dots.every((d) => Math.hypot(d.x - x, d.y - y) >= d.r + r + GAP)) dots.push({ x, y, r })
    }
    if (dots.length === n) return dots
  }
  // fallback, never reached for n ≤ 9: a regular grid
  const cols = Math.ceil(Math.sqrt(n))
  return Array.from({ length: n }, (_, k) => ({
    x: CENTER + ((k % cols) - (cols - 1) / 2) * (2 * r + GAP),
    y: CENTER + (Math.floor(k / cols) - (cols - 1) / 2) * (2 * r + GAP),
    r,
  }))
}
