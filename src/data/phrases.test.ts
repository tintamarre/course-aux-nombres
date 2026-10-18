import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { allPhrases } from './phrases'
import manifest from './audio-manifest.json'

describe('recorded voice', () => {
  it('has a clip for every sentence the game can say (regenerate with scripts/audio if this fails)', () => {
    const clips: Record<string, string> = manifest.clips
    const missing = allPhrases().filter((p) => !(p in clips))
    expect(missing).toEqual([])
  })
  it('ships every clip file', () => {
    for (const file of Object.values(manifest.clips)) expect(existsSync(`public/${manifest.base}${file}`)).toBe(true)
  })
})

describe('verdict variants', () => {
  it('never repeats the same verdict twice in a row', async () => {
    const { phrases } = await import('./phrases')
    let previous = ''
    for (let k = 0; k < 200; k++) {
      const v = phrases.verdictWin()
      expect(v).not.toBe(previous)
      previous = v
    }
  })
})
