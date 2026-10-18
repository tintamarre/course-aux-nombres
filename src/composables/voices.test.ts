import { describe, expect, it } from 'vitest'
import { bestVoice, voiceScore } from './voices'

const v = (name: string, lang: string, localService = true) => ({ name, lang, localService })

describe('voices', () => {
  it('prefers high-quality France or Belgian French voices', () => {
    const voices = [v('Amélie', 'fr-CA'), v('Thomas', 'fr-FR'), v('Audrey (Enhanced)', 'fr-FR'), v('Samantha', 'en-US')]
    expect(bestVoice(voices)?.name).toBe('Audrey (Enhanced)')
  })
  it('ranks Google and Microsoft Natural voices above basic local ones', () => {
    expect(voiceScore(v('Google français', 'fr-FR', false))).toBeGreaterThan(voiceScore(v('Thomas', 'fr-FR')))
    expect(voiceScore(v('Microsoft Denise Online (Natural) - French (France)', 'fr-FR', false))).toBeGreaterThan(
      voiceScore(v('Microsoft Hortense - French (France)', 'fr-FR')),
    )
  })
  it('puts Canadian French and novelty voices last, and ignores other languages', () => {
    expect(bestVoice([v('Amélie', 'fr-CA'), v('Grandma (French (France))', 'fr-FR'), v('Rocko (French (France))', 'fr-FR')])?.name).toBe('Amélie')
    expect(bestVoice([v('Samantha', 'en-US')])).toBeNull()
  })
})
