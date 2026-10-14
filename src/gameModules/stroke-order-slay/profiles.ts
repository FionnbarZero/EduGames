import type { StrokeAssessmentSettings } from './runtime/strokeAssessment'

export type StrokeOrderSlayProfileId = 'kinder' | 'grade-2' | 'grade-5'

export type StrokeOrderSlayProfile = {
  readonly id: StrokeOrderSlayProfileId
  readonly title: string
  readonly eyebrow: string
  readonly recommendedStrokeRange: readonly [minimum: number, maximum: number]
  readonly phaseLabels: readonly [chain: string, write: string, compare: string]
  readonly tracePrompt: string
  readonly traceSuccessMessage: string
  readonly traceErrorMessage: string
  readonly memoryKicker: string
  readonly memoryPrompt: string
  readonly memoryGuideVisible: boolean
  readonly requireMatchingMemoryStrokeCount: boolean
  readonly reviewPrompt: string
  readonly incorrectLabel: string
  readonly correctLabel: string
  readonly completionMessage: string
  readonly animationStepSeconds: number
  readonly assessment: StrokeAssessmentSettings
}

export const STROKE_ORDER_SLAY_PROFILES = {
  kinder: {
    id: 'kinder',
    title: 'Stroke-order Slay - Kinder',
    eyebrow: 'Kinder · Guided Touch Writing',
    recommendedStrokeRange: [1, 3],
    phaseLabels: ['Build', 'Whole', 'Check'],
    tracePrompt: 'Finish the character, starting with its last stroke',
    traceSuccessMessage: 'Great stroke! Follow the next number.',
    traceErrorMessage: 'Almost! Start at the number and follow the bright path.',
    memoryKicker: 'Guide stays on',
    memoryPrompt: 'Write the whole character with the numbered guide',
    memoryGuideVisible: true,
    requireMatchingMemoryStrokeCount: true,
    reviewPrompt: 'Do the two characters look alike?',
    incorrectLabel: 'Practice again',
    correctLabel: 'I did it!',
    completionMessage: 'You followed every Kinder stroke path.',
    animationStepSeconds: 1,
    assessment: {
      maximumEndpointDistance: 25,
      minimumLengthRatio: .4,
      maximumLengthRatio: 2.1,
      maximumAverageDeviation: 15,
    },
  },
  'grade-2': {
    id: 'grade-2',
    title: 'Stroke-order Slay - 2nd',
    eyebrow: '2nd Grade · Touch Writing',
    recommendedStrokeRange: [2, 8],
    phaseLabels: ['Build', 'Whole', 'Compare'],
    tracePrompt: 'Finish the remaining strokes in order',
    traceSuccessMessage: 'Stroke accepted. Follow the next numbered guide.',
    traceErrorMessage: 'That stroke missed the guide or moved in the wrong direction. Try it again.',
    memoryKicker: 'Guide hidden',
    memoryPrompt: 'Write the character from memory',
    memoryGuideVisible: false,
    requireMatchingMemoryStrokeCount: true,
    reviewPrompt: 'Does your character match the shape and stroke order?',
    incorrectLabel: 'Practice again',
    correctLabel: 'I slayed it',
    completionMessage: 'Every 2nd-grade stroke-order challenge is complete.',
    animationStepSeconds: .7,
    assessment: {
      maximumEndpointDistance: 18,
      minimumLengthRatio: .55,
      maximumLengthRatio: 1.8,
      maximumAverageDeviation: 11,
    },
  },
  'grade-5': {
    id: 'grade-5',
    title: 'Stroke-order Slay - 5th',
    eyebrow: '5th Grade · Precision Writing',
    recommendedStrokeRange: [5, 18],
    phaseLabels: ['Build', 'Whole', 'Review'],
    tracePrompt: 'Complete the remaining strokes precisely in order',
    traceSuccessMessage: 'Precise stroke accepted. Keep the order going.',
    traceErrorMessage: 'Check the start point, direction, and path, then try that stroke again.',
    memoryKicker: 'No guide · exact stroke count',
    memoryPrompt: 'Rebuild the character from memory',
    memoryGuideVisible: false,
    requireMatchingMemoryStrokeCount: true,
    reviewPrompt: 'Does your writing preserve the character shape, direction, and stroke order?',
    incorrectLabel: 'Practice it again',
    correctLabel: 'Order mastered',
    completionMessage: 'Every 5th-grade precision challenge is complete.',
    animationStepSeconds: .5,
    assessment: {
      maximumEndpointDistance: 12,
      minimumLengthRatio: .7,
      maximumLengthRatio: 1.45,
      maximumAverageDeviation: 7,
    },
  },
} as const satisfies Record<StrokeOrderSlayProfileId, StrokeOrderSlayProfile>

export function getStrokeOrderSlayProfile(profileId: StrokeOrderSlayProfileId) {
  return STROKE_ORDER_SLAY_PROFILES[profileId]
}
