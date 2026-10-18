/** Short, soft synthesised sounds (no audio files). Kept discreet on purpose: few distractors. */
import { useSettings } from './useSettings'
import { unlockSpeech } from './useSpeech'

const settings = useSettings()
let ctx: AudioContext | null = null
let master: GainNode | null = null

function audio(): AudioContext | null {
  if (!settings.sounds) return null
  if (!ctx) {
    ctx = new AudioContext()
    // a single compressor-free master bus at low volume avoids clipping when sounds overlap
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Call from a user gesture: iOS starts Web Audio and speech only after a touch. */
export function unlockAudio(): void {
  unlockSpeech()
  const a = audio()
  if (!a || !master) return
  // play one silent sample, required by older iOS versions
  const src = a.createBufferSource()
  src.buffer = a.createBuffer(1, 1, 22050)
  src.connect(master)
  src.start(0)
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.2): void {
  const a = audio()
  if (!a || !master || a.state !== 'running') return
  const t = a.currentTime + 0.02 + start
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  // smooth attack and release: no clicks
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + duration + 0.05)
  osc.onended = () => g.disconnect()
}

export const sounds = {
  coin: (k = 0) => tone(880 + Math.min(k, 9) * 45, 0, 0.14, 'triangle', 0.12),
  win: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.15)),
  lose: () => [392, 330].forEach((f, i) => tone(f, i * 0.12, 0.28, 'sine', 0.12)),
  hop: () => tone(520, 0, 0.07, 'sine', 0.08),
  ouch: () => tone(220, 0, 0.3, 'triangle', 0.12),
  reward: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.35, 'triangle', 0.15)),
  tap: () => tone(660, 0, 0.06, 'sine', 0.08),
}
