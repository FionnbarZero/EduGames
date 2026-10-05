# EduGames

An arcade-style collection of Mandarin and English reading, listening, speaking,
spelling, and handwriting games.

## Run locally

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open the URL printed by Vite, then choose **Play game** on any catalog card.
Challenge of the Whispering Scrolls also requires browser microphone permission.

## Checks

```sh
npm test
```

The test command verifies module import boundaries and asset ownership, rejects
orphaned public files and TypeScript-extension imports, validates the checked-in
audio recordings, runs strict TypeScript checks, creates a production build,
enforces bundle/image budgets, and runs Playwright gameplay, mobile-layout, keyboard,
and accessibility checks in Chromium.

The host stores versioned practice sessions in browser local storage. Completed and
exited sessions remain distinct; continuing an exited session starts again at the
first prompt while preserving earlier attempts as a separate record.

The sample content is registered through a validated curriculum-pack contract in
`src/gameCatalog/curriculum.ts`, including learner and target levels. Whispering
Scrolls is explicitly marked as a safety preview until its pronunciation fixtures
have broader learner calibration.

Audio-generation scripts use the macOS `say` command. Generated recordings are
checked in, so Linux CI and copied game modules do not need `say` at runtime.

## Project layout

- `src/gameModules/` contains the eleven independent, copy-ready React game modules.
- Each game module owns its component, public types, runtime helpers, styles,
  manifest, documentation, and any game-specific artwork or recordings.
- Runtime helpers are intentionally duplicated between module folders. This is
  the portability boundary: deleting those copies would make modules depend on
  this repository when moved elsewhere.
- `src/gameCatalog/` is the optional host catalog used by this playground; copied
  game modules do not depend on it.
- `public/audio/` contains only the host playground's shared sample recordings.
- `construct/lily-pad-path/` preserves the editable Construct project source;
  the live Lily-Pad Path game is the React/Phaser implementation.
- `.github/workflows/deploy-pages.yml` builds and deploys `main` to GitHub Pages.

See [`src/gameModules/README.md`](src/gameModules/README.md) for the portability
contract and the public component exported by each module.
