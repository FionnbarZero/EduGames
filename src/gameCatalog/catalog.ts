import type { LearningGameDefinition } from './contracts'
import { gameManifest as contextGapDash } from '../gameModules/context-gap-dash/manifest'
import { gameManifest as dictationStreak } from '../gameModules/dictation-streak/manifest'
import { gameManifest as lilyPadPath } from '../gameModules/lily-pad-path/manifest'
import { gameManifest as memoryLanterns } from '../gameModules/memory-lanterns/manifest'
import { gameManifest as shurikenMatch } from '../gameModules/speed-match/manifest'
import { gameManifest as spellerBee } from '../gameModules/speller-bee/manifest'
import { gameManifest as strokeOrderSlay } from '../gameModules/stroke-order-slay/manifest'
import { gameManifest as sushiScramble } from '../gameModules/sushi-scramble/manifest'
import { gameManifest as shadowStrikeDojo } from '../gameModules/target-blast/manifest'
import { gameManifest as whisperingScrolls } from '../gameModules/whispering-scrolls/manifest'
import { gameManifest as rainbowReading } from '../gameModules/rainbow-reading/manifest'

export const LEARNING_GAME_CATALOG = [
  shurikenMatch,
  shadowStrikeDojo,
  lilyPadPath,
  memoryLanterns,
  contextGapDash,
  sushiScramble,
  whisperingScrolls,
  rainbowReading,
  dictationStreak,
  spellerBee,
  strokeOrderSlay,
] as const satisfies readonly LearningGameDefinition[]
