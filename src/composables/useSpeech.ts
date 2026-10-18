/**
 * French speech through the Web Speech API. Every number the child sees can also be heard,
 * which is central to the "linking representations" principle of the game.
 *
 * Tablet notes: iOS only allows speech (and Web Audio) after a user gesture, so `unlockAudio`
 * is called on the first touch. Utterances are kept referenced until they end, otherwise
 * Chrome may garbage-collect them and never fire `onend`.
 */
import { ref } from 'vue'
import { useSettings } from './useSettings'
import { bestVoice, isFrench, voiceScore } from './voices'

const settings = useSettings()
let voice: SpeechSynthesisVoice | null = null
/** French voices of the device, best first (for the voice picker of the adult space) */
export const frenchVoices = ref<SpeechSynthesisVoice[]>([])
const live = new Set<SpeechSynthesisUtterance>()

export const speechAvailable = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window

/** The voice chosen in the adult space if it exists on this device, otherwise the best French one. */
/** voices that failed on this device (error, or never started): never chosen again in this visit */
const badVoices = new Set<string>()

export function pickVoice(): void {
  const all = speechSynthesis.getVoices().filter((v) => !badVoices.has(v.voiceURI))
  frenchVoices.value = all.filter(isFrench).sort((a, b) => voiceScore(b) - voiceScore(a))
  voice = frenchVoices.value.find((v) => v.voiceURI === settings.voiceURI) ?? bestVoice(all)
}

function markBad(v: SpeechSynthesisVoice | null): void {
  if (!v) return
  console.warn(`[voix] « ${v.name} » ne fonctionne pas ici, autre voix choisie`)
  badVoices.add(v.voiceURI)
  pickVoice()
}

export const currentVoiceName = (): string => voice?.name ?? ''

if (speechAvailable()) {
  pickVoice()
  speechSynthesis.addEventListener('voiceschanged', pickVoice)
  // some browsers fill the list late and never fire voiceschanged
  setTimeout(pickVoice, 1000)
}

let unlocked = false
/** Call from a user gesture: wakes up speech synthesis on iOS. */
export function unlockSpeech(): void {
  if (unlocked || !speechAvailable()) return
  unlocked = true
  // only touch devices (iPhone, iPad, which reports itself as a Mac) need this; on a desktop
  // a whitespace utterance can stay stuck at the head of the engine queue and mute everything
  if (navigator.maxTouchPoints === 0) return
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
  // dev only: ?mute keeps the real speech queue (events, timings) but silent, for automated play tests
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('mute')) u.volume = 0
  return u
}

/**
 * All speech goes through ONE ordered queue: an utterance is handed to the engine only when the
 * previous one is over, and its safety timeout starts at that moment (not when it was queued).
 * Without this, sentences piled up in the engine, the game believed they were over while they had
 * not even started, and the voice drifted behind the screen (crab jumping to its square, reward
 * sentence heard during the next turn…). `hush()` empties the queue.
 */
let generation = 0
let chain: Promise<void> = Promise.resolve()
/** Safari may ignore an utterance spoken right after cancel(): such a speak is delayed a little */
let lastCancel = 0

/**
 * Speak one utterance and resolve when it is over. Self-healing: if the voice reports an error,
 * or nothing has started after 2 s while the engine is idle (a voice listed but unusable, as
 * happens with some voices on macOS), the voice is dropped and the sentence is retried once
 * with the next best voice, or the system default.
 */
function speakNow(make: () => SpeechSynthesisUtterance, maxMs: number, onBoundary?: (charIndex: number) => void, attempt = 0): Promise<void> {
  return new Promise((resolve) => {
    const u = make()
    let done = false
    let started = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const finish = () => {
      if (done) return
      done = true
      timers.forEach(clearTimeout)
      live.delete(u)
      resolve()
    }
    const retry = () => {
      if (done) return
      done = true
      timers.forEach(clearTimeout)
      live.delete(u)
      markBad(u.voice)
      if (attempt > 0) return resolve()
      speechSynthesis.cancel()
      lastCancel = performance.now()
      resolve(speakNow(make, maxMs, onBoundary, attempt + 1))
    }
    const onStart = u.onstart
    u.onstart = (e) => {
      started = true
      onStart?.call(u, e)
    }
    u.onend = finish
    u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? finish() : retry())
    if (onBoundary) u.onboundary = (e) => onBoundary(e.charIndex)
    live.add(u)
    // safety net when onend never comes (some engines), counted from now
    timers.push(setTimeout(finish, maxMs))
    // silent voice or stuck engine: nothing started and the engine is not even speaking
    timers.push(setTimeout(() => !started && !speechSynthesis.speaking && retry(), 2000))
    // iOS can leave the engine paused after the app went to the background
    if (speechSynthesis.paused) speechSynthesis.resume()
    const sinceCancel = performance.now() - lastCancel
    if (sinceCancel < 80) timers.push(setTimeout(() => !done && speechSynthesis.speak(u), 80 - sinceCancel))
    else speechSynthesis.speak(u)
  })
}

function enqueue(make: () => SpeechSynthesisUtterance, maxMs: number, onBoundary?: (charIndex: number) => void): Promise<void> {
  const gen = generation
  const run = () => (gen === generation ? speakNow(make, maxMs, onBoundary) : Promise.resolve())
  const p = chain.then(run)
  chain = p.catch(() => undefined)
  return p
}

/** Speak a sentence after the ones already queued; resolves when it is over (or after a short delay when speech is off). */
export function say(text: string, rate = 1): Promise<void> {
  if (!settings.voice || !speechAvailable()) return wait(Math.min(1200, 200 + text.length * 35))
  return enqueue(() => utterance(text, rate), 1500 + (text.length * 90) / (settings.voiceRate * rate))
}

/**
 * Counting a piece the child just touched: said right away, cutting the previous number if the
 * child taps faster than the voice, so that the voice never lags behind the pieces.
 */
export function sayNow(text: string, rate = 1.1): void {
  if (!settings.voice || !speechAvailable()) return
  hush()
  void enqueue(() => utterance(text, rate), 2500)
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
  if (!words.length) return
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
  let started = false
  let timer: ReturnType<typeof setInterval> | undefined
  let startGuard: ReturnType<typeof setTimeout> | undefined
  const cadence = () => {
    if (started) return
    started = true
    tick(0)
    // fallback cadence if no boundary event arrives
    let k = 0
    timer = setInterval(() => {
      if (!boundaries) tick(++k)
    }, step)
  }
  await enqueue(
    () => {
      const u = utterance(text, rate)
      u.onstart = cadence
      // some engines never fire onstart: start the cadence anyway
      startGuard = setTimeout(cadence, 600)
      return u
    },
    1500 + words.length * 700,
    (charIndex) => {
      boundaries = true
      tick(starts.filter((x) => x <= charIndex).length - 1)
    },
  )
  clearTimeout(startGuard)
  clearInterval(timer)
  tick(words.length)
}

/** Stop speaking and drop everything still queued. */
export function hush(): void {
  generation++
  chain = Promise.resolve()
  if (speechAvailable()) speechSynthesis.cancel()
  lastCancel = performance.now()
  live.clear()
}
