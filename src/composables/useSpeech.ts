/**
 * French speech through the Web Speech API. Every number the child sees can also be heard,
 * which is central to the "linking representations" principle of the game.
 *
 * Tablet notes: iOS only allows speech (and Web Audio) after a user gesture, so `unlockAudio`
 * is called on the first touch. Utterances are kept referenced until they end, otherwise
 * Chrome may garbage-collect them and never fire `onend`.
 */
import { useSettings } from './useSettings'

const settings = useSettings()
let voice: SpeechSynthesisVoice | null = null
const live = new Set<SpeechSynthesisUtterance>()

export const speechAvailable = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window

function pickVoice(): void {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('fr'))
  const local = voices.filter((v) => v.localService)
  const pool = local.length ? local : voices
  voice =
    pool.find((v) => /fr-BE/i.test(v.lang)) ??
    pool.find((v) => /fr-FR/i.test(v.lang) && /amélie|audrey|thomas|marie/i.test(v.name)) ??
    pool.find((v) => /fr-FR/i.test(v.lang)) ??
    pool[0] ??
    null
}

if (speechAvailable()) {
  pickVoice()
  speechSynthesis.addEventListener('voiceschanged', pickVoice)
}

let unlocked = false
/** Call from a user gesture: wakes up speech synthesis on iOS. */
export function unlockSpeech(): void {
  if (unlocked || !speechAvailable()) return
  unlocked = true
  const u = new SpeechSynthesisUtterance(' ')
  u.volume = 0
  speechSynthesis.speak(u)
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function utterance(text: string, rate: number): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text)
  u.lang = voice?.lang ?? 'fr-FR'
  if (voice) u.voice = voice
  u.rate = Math.min(2, settings.voiceRate * rate)
  return u
}

function speak(u: SpeechSynthesisUtterance, maxMs: number, onBoundary?: (charIndex: number) => void): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      live.delete(u)
      resolve()
    }
    u.onend = finish
    u.onerror = finish
    if (onBoundary) u.onboundary = (e) => onBoundary(e.charIndex)
    live.add(u)
    // safety net when onend never comes (some engines)
    setTimeout(finish, maxMs)
    speechSynthesis.speak(u)
  })
}

/** Speak a sentence and resolve when it is over (or after a short delay when speech is off). */
export function say(text: string, rate = 1): Promise<void> {
  if (!settings.voice || !speechAvailable()) return wait(Math.min(1200, 200 + text.length * 35))
  return speak(utterance(text, rate), 2500 + text.length * 110)
}

/** Fire-and-forget, used for counting taps: does not wait, does not cancel what is being said. */
export function sayNow(text: string, rate = 1.1): void {
  if (!settings.voice || !speechAvailable()) return
  void speak(utterance(text, rate), 3000)
}

/**
 * Count aloud "un, deux, trois…" as ONE utterance (much smoother than one utterance per number)
 * and call onTick(k) as each number is spoken. Uses word boundaries when the engine reports
 * them, a timer otherwise; every tick is guaranteed to fire before the promise resolves.
 */
export async function countAloud(words: string[], onTick: (k: number) => void, rate = 1.2): Promise<void> {
  let next = 0
  const tick = (upTo: number) => {
    while (next <= upTo && next < words.length) onTick(++next)
  }
  const step = 420 / (settings.voiceRate * rate)
  if (!settings.voice || !speechAvailable()) {
    for (let k = 0; k < words.length; k++) {
      tick(k)
      await wait(step)
    }
    return
  }
  const text = words.join(', ')
  const starts = words.map((_, k) => words.slice(0, k).join(', ').length + (k ? 2 : 0))
  let boundaries = false
  let timer: ReturnType<typeof setInterval> | undefined
  const u = utterance(text, rate)
  u.onstart = () => {
    tick(0)
    // fallback cadence if no boundary event arrives
    let k = 0
    timer = setInterval(() => {
      if (!boundaries) tick(++k)
    }, step)
  }
  await speak(u, 1500 + words.length * 900, (charIndex) => {
    boundaries = true
    tick(starts.filter((s) => s <= charIndex).length - 1)
  })
  clearInterval(timer)
  tick(words.length)
}

export function hush(): void {
  if (speechAvailable()) speechSynthesis.cancel()
  live.clear()
}
