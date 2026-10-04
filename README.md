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
Read-Aloud Boss Rush also requires browser microphone permission.

## Checks

```sh
npm test
```

The test command validates the checked-in audio recordings, type-checks the
application, and creates a production build in `dist/`.

## Project layout

- `src/gameModules/` contains the ten independent, copy-ready React game modules.
- Each game module owns its component, public types, runtime helpers, styles,
  manifest, documentation, and any game-specific artwork or recordings.
- `src/gameCatalog/` is the optional host catalog used by this playground; copied
  game modules do not depend on it.
- `public/audio/` contains only the host playground's shared sample recordings.
- `construct/lily-pad-path/` preserves the editable Construct project source;
  the live Lily-Pad Path game is the React/Phaser implementation.
- `.github/workflows/deploy-pages.yml` builds and deploys `main` to GitHub Pages.

See [`src/gameModules/README.md`](src/gameModules/README.md) for the portability
contract and the public component exported by each module.
