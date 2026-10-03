import type {
  LearningGameChannel,
  LearningGameDefinition,
  LearningGameId,
} from './contracts.ts'

export const LEARNING_GAME_CATALOG = [
  {
    id: 'speed-match',
    title: 'Speed Match',
    description: 'Pick one Mandarin tile and its English match. Keep going until every pair is connected.',
    activityLabel: 'Match pairs',
    channels: ['tier-1-writing', 'tier-2-reading'],
    skills: ['receptive'],
    inputKind: 'pairs',
    estimatedSeconds: [45, 75],
  },
  {
    id: 'target-blast',
    title: 'Shadow Strike Dojo',
    description: 'Read or hear the prompt, then help a ninja strike the matching practice target.',
    activityLabel: 'Choose answers',
    channels: ['tier-1-writing', 'tier-2-reading'],
    skills: ['receptive'],
    inputKind: 'selection',
    estimatedSeconds: [90, 150],
  },
  {
    id: 'lily-pad-path',
    title: 'Lily-Pad Path',
    description: 'Read or hear the prompt, then choose the correct lily pad to move Scout across the pond.',
    activityLabel: 'Choose answers',
    channels: ['tier-1-writing', 'tier-2-reading'],
    skills: ['receptive'],
    inputKind: 'selection',
    estimatedSeconds: [90, 150],
  },
  {
    id: 'memory-flip',
    title: 'Memory Flip',
    description: 'Turn over two tiles at a time. Find every Mandarin–English pair.',
    activityLabel: 'Find pairs',
    channels: ['tier-1-writing', 'tier-2-reading'],
    skills: ['receptive'],
    inputKind: 'pairs',
    estimatedSeconds: [60, 120],
  },
  {
    id: 'context-gap-dash',
    title: 'Context Gap Dash',
    description: 'Choose the word that completes each sentence, then watch Kai race through the correct gate.',
    activityLabel: 'Complete sentences',
    channels: ['tier-2-reading'],
    skills: ['reading', 'receptive'],
    inputKind: 'context',
    estimatedSeconds: [90, 150],
  },
  {
    id: 'sentence-scramble',
    title: 'Sentence Scramble',
    description: 'Tap the Mandarin word tiles in the order shown by the English sentence.',
    activityLabel: 'Build sentences',
    channels: ['tier-2-reading'],
    skills: ['reading', 'receptive'],
    inputKind: 'sequence',
    estimatedSeconds: [60, 120],
  },
  {
    id: 'read-aloud-boss-rush',
    title: 'Read-Aloud Boss Rush',
    description: 'Read each Mandarin word aloud, hear the model, then mark how you did.',
    activityLabel: 'Speak aloud',
    channels: ['tier-2-reading'],
    skills: ['reading'],
    inputKind: 'production',
    estimatedSeconds: [90, 180],
  },
  {
    id: 'dictation-streak',
    title: 'Dictation Streak',
    description: 'Listen to a Mandarin word, type exactly what you hear, and build a streak.',
    activityLabel: 'Listen and type',
    channels: ['tier-1-writing'],
    skills: ['writing'],
    inputKind: 'production',
    estimatedSeconds: [60, 120],
  },
  {
    id: 'copy-hide-write-combo',
    title: 'Copy–Hide–Write Combo',
    description: 'Copy the visible word once. When it disappears, type it again from memory.',
    activityLabel: 'Copy and recall',
    channels: ['tier-1-writing'],
    skills: ['writing'],
    inputKind: 'production',
    estimatedSeconds: [60, 150],
  },
  {
    id: 'correction-rescue',
    title: 'Correction Rescue',
    description: 'Copy the visible word three times, then type it once from memory.',
    activityLabel: 'Correct and recall',
    channels: ['tier-1-writing'],
    skills: ['writing'],
    inputKind: 'production',
    estimatedSeconds: [60, 150],
  },
] as const satisfies readonly LearningGameDefinition[]

export function learningGameDefinition(id: LearningGameId) {
  return LEARNING_GAME_CATALOG.find((game) => game.id === id)
}

export function learningGamesForChannel(channel: LearningGameChannel) {
  return LEARNING_GAME_CATALOG.filter((game) =>
    (game.channels as readonly LearningGameChannel[]).includes(channel))
}

export function learningGameSupportsChannel(id: LearningGameId, channel: LearningGameChannel) {
  const game = learningGameDefinition(id)
  return Boolean(game && (game.channels as readonly LearningGameChannel[]).includes(channel))
}
