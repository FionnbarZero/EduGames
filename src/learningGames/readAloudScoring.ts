export type ReadAloudModel = {
  readonly text: string
  readonly url: string
}

export type AcousticWordScore = {
  readonly matchedText: string
  readonly bestDistance: number
  readonly targetDistance: number
  readonly runnerUpDistance: number
  readonly separation: number
}

type AudioSignal = {
  readonly samples: Float32Array
  readonly sampleRate: number
}

const modelFeatureCache = new Map<string, Promise<readonly Float64Array[]>>()

function trimSilence(signal: AudioSignal): AudioSignal | null {
  const frameSize = Math.max(256, Math.round(signal.sampleRate * .02))
  const frameLevels: number[] = []
  let loudestFrame = 0

  for (let start = 0; start < signal.samples.length; start += frameSize) {
    const end = Math.min(signal.samples.length, start + frameSize)
    let squaredTotal = 0
    for (let index = start; index < end; index += 1) squaredTotal += signal.samples[index] * signal.samples[index]
    const level = Math.sqrt(squaredTotal / Math.max(1, end - start))
    frameLevels.push(level)
    loudestFrame = Math.max(loudestFrame, level)
  }

  if (loudestFrame < .008) return null
  const threshold = Math.max(.006, loudestFrame * .12)
  const firstVoicedFrame = frameLevels.findIndex((level) => level >= threshold)
  let lastVoicedFrame = -1
  for (let index = frameLevels.length - 1; index >= 0; index -= 1) {
    if (frameLevels[index] >= threshold) {
      lastVoicedFrame = index
      break
    }
  }
  if (firstVoicedFrame < 0 || lastVoicedFrame < firstVoicedFrame) return null

  const start = Math.max(0, (firstVoicedFrame - 2) * frameSize)
  const end = Math.min(signal.samples.length, (lastVoicedFrame + 3) * frameSize)
  if ((end - start) / signal.sampleRate < .16) return null
  return { samples: signal.samples.slice(start, end), sampleRate: signal.sampleRate }
}

function nextPowerOfTwo(value: number) {
  let power = 1
  while (power < value) power *= 2
  return power
}

function powerSpectrum(frame: Float32Array, fftSize: number) {
  const real = new Float64Array(fftSize)
  const imaginary = new Float64Array(fftSize)
  const denominator = Math.max(1, frame.length - 1)
  for (let index = 0; index < frame.length; index += 1) {
    const emphasized = frame[index] - .97 * (index ? frame[index - 1] : 0)
    real[index] = emphasized * (.54 - .46 * Math.cos(2 * Math.PI * index / denominator))
  }

  for (let index = 1, reversed = 0; index < fftSize; index += 1) {
    let bit = fftSize >> 1
    for (; reversed & bit; bit >>= 1) reversed ^= bit
    reversed ^= bit
    if (index < reversed) {
      const temporary = real[index]
      real[index] = real[reversed]
      real[reversed] = temporary
    }
  }

  for (let size = 2; size <= fftSize; size *= 2) {
    const angle = -2 * Math.PI / size
    const stepReal = Math.cos(angle)
    const stepImaginary = Math.sin(angle)
    for (let start = 0; start < fftSize; start += size) {
      let rotationReal = 1
      let rotationImaginary = 0
      for (let offset = 0; offset < size / 2; offset += 1) {
        const evenIndex = start + offset
        const oddIndex = evenIndex + size / 2
        const oddReal = real[oddIndex] * rotationReal - imaginary[oddIndex] * rotationImaginary
        const oddImaginary = real[oddIndex] * rotationImaginary + imaginary[oddIndex] * rotationReal
        real[oddIndex] = real[evenIndex] - oddReal
        imaginary[oddIndex] = imaginary[evenIndex] - oddImaginary
        real[evenIndex] += oddReal
        imaginary[evenIndex] += oddImaginary
        const nextRotationReal = rotationReal * stepReal - rotationImaginary * stepImaginary
        rotationImaginary = rotationReal * stepImaginary + rotationImaginary * stepReal
        rotationReal = nextRotationReal
      }
    }
  }

  const spectrum = new Float64Array(fftSize / 2 + 1)
  for (let index = 0; index < spectrum.length; index += 1) spectrum[index] = (real[index] * real[index] + imaginary[index] * imaginary[index]) / fftSize
  return spectrum
}

function hertzToMel(frequency: number) {
  return 2595 * Math.log10(1 + frequency / 700)
}

function melToHertz(mel: number) {
  return 700 * (10 ** (mel / 2595) - 1)
}

function melFilterBins(sampleRate: number, fftSize: number, filterCount: number) {
  const minimumMel = hertzToMel(80)
  const maximumMel = hertzToMel(Math.min(8000, sampleRate / 2))
  return Array.from({ length: filterCount + 2 }, (_, index) => {
    const mel = minimumMel + (maximumMel - minimumMel) * index / (filterCount + 1)
    return Math.min(fftSize / 2, Math.floor((fftSize + 1) * melToHertz(mel) / sampleRate))
  })
}

