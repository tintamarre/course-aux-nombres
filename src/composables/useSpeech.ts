/**
 * French speech through the Web Speech API. Every number the child sees can also be heard,
 * which is central to the "linking representations" principle of the game.
 */
import { useSettings } from './useSettings'

const settings = useSettings()
let voice: SpeechSynthesisVoice | null = null

function pickVoice(): void {
  if (!('speechSynthesis' in window)) return
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'))
  voice =
    voices.find((v) => v.lang === 'fr-BE') ??
    voices.find((v) => v.lang === 'fr-FR' && /amélie|audrey|thomas|google/i.test(v.name)) ??
    voices.find((v) => v.lang === 'fr-FR') ??
    voices[0] ??
    null
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice()
  speechSynthesis.addEventListener('voiceschanged', pickVoice)
}

export const speechAvailable = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Speak a sentence and resolve when it is over (or after a fallback delay when speech is off). */
export function say(text: string, rate = 1): Promise<void> {
  if (!settings.voice || !speechAvailable()) return wait(Math.min(1600, 250 + text.length * 45))
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = voice?.lang ?? 'fr-FR'
    if (voice) u.voice = voice
    u.rate = settings.voiceRate * rate
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    u.onend = finish
    u.onerror = finish
    // some browsers never fire onend: resolve anyway
    setTimeout(finish, 1500 + text.length * 120)
    speechSynthesis.speak(u)
  })
}

export function hush(): void {
  if (speechAvailable()) speechSynthesis.cancel()
}
