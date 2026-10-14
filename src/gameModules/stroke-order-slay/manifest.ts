export const gameManifest = { id: 'copy-hide-write-combo', title: 'Stroke-order Slay', description: 'Follow the animated stroke order, trace the character by touch, then hide it, write it, and compare.', activityLabel: 'Trace and write', channels: ['tier-1-writing'], skills: ['writing'], inputKind: 'production', estimatedSeconds: [120, 240] } as const

const sharedGradeManifest = {
  activityLabel: 'Trace and write',
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
  description: 'Use large numbered guides and generous tracing support to practice simple character strokes.',
} as const

export const grade2GameManifest = {
  ...sharedGradeManifest,
  id: 'stroke-order-slay-grade-2',
  profileId: 'grade-2',
  title: 'Stroke-order Slay - 2nd',
  description: 'Trace standard stroke order, hide the guide, then write and compare the character.',
} as const

export const grade5GameManifest = {
  ...sharedGradeManifest,
  id: 'stroke-order-slay-grade-5',
  profileId: 'grade-5',
  title: 'Stroke-order Slay - 5th',
  description: 'Practice complex characters with stricter path checks and exact memory-writing stroke counts.',
} as const

export const gradeGameManifests = [kinderGameManifest, grade2GameManifest, grade5GameManifest] as const
