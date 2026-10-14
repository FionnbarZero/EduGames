export const gameManifest = { id: 'copy-hide-write-combo', title: 'Stroke-order Slay', description: 'Finish the last stroke, then the last two, and build up to writing the whole character.', activityLabel: 'Finish and build', channels: ['tier-1-writing'], skills: ['writing'], inputKind: 'production', estimatedSeconds: [120, 240] } as const

const sharedGradeManifest = {
  activityLabel: 'Finish and build',
  channels: ['tier-1-writing'],
  skills: ['writing'],
  inputKind: 'production',
  estimatedSeconds: [120, 240],
} as const

export const kinderGameManifest = {
  ...sharedGradeManifest,
  id: 'stroke-order-slay-kinder',
  profileId: 'kinder',
  title: 'Stroke-order Slay - Kinder',
  description: 'Start with the last stroke and build up to the whole character with big guides and gentle tracing support.',
} as const

export const grade2GameManifest = {
  ...sharedGradeManifest,
  id: 'stroke-order-slay-grade-2',
  profileId: 'grade-2',
  title: 'Stroke-order Slay - 2nd',
  description: 'Finish the last stroke, then the last two, until you can write the whole character from memory.',
} as const

export const grade5GameManifest = {
  ...sharedGradeManifest,
  id: 'stroke-order-slay-grade-5',
  profileId: 'grade-5',
  title: 'Stroke-order Slay - 5th',
  description: 'Build complex characters from the final stroke to the whole character with precise stroke-order checks.',
} as const

export const gradeGameManifests = [kinderGameManifest, grade2GameManifest, grade5GameManifest] as const
