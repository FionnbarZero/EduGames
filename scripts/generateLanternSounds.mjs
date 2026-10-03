import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sampleRate = 44_100
const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../public/audio/lanterns')

function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
}

function pluck(time, note) {
  const elapsed = time - note.at
  if (elapsed < 0 || elapsed >= note.duration) return 0
  const attack = smoothstep(elapsed / .008)
  const tail = smoothstep((note.duration - elapsed) / .055)
  const decay = Math.exp(-5.4 * elapsed / note.duration)
  const bend = .0015 * (1 - Math.exp(-38 * elapsed))
  const phase = Math.PI * 2 * note.frequency * (elapsed + bend)
  const body = Math.sin(phase)
    + .23 * Math.sin(phase * 2 + .18)
    + .085 * Math.sin(phase * 3 + .42)
    + .035 * Math.sin(phase * 4.02 + .71)
  const finger = Math.sin(phase * 6.7) * Math.exp(-54 * elapsed) * .09
  return (body + finger) * attack * tail * decay * note.amplitude
}

function render(notes, durationSeconds) {
  const frameCount = Math.ceil(durationSeconds * sampleRate)
  const left = new Float64Array(frameCount)
  const right = new Float64Array(frameCount)

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / sampleRate
    for (const note of notes) {
      const sample = pluck(time, note)
      left[frame] += sample * Math.sqrt((1 - note.pan) / 2)
      right[frame] += sample * Math.sqrt((1 + note.pan) / 2)
    }
  }

  let peak = .0001
  for (let frame = 0; frame < frameCount; frame += 1) peak = Math.max(peak, Math.abs(left[frame]), Math.abs(right[frame]))
  const scale = .56 / peak
  const dataSize = frameCount * 4
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(2, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 4, 28)
  buffer.writeUInt16LE(4, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let frame = 0; frame < frameCount; frame += 1) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[frame] * scale)) * 32767), 44 + frame * 4)
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[frame] * scale)) * 32767), 46 + frame * 4)
  }
  return buffer
}

const sounds = {
  'flip.wav': {
    duration: .16,
    notes: [{ at: 0, frequency: 659.25, duration: .15, amplitude: .72, pan: 0 }],
  },
  'match.wav': {
    duration: .82,
    notes: [
      { at: 0, frequency: 392, duration: .54, amplitude: .62, pan: -.24 },
      { at: .115, frequency: 523.25, duration: .56, amplitude: .58, pan: .2 },
      { at: .23, frequency: 587.33, duration: .57, amplitude: .54, pan: 0 },
    ],
  },
  'miss.wav': {
    duration: .68,
    notes: [
      { at: 0, frequency: 329.63, duration: .47, amplitude: .54, pan: -.12 },
      { at: .14, frequency: 293.66, duration: .52, amplitude: .45, pan: .12 },
    ],
  },
  'victory.wav': {
    duration: 1.28,
    notes: [
      { at: 0, frequency: 392, duration: .67, amplitude: .54, pan: -.3 },
      { at: .12, frequency: 440, duration: .68, amplitude: .52, pan: -.12 },
      { at: .24, frequency: 523.25, duration: .7, amplitude: .5, pan: .08 },
      { at: .37, frequency: 587.33, duration: .72, amplitude: .47, pan: .24 },
      { at: .51, frequency: 659.25, duration: .74, amplitude: .44, pan: 0 },
    ],
  },
}

mkdirSync(outputDirectory, { recursive: true })
for (const [filename, sound] of Object.entries(sounds)) {
  writeFileSync(resolve(outputDirectory, filename), render(sound.notes, sound.duration))
}
