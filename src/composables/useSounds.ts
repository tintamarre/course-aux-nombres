/** Short, soft synthesised sounds (no audio files). Kept discreet on purpose: few distractors. */
import { useSettings } from './useSettings'

const settings = useSettings()
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (!settings.sounds) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.12): void {
  const a = audio()
  if (!a) return
  const t = a.currentTime + start
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(g).connect(a.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

export const sounds = {
  coin: (k = 0) => tone(880 + k * 40, 0, 0.12, 'triangle', 0.08),
  win: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.1, 0.25, 'triangle')),
  lose: () => [392, 330].forEach((f, i) => tone(f, i * 0.15, 0.3, 'sine', 0.08)),
  hop: () => tone(520, 0, 0.08, 'sine', 0.06),
  ouch: () => tone(180, 0, 0.3, 'sawtooth', 0.05),
  reward: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.35, 'triangle')),
  tap: () => tone(660, 0, 0.05, 'sine', 0.05),
}
