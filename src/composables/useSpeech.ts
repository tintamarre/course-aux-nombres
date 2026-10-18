/**
 * The voice of the game. Every number the child sees can also be heard, which is central to the
 * "linking representations" principle of the game.
 *
 * Sentences are played from RECORDED clips (public/audio, generated once with a Piper voice,
 * see scripts/audio) through Web Audio: same voice on every device, sample-accurate start, no
 * clicks. The Web Speech API (speech synthesis of the device) is only a fallback for a sentence
 * that has no clip.
 *
 * Tablet notes: iOS only allows speech (and Web Audio) after a user gesture, so `unlockAudio`
 * is called on the first touch. Utterances are kept referenced until they end, otherwise
 * Chrome may garbage-collect them and never fire `onend`.
 */
import { ref } from 'vue'
import { useSettings } from './useSettings'
import { getAudioContext } from './useSounds'
import { bestVoice, isFrench, voiceScore } from './voices'
import manifest from '../data/audio-manifest.json'

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
/** dev only: ?mute keeps the real speech queue (events, timings) but silent, for automated play tests */
const muted = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('mute')

/* ---------- recorded clips ---------- */
const clipFiles: Record<string, string> = manifest.clips
const clipBase = import.meta.env.BASE_URL + manifest.base
export const voiceCredit: string = manifest.credit
const hasClip = (text: string): boolean => text in clipFiles
const decoded = new Map<string, Promise<AudioBuffer | null>>()

function loadClip(text: string): Promise<AudioBuffer | null> {
  const ctx = getAudioContext()
  if (!ctx || !hasClip(text)) return Promise.resolve(null)
  let p = decoded.get(text)
  if (!p) {
    p = fetch(clipBase + clipFiles[text])
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => ctx.decodeAudioData(b))
      .catch(() => {
        decoded.delete(text)
        return null
      })
    decoded.set(text, p)
  }
  return p
}

/** Fetch and decode every clip in the background (called once audio is unlocked). */
let preloading = false
export async function preloadClips(): Promise<void> {
  if (preloading || !getAudioContext()) return
  preloading = true
  for (const text of Object.keys(clipFiles)) await loadClip(text)
}

let current: { src: AudioBufferSourceNode; gain: GainNode } | null = null

function playBuffer(buf: AudioBuffer): Promise<void> {
  const ctx = getAudioContext()
  if (!ctx) return Promise.resolve()
  return new Promise((resolve) => {
    if (ctx.state === 'suspended') void ctx.resume()
    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = muted ? 0 : 1
    src.buffer = buf
    src.connect(gain).connect(ctx.destination)
    let done = false
    const finish = () => {
      if (done) return
      done = true
      if (current?.src === src) current = null
      gain.disconnect()
      resolve()
    }
    src.onended = finish
    // safety net if the context was suspended (tab in background)
    setTimeout(finish, buf.duration * 1000 + 600)
    current = { src, gain }
    src.start(ctx.currentTime + 0.005)
  })
}

/** Stop the clip being played with a 30 ms fade (an abrupt stop would click). */
function stopClip(): void {
  const ctx = getAudioContext()
  if (!current || !ctx) return
  const { src, gain } = current
  gain.gain.setTargetAtTime(0, ctx.currentTime, 0.01)
  try {
    src.stop(ctx.currentTime + 0.05)
  } catch {
    /* already stopped */
  }
  current = null
}

function utterance(text: string, rate: number): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text)
  u.lang = voice?.lang ?? 'fr-FR'
  if (voice) u.voice = voice
  u.rate = Math.min(2, settings.voiceRate * rate)
  if (muted) u.volume = 0
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

/** Run a speech job after the ones already queued (skipped if hush() was called in between). */
function enqueue(job: () => Promise<void>, isCurrent: () => boolean = () => true): Promise<void> {
  const gen = generation
  const run = () => (gen === generation && isCurrent() ? job() : Promise.resolve())
  const p = chain.then(run)
  chain = p.catch(() => undefined)
  return p
}

/** Say one sentence: its recorded clip if there is one, the device speech synthesis otherwise. */
async function speakText(text: string, rate: number): Promise<void> {
  const buf = await loadClip(text)
  if (buf) return playBuffer(buf)
  if (!speechAvailable()) return wait(Math.min(1200, 200 + text.length * 35))
  return speakNow(() => utterance(text, rate), 1500 + (text.length * 90) / (settings.voiceRate * rate))
}

/** Speak a sentence after the ones already queued; resolves when it is over (or after a short delay when speech is off). */
export function say(text: string, rate = 1): Promise<void> {
  if (!settings.voice) return wait(Math.min(1200, 200 + text.length * 35))
  return enqueue(() => speakText(text, rate))
}

/**
 * Counting a piece the child just touched. Nothing is cut (cutting a sound mid-word makes an
 * audible click): the word being said ends normally, and if the child tapped several pieces in
 * the meantime only the latest number is said, so the voice stays at most one word behind.
 */
let latestCount = 0
export function sayNow(text: string, rate = 1.1): void {
  if (!settings.voice) return
  const token = ++latestCount
  void enqueue(
    () => speakText(text, rate),
    () => token === latestCount,
  )
}

/**
 * Count aloud "un, deux, trois…" and call onTick(k) as each number starts. With recorded clips,
 * each number is its own clip, so every piece moves exactly when its number is heard. With the
 * speech synthesis fallback the count is ONE utterance (much smoother than one per number), with
 * word boundaries or a timer. Every tick is guaranteed to fire before the promise resolves.
 */
export async function countAloud(words: string[], onTick: (k: number) => void, rate = 1.2): Promise<void> {
  let next = 0
  const tick = (upTo: number) => {
    while (next <= upTo && next < words.length) onTick(++next)
  }
  const step = 420 / (settings.voiceRate * rate)
  if (!words.length) return
  if (settings.voice && getAudioContext() && words.every(hasClip)) {
    const gen = generation
    await enqueue(async () => {
      for (let k = 0; k < words.length && gen === generation; k++) {
        const buf = await loadClip(words[k])
        tick(k)
        if (buf) await playBuffer(buf)
        else await wait(step)
        // a short pause between numbers, a little shorter for the crab
        await wait(rate > 1.2 ? 60 : 140)
      }
    })
    tick(words.length)
    return
  }
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
  await enqueue(() =>
    speakNow(
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
    ),
  )
  clearTimeout(startGuard)
  clearInterval(timer)
  tick(words.length)
}

/** Stop speaking and drop everything still queued. */
export function hush(): void {
  generation++
  chain = Promise.resolve()
  stopClip()
  // cancel only when something is actually being said: a needless cancel can click on some systems
  if (speechAvailable() && (speechSynthesis.speaking || speechSynthesis.pending)) {
    speechSynthesis.cancel()
    lastCancel = performance.now()
  }
  live.clear()
}
