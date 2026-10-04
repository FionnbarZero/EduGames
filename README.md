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

- `src/learningGames/` contains the modular React game implementations.
- `public/assets/` and `public/audio/` contain runtime artwork and recordings.
- `construct/lily-pad-path/` preserves the editable Construct project source;
  the live Lily-Pad Path game is the React/Phaser implementation.
- `.github/workflows/deploy-pages.yml` builds and deploys `main` to GitHub Pages.
