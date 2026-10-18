/** Ranking of the French voices offered by the device (pure, so it can be unit-tested). */
export interface VoiceInfo {
  name: string
  lang: string
  localService: boolean
}

const norm = (lang: string) => lang.toLowerCase().replace('_', '-')

const NOVELTY = /compact|eloquence|grandma|grandpa|rocko|shelley|sandy|flo|reed|eddy|bad news|bubbles|jester|organ|whisper|zarvox|trinoids|cellos|bells|boing/

/** French voices, without the novelty voices of macOS / iOS (Grandma, Rocko…) */
export const isFrench = (v: VoiceInfo): boolean => norm(v.lang).startsWith('fr') && !NOVELTY.test(v.name.toLowerCase())

/**
 * Higher is better. Quality first (enhanced / premium / neural voices sound far more natural),
 * then the variety of French: Belgian or France French before Swiss, Canadian last (strong accent).
 */
export function voiceScore(v: VoiceInfo): number {
  const lang = norm(v.lang)
  const name = v.name.toLowerCase()
  let score = 0
  if (lang === 'fr-be' || lang === 'fr-fr' || lang === 'fr') score += 30
  else if (lang === 'fr-ch') score += 20
  else if (lang === 'fr-ca') score += 5
  if (/premium|enhanced|améliorée|amelioree|neural|natural|naturelle|online/.test(name)) score += 50
  if (/google/.test(name)) score += 40
  if (/microsoft/.test(name)) score += 10
  // pleasant default voices on Apple devices
  if (/audrey|thomas|aurélie|aurelie|marie|virginie/.test(name)) score += 8
  return score
}

export function bestVoice<T extends VoiceInfo>(voices: T[]): T | null {
  return voices.filter(isFrench).sort((a, b) => voiceScore(b) - voiceScore(a))[0] ?? null
}
