import { describe, expect, it } from 'vitest'
import { allowedCount, nextUnlockAt, ownedCharacters } from './characters'

describe('characters', () => {
  it('unlocks one more animal at each fish threshold', () => {
    expect(allowedCount(0)).toBe(1)
    expect(allowedCount(3)).toBe(2)
    expect(allowedCount(30)).toBe(6)
    expect(nextUnlockAt(0)).toBe(3)
    expect(nextUnlockAt(25)).toBeNull()
  })
  it('keeps the chosen animal and derives legacy profiles', () => {
    expect(ownedCharacters(['poulpe'], 'poulpe', 0)).toEqual(['poulpe'])
    expect(ownedCharacters(undefined, 'dauphin', 7)).toEqual(['dauphin', 'tortue', 'poulpe'])
    expect(ownedCharacters(undefined, 'raie', 0)).toEqual(['dauphin', 'raie'])
  })
})
