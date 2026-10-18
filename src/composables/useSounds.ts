/**
 * Short, soft sounds (no audio files). Kept discreet on purpose: few distractors.
 *
 * Anti-crackle measures, because tablets made a scratching noise on touch:
 * - every sound is pre-rendered once into an AudioBuffer (pure sines, raised-cosine fade in and
 *   out), so nothing is synthesised or ramped at the moment of the touch;
 * - a silent looping source keeps the audio output awake: waking the hardware from idle on each
 *   sound is what produces a "click" on iOS and macOS;
 * - the context is unlocked once, on the first user activation, not on every touch.
 */
import { useSettings } from './useSettings'
import { unlockSpeech } from './useSpeech'
import { renderNotes, type Note } from './tones'

const settings = useSettings()
let ctx: AudioContext | null = null
let master: GainNode | null = null
let unlocked = false
const buffers = new Map<string, AudioBuffer>()

function render(a: AudioContext, notes: Note[]): AudioBuffer {
  const data = renderNotes(a.sampleRate, notes)
  const buf = a.createBuffer(1, data.length, a.sampleRate)
  buf.getChannelData(0).set(data)
  return buf
}

function build(a: AudioContext): void {
  for (let k = 0; k <= 9; k++) buffers.set(`coin${k}`, render(a, [{ f: 880 + k * 45, t: 0, d: 0.16, g: 0.22 }]))
  buffers.set('tap', render(a, [{ f: 660, t: 0, d: 0.09, g: 0.16 }]))
  buffers.set('hop', render(a, [{ f: 520, t: 0, d: 0.08, g: 0.12 }]))
  buffers.set('win', render(a, [523, 659, 784].map((f, i) => ({ f, t: i * 0.09, d: 0.28, g: 0.2 }))))
  buffers.set('lose', render(a, [392, 330].map((f, i) => ({ f, t: i * 0.13, d: 0.3, g: 0.18 }))))
  buffers.set('ouch', render(a, [{ f: 247, t: 0, d: 0.32, g: 0.22 }]))
  buffers.set('reward', render(a, [523, 659, 784, 1047].map((f, i) => ({ f, t: i * 0.11, d: 0.4, g: 0.2 }))))
}

/** Call from a user activation (pointerup / touchend): starts Web Audio and speech on iOS. */
export function unlockAudio(): void {
  if (unlocked) {
    if (ctx?.state === 'suspended') void ctx.resume()
    return
  }
  unlocked = true
  unlockSpeech()
  ctx = new AudioContext({ latencyHint: 'interactive' })
  master = ctx.createGain()
  master.gain.value = 0.6
  master.connect(ctx.destination)
  build(ctx)
  // keep the output awake with a silent loop (prevents the wake-up click before each sound)
  const keepAlive = ctx.createBufferSource()
  keepAlive.buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  keepAlive.loop = true
  keepAlive.connect(master)
  keepAlive.start()
  void ctx.resume()
  // resume after the tab comes back (iOS suspends audio in the background)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx?.state !== 'running') void ctx?.resume()
  })
}

function play(name: string): void {
  if (!settings.sounds || !ctx || !master || ctx.state !== 'running') return
  const buf = buffers.get(name)
  if (!buf) return
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(master)
  src.start(ctx.currentTime + 0.005)
}

export const sounds = {
  coin: (k = 0) => play(`coin${Math.min(9, Math.max(0, k))}`),
  win: () => play('win'),
  lose: () => play('lose'),
  hop: () => play('hop'),
  ouch: () => play('ouch'),
  reward: () => play('reward'),
  tap: () => play('tap'),
}
