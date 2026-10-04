# Challenge of the Whispering Scrolls

Copy this folder into another React project and import `WhisperingScrolls` from its `index.ts`. Pass production `rounds`, `onExit`, and `onComplete`. The spoken briefing and default Mandarin acoustic models are included.

Use the optional `instructionAudioUrl` and `models` props when replacing the sample words. Supply `playAudio` to play the model word during comparison.

Dependencies: `react`, `react-dom`, `lucide-react`. Requires browser microphone and `MediaRecorder` support.
