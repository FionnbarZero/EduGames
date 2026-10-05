# Portable game modules

Every direct child folder is a complete copy-and-drop React module. A module owns its game component, public types, manifest, scoped styles, runtime helpers, and any required binary assets.

## Portability contract

- Copy one whole module folder; do not copy individual files from inside it.
- Import from the folder's `index.ts`, never from `runtime/`.
- Every relative import resolves inside the copied folder.
- Host applications provide curriculum content through `pairs` or `rounds`, an optional `playAudio` callback, and the `onExit` / `onComplete` callbacks.
- Install the external dependencies listed in that module's README.
- Styles are loaded by the module automatically.
- The destination build must support ordinary CSS imports and
  `new URL('./asset', import.meta.url)` asset URLs (Vite and webpack do).
- Repeated files under `runtime/` are deliberate. They keep each copied folder
  independent; do not replace them with imports from a shared repository path.

## Modules

| Folder | Public component | Content prop | Extra dependency |
| --- | --- | --- | --- |
| `speed-match` | `SpeedMatch` | `pairs` | — |
| `target-blast` | `TargetBlast` | `rounds` | — |
| `lily-pad-path` | `LilyPadPath` | `rounds` | `phaser` |
| `memory-lanterns` | `MemoryLanterns` | `pairs` | — |
| `context-gap-dash` | `ContextGapDash` | `rounds` | `phaser` |
| `sushi-scramble` | `SushiScramble` | `rounds` | — |
| `whispering-scrolls` | `WhisperingScrolls` | `rounds` | — |
| `rainbow-reading` | `RainbowReading` | `rounds` | — |
| `dictation-streak` | `DictationStreak` | `rounds` | — |
| `speller-bee` | `SpellerBee` | `rounds` | — |
| `stroke-order-slay` | `StrokeOrderSlay` | `rounds` | — |

All modules require `react`, `react-dom`, and `lucide-react`.
