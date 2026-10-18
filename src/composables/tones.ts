/** Pure rendering of short tones into samples (no Web Audio needed, so it can be unit-tested). */
export interface Note {
  /** frequency (Hz) */
  f: number
  /** start (s) */
  t: number
  /** duration (s) */
  d: number
  /** peak amplitude */
  g: number
}

/** Sine partials with a raised-cosine attack and a release that ends smoothly at 0: no clicks. */
export function renderNotes(rate: number, notes: Note[]): Float32Array {
  const length = Math.ceil((Math.max(...notes.map((n) => n.t + n.d)) + 0.03) * rate)
  const data = new Float32Array(length)
  for (const n of notes) {
    const start = Math.floor(n.t * rate)
    const len = Math.floor(n.d * rate)
    const attack = Math.floor(0.012 * rate)
    for (let i = 0; i < len && start + i < length; i++) {
      const x = i / len
      const env = (i < attack ? 0.5 - 0.5 * Math.cos((Math.PI * i) / attack) : 1) * (1 - x) ** 2 * (0.5 + 0.5 * Math.cos(Math.PI * x))
      const ph = (2 * Math.PI * n.f * i) / rate
      // a quiet octave partial makes the sine rounder without harshness
      data[start + i] += n.g * env * (Math.sin(ph) + 0.15 * Math.sin(2 * ph))
    }
  }
  return data
}
