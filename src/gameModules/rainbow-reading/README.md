# Rainbow Reading

Copy this folder into another React project and import `RainbowReading` from its `index.ts`. Pass six English production `rounds`, `onExit`, and `onComplete`. The spoken briefing, six English acoustic models, and kawaii creature sprite sheet are included.

Use the optional `instructionAudioUrl` and `models` props when replacing the sample words. Supply `playAudio` to play the model word during comparison.

The default microphone flow displays a privacy notice before permission is requested. Browser speech recognition may use a browser-vendor service. A learner can continue with a clearly labeled listen/read/self-check fallback when recording or analysis is unavailable. The module does not retain or upload audio unless the host supplies `onRecording`.

The catalog keeps this game on release hold until pronunciation scoring is calibrated against a broader set of recorded learner fixtures. The six bundled reference recordings are a deterministic practice baseline, not a clinical or proficiency assessment.

Dependencies: `react`, `react-dom`, `lucide-react`. The automatic path requires browser microphone and `MediaRecorder` support; the self-check fallback does not.
