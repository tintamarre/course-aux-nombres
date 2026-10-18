import { describe, expect, it } from 'vitest'
import { renderNotes } from './tones'

describe('tones', () => {
  it('start and end at silence and never jump (no clicks)', () => {
    for (const rate of [44100, 48000]) {
      const data = renderNotes(rate, [523, 659, 784].map((f, i) => ({ f, t: i * 0.09, d: 0.28, g: 0.2 })))
      expect(Math.abs(data[0])).toBeLessThan(1e-3)
      expect(Math.abs(data[data.length - 1])).toBeLessThan(1e-6)
      let maxStep = 0
      let peak = 0
      for (let i = 1; i < data.length; i++) {
        maxStep = Math.max(maxStep, Math.abs(data[i] - data[i - 1]))
        peak = Math.max(peak, Math.abs(data[i]))
      }
      // a click is a sample-to-sample jump much larger than a smooth 784 Hz sine allows
      expect(maxStep).toBeLessThan(0.05)
      expect(peak).toBeLessThan(0.7)
    }
  })
})
