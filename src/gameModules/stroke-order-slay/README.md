# Stroke-order Slay

Copy this folder into another React project and import `StrokeOrderSlay` from its `index.ts`. Pass stroke-order `rounds`, `onExit`, and `onComplete`; `playAudio` is optional. Touch, pointer, and mouse drawing are supported.

## Grade profiles

The module exports three configuration-driven game variants. They share one engine, so fixes and future migration work apply to every grade without maintaining duplicate game code.

- `StrokeOrderSlayKinder` — `Stroke-order Slay - Kinder`; large guides, slower animation, generous tracing tolerance, and a visible helper during the second writing pass. Recommended for 1–3 stroke characters.
- `StrokeOrderSlayGrade2` — `Stroke-order Slay - 2nd`; standard tracing tolerance followed by hidden-guide memory writing. Recommended for 2–8 stroke characters.
- `StrokeOrderSlayGrade5` — `Stroke-order Slay - 5th`; precise tracing, hidden-guide writing, and an exact memory stroke-count requirement. Recommended for 5–18 stroke characters.

The stable profile keys are `kinder`, `grade-2`, and `grade-5`. A larger game can either render one of the three wrapper components or pass a profile key to `StrokeOrderSlay` through `profileId`. Each profile still accepts its own `rounds`, allowing the future parent game to supply grade-appropriate character sets from its profile dropdown.

The original `StrokeOrderSlay` export remains backward compatible and uses the existing ungraded title and 2nd-grade behavior unless a `profileId` is supplied.

## Compact writing layout

All three grades use a compact header, large full-word display with the current character highlighted, and a writing square sized to the viewport. Wide screens place drawing controls beside the pad; smaller screens place them below it. The drawing surface has no text overlays. Stroke counts, audio, undo, clear, replay, and phase controls stay outside the square. Comparison uses two side-by-side squares, including on phones. Grade-specific tracing tolerance, guided writing, and exact stroke-count rules are unchanged.

Character guides are centered as a complete shape with consistent edge clearance. The display transform is reversed for pointer input, so source stroke coordinates, stored drawings, and assessment rules stay consistent.

Clear discards both completed and live ink, including queued paint and pointer capture. It remains available on an empty pad so interrupted input cannot strand a stroke. Canceled touches and lost pointer capture discard unfinished ink; switching phases starts a fresh pointer gesture. With the local Vite preview running, run `node src/gameModules/stroke-order-slay/tools/testDrawingReset.mjs` from the playground root to verify these cases in all three grades at desktop and iPad sizes.

In tracing, live ink starts black and accepted strokes turn green. An incorrect attempt turns dark red, plays a short buzzer, and disappears after 700 ms without advancing the stroke count. The retry status remains so the student knows which stroke is next. Undo removes a visible incorrect attempt first; Clear, a successful retry, phase changes, and exit cancel its pending removal. Ungraded memory writing remains black. Tracing tolerance and progression gates remain grade-specific.

Pointer capture lost after the button is released finalizes the stroke even if the browser has not delivered `pointerup` yet. The later release event cannot duplicate that stroke. Capture loss while the button is held and explicit cancellation still discard unfinished ink.

`StrokeOrderSlayKinder` includes the complete Unit 1.1–1.4 writing-character decks: 一, 二, 三, 人, 四, 五, 六, 心, 七, 八, 水, 九, 十, and 白. Each of its 14 rounds retains the source lesson label, Pinyin, and English meaning. Passing an explicit `rounds` property overrides the built-in set.

`StrokeOrderSlayGrade5` includes a built-in vocabulary set generated from the supplied 10/23 review sheet: 或者, 了解, 完, 兴奋的, 告诉, 沟通, 快速地, and 有意思. Multi-character words become consecutive character-writing rounds while the full word, Pinyin, and English meaning remain visible. Passing an explicit `rounds` property overrides the built-in set.

`StrokeOrderSlayGrade2` includes the complete Unit 1, Week 5 (`1.5`) reference deck: 英雄, 每个, 勇敢, 保护, 动物, 让, 因为, 帮助, and 有爱心. Its 18 character rounds retain the `1.5` lesson label and full-word context. Passing explicit `rounds` also overrides this built-in set.

## Stroke data

Grade vocabulary is maintained in `data/gradeVocabulary.mjs`. Run `node tools/importHanziWriterData.mjs kinder --write`, `node tools/importHanziWriterData.mjs grade-2 --write`, or `node tools/importHanziWriterData.mjs grade-5 --write` from this module folder to rebuild the corresponding character rounds. The importer downloads the pinned Hanzi Writer Data records, converts their ordered median coordinates to the game's 0–100 drawing grid, and saves the result locally so gameplay has no network dependency.

Hanzi Writer Data is derived from Make Me a Hanzi and distributed under the Arphic Public License. See `ARPHICPL.txt` and the per-character source URLs retained in each generated file header.

Dependencies: `react`, `react-dom`, `lucide-react`.

This is pointer-based guided handwriting practice. The trace phase checks broad start position, direction, length, and path proximity. The hidden-writing comparison remains a learner self-check and is not a formal handwriting assessment.
