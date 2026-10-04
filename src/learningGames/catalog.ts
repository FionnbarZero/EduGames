import type {
  LearningGameChannel,
  LearningGameDefinition,
  LearningGameId,
} from './contracts.ts'

export const LEARNING_GAME_CATALOG = [
  {
    id: 'speed-match',
    title: 'Shuriken Match',
    description: 'Hear and match Mandarin word seals with their English shadows before the ninja reaches the moon gate.',
    activityLabel: 'Ninja fluency',
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
    title: 'Memory Lanterns',
    description: 'Light ten lanterns beneath a sunset pergola and find all five Mandarin–English pairs.',
    activityLabel: 'Match lanterns',
    channels: ['tier-1-writing', 'tier-2-reading'],
    skills: ['receptive'],
    inputKind: 'pairs',
    estimatedSeconds: [60, 120],
  },
  {
    id: 'context-gap-dash',
    title: 'Context Gap Dash',
    description: 'Listen to the Mandarin sentence, hear each choice, then send Kai racing through the correct word gate.',
    activityLabel: 'Complete sentences',
    channels: ['tier-2-reading'],
    skills: ['reading', 'receptive'],
    inputKind: 'context',
    estimatedSeconds: [90, 150],
  },
  {
    id: 'sentence-scramble',
    title: 'Sushi Scramble',
    description: 'Listen to the Mandarin sentence, then use chopsticks to serve its sushi words in the correct order.',
    activityLabel: 'Build sentences',
    channels: ['tier-2-reading'],
    skills: ['reading', 'receptive'],
    inputKind: 'sequence',
    estimatedSeconds: [60, 120],
  },
  {
    id: 'read-aloud-boss-rush',
    title: 'Read-Aloud Boss Rush',
    description: 'Read each Mandarin word aloud, compare it with the recorded model, and receive an automatic speech-match score.',
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
    id: 'speller-bee',
    title: 'SpellerBee',
    description: 'Hear an English word, type its spelling, reveal the answer, and score your attempt.',
    activityLabel: 'Listen and spell',
    channels: ['tier-1-writing'],
    skills: ['writing'],
    inputKind: 'production',
    estimatedSeconds: [120, 240],
  },
  {
    id: 'copy-hide-write-combo',
    title: 'Stroke-order Slay',
    description: 'Follow the animated stroke order, trace the character by touch, then hide it, write it, and compare.',
    activityLabel: 'Trace and write',
    channels: ['tier-1-writing'],
    skills: ['writing'],
    inputKind: 'production',
    estimatedSeconds: [120, 240],
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
