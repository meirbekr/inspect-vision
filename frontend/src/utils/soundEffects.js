/**
 * src/utils/soundEffects.js
 * ─────────────────────────
 * Lightweight procedural audio synthesizer using Web Audio API.
 * Operates 100% client-side without any external audio asset dependencies.
 */

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function isSoundEnabled() {
  if (typeof window === 'undefined') return true
  return localStorage.getItem('inspect_vision_sound') !== 'false'
}

export function setSoundEnabled(enabled) {
  if (typeof window === 'undefined') return
  localStorage.setItem('inspect_vision_sound', enabled ? 'true' : 'false')
}

/**
 * Play a pleasant ascending major triad chord for PASSED inspections.
 */
export function playInspectionPassedSound() {
  if (!isSoundEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return

  const notes = [523.25, 659.25, 783.99] // C5, E5, G5
  const startTime = ctx.currentTime

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, startTime + idx * 0.08)

    gain.gain.setValueAtTime(0, startTime + idx * 0.08)
    gain.gain.linearRampToValueAtTime(0.12, startTime + idx * 0.08 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + idx * 0.08 + 0.45)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime + idx * 0.08)
    osc.stop(startTime + idx * 0.08 + 0.5)
  })
}

/**
 * Play a soft double warning tone for FAILED inspections (defects found).
 */
export function playInspectionFailedSound() {
  if (!isSoundEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return

  const startTime = ctx.currentTime
  const pulses = [
    { freq: 329.63, time: 0 },      // E4
    { freq: 261.63, time: 0.16 },   // C4
  ]

  pulses.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, startTime + time)

    gain.gain.setValueAtTime(0, startTime + time)
    gain.gain.linearRampToValueAtTime(0.15, startTime + time + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + time + 0.28)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime + time)
    osc.stop(startTime + time + 0.3)
  })
}
