import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { allPhrases } from './phrases'
import manifest from './audio-manifest.json'
import { pronounce } from './words'

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

describe('pronunciation', () => {
  it('says « plusse » in an operation but keeps « plus grand »', () => {
    expect(pronounce('Sept plus quatre, égale onze.')).toBe('Sept plusse quatre, égale onze.')
    expect(pronounce('vingt plus un, égale vingt et un.')).toBe('vingt plusse un, égale vingt et un.')
    expect(pronounce("Cinq, c'est plus grand que deux.")).toBe("Cinq, c'est plus grand que deux.")
    expect(pronounce('Le crabe a plus de pièces.')).toBe('Le crabe a plus de pièces.')
  })
})