function extractFeatures(untrimmedSignal: AudioSignal) {
  const signal = trimSilence(untrimmedSignal)
  if (!signal) return null
  const frameLength = Math.max(256, Math.round(signal.sampleRate * .025))
  const hopLength = Math.max(128, Math.round(signal.sampleRate * .01))
  const fftSize = nextPowerOfTwo(frameLength)
  const filterCount = 24
  const coefficientCount = 12
  const filterBins = melFilterBins(signal.sampleRate, fftSize, filterCount)
  const features: Float64Array[] = []

  for (let start = 0; start + frameLength <= signal.samples.length; start += hopLength) {
    const spectrum = powerSpectrum(signal.samples.subarray(start, start + frameLength), fftSize)
    const logEnergies = new Float64Array(filterCount)
    for (let filterIndex = 0; filterIndex < filterCount; filterIndex += 1) {
      const left = filterBins[filterIndex]
      const center = Math.max(left + 1, filterBins[filterIndex + 1])
      const right = Math.max(center + 1, filterBins[filterIndex + 2])
      let energy = 0
      for (let bin = left; bin < center && bin < spectrum.length; bin += 1) energy += spectrum[bin] * (bin - left) / (center - left)
      for (let bin = center; bin <= right && bin < spectrum.length; bin += 1) energy += spectrum[bin] * (right - bin) / (right - center)
      logEnergies[filterIndex] = Math.log(Math.max(energy, 1e-12))
    }

    const coefficients = new Float64Array(coefficientCount)
    for (let coefficient = 0; coefficient < coefficientCount; coefficient += 1) {
      let total = 0
      for (let filterIndex = 0; filterIndex < filterCount; filterIndex += 1) total += logEnergies[filterIndex] * Math.cos(Math.PI * coefficient * (filterIndex + .5) / filterCount)
      coefficients[coefficient] = total
    }
    features.push(coefficients)
  }

  if (features.length < 3) return null
  for (let coefficient = 0; coefficient < coefficientCount; coefficient += 1) {
    const mean = features.reduce((total, frame) => total + frame[coefficient], 0) / features.length
    const deviation = Math.sqrt(features.reduce((total, frame) => total + (frame[coefficient] - mean) ** 2, 0) / features.length) || 1
    for (const frame of features) frame[coefficient] = (frame[coefficient] - mean) / deviation
  }
  return features
}

function frameDistance(left: Float64Array, right: Float64Array) {
  let squaredTotal = 0
  for (let index = 0; index < left.length; index += 1) squaredTotal += (left[index] - right[index]) ** 2
  return Math.sqrt(squaredTotal / left.length)
}

function dynamicTimeWarping(left: readonly Float64Array[], right: readonly Float64Array[]) {
  const columns = right.length + 1
  const previous = new Float64Array(columns).fill(Number.POSITIVE_INFINITY)
  const previousSteps = new Uint16Array(columns)
  previous[0] = 0

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = new Float64Array(columns).fill(Number.POSITIVE_INFINITY)
    const currentSteps = new Uint16Array(columns)
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const candidates = [
        { cost: previous[rightIndex - 1], steps: previousSteps[rightIndex - 1] },
        { cost: previous[rightIndex], steps: previousSteps[rightIndex] },
        { cost: current[rightIndex - 1], steps: currentSteps[rightIndex - 1] },
      ]
      let best = candidates[0]
      if (candidates[1].cost < best.cost) best = candidates[1]
      if (candidates[2].cost < best.cost) best = candidates[2]
      current[rightIndex] = best.cost + frameDistance(left[leftIndex - 1], right[rightIndex - 1])
      currentSteps[rightIndex] = best.steps + 1
    }
    previous.set(current)
    previousSteps.set(currentSteps)
  }
  return previous[right.length] / Math.max(1, previousSteps[right.length])
}

function audioBufferSignal(buffer: AudioBuffer): AudioSignal {
  if (buffer.numberOfChannels === 1) return { samples: buffer.getChannelData(0), sampleRate: buffer.sampleRate }
  const samples = new Float32Array(buffer.length)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const channelSamples = buffer.getChannelData(channel)
    for (let index = 0; index < samples.length; index += 1) samples[index] += channelSamples[index] / buffer.numberOfChannels
  }
  return { samples, sampleRate: buffer.sampleRate }
}

async function modelFeatures(model: ReadAloudModel, audioContext: AudioContext) {
  let cached = modelFeatureCache.get(model.url)
  if (!cached) {
    cached = fetch(model.url)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${model.url}`)
        return response.arrayBuffer()
      })
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((buffer) => extractFeatures(audioBufferSignal(buffer)))
      .then((features) => {
        if (!features) throw new Error(`Could not analyze ${model.url}`)
        return features
      })
      .catch((error) => {
        modelFeatureCache.delete(model.url)
        throw error
      })
    modelFeatureCache.set(model.url, cached)
  }
  return cached
}

export async function scoreRecordedWord(recording: Blob, targetText: string, models: readonly ReadAloudModel[]): Promise<AcousticWordScore | null> {
  let audioContext: AudioContext | null = null
  try {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextConstructor || !models.length) return null
    audioContext = new AudioContextConstructor()
    const recordedBuffer = await audioContext.decodeAudioData(await recording.arrayBuffer())
    const recordedFeatures = extractFeatures(audioBufferSignal(recordedBuffer))
    if (!recordedFeatures) return null
    const comparisons = await Promise.all(models.map(async (model) => ({
      text: model.text,
      distance: dynamicTimeWarping(recordedFeatures, await modelFeatures(model, audioContext!)),
    })))
    comparisons.sort((left, right) => left.distance - right.distance)
    const best = comparisons[0]
    const target = comparisons.find((comparison) => comparison.text === targetText)
    if (!best || !target) return null
    const runnerUp = comparisons[1] || best
    const separation = Math.max(0, (runnerUp.distance - best.distance) / Math.max(runnerUp.distance, .001))
    return {
      matchedText: best.text,
      bestDistance: best.distance,
      targetDistance: target.distance,
      runnerUpDistance: runnerUp.distance,
      separation,
    }
  } catch {
    return null
  } finally {
    await audioContext?.close().catch(() => undefined)
  }
}
