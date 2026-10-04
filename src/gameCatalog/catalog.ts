import type {
  LearningGameChannel,
  LearningGameDefinition,
  LearningGameId,
} from './contracts.ts'
import { gameManifest as contextGapDash } from '../gameModules/context-gap-dash/manifest.ts'
import { gameManifest as dictationStreak } from '../gameModules/dictation-streak/manifest.ts'
import { gameManifest as lilyPadPath } from '../gameModules/lily-pad-path/manifest.ts'
import { gameManifest as memoryLanterns } from '../gameModules/memory-lanterns/manifest.ts'
import { gameManifest as shurikenMatch } from '../gameModules/speed-match/manifest.ts'
import { gameManifest as spellerBee } from '../gameModules/speller-bee/manifest.ts'
import { gameManifest as strokeOrderSlay } from '../gameModules/stroke-order-slay/manifest.ts'
import { gameManifest as sushiScramble } from '../gameModules/sushi-scramble/manifest.ts'
import { gameManifest as shadowStrikeDojo } from '../gameModules/target-blast/manifest.ts'
import { gameManifest as whisperingScrolls } from '../gameModules/whispering-scrolls/manifest.ts'

export const LEARNING_GAME_CATALOG = [
  shurikenMatch,
  shadowStrikeDojo,
  lilyPadPath,
  memoryLanterns,
  contextGapDash,
  sushiScramble,
  whisperingScrolls,
  dictationStreak,
  spellerBee,
  strokeOrderSlay,
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
