# Memory Lanterns

Copy this folder into another React project and import `MemoryLanterns` from its `index.ts`. Pass exact-match `pairs`, `onExit`, and `onComplete`; `playAudio` is optional. The lantern sound recordings are included.

The ten lanterns are shuffled with Fisher-Yates whenever the game mounts, so reopening the game starts a newly randomized session.

Dependencies: `react`, `react-dom`, `lucide-react`.
