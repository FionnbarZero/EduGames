const GAME_ID = "lily-pad-path";

const FALLBACK_ROUNDS = [
	{ id: "select-1", targetId: "cat", cueText: "Which word means cat?", audioText: "猫", choices: [{ id: "cat", label: "猫" }, { id: "dog", label: "狗" }, { id: "bird", label: "鸟" }], correctChoiceId: "cat" },
	{ id: "select-2", targetId: "water", cueText: "Find the word for water", audioText: "水", choices: [{ id: "fire", label: "火" }, { id: "water", label: "水" }, { id: "tree", label: "木" }], correctChoiceId: "water" },
	{ id: "select-3", targetId: "big", cueText: "Which character means big?", audioText: "大", choices: [{ id: "small", label: "小" }, { id: "person", label: "人" }, { id: "big", label: "大" }], correctChoiceId: "big" },
	{ id: "select-4", targetId: "sun", cueText: "Find the character for sun", audioText: "日", choices: [{ id: "moon", label: "月" }, { id: "sun", label: "日" }, { id: "mountain", label: "山" }], correctChoiceId: "sun" },
	{ id: "select-5", targetId: "mouth", cueText: "Which character means mouth?", audioText: "口", choices: [{ id: "eye", label: "目" }, { id: "hand", label: "手" }, { id: "mouth", label: "口" }], correctChoiceId: "mouth" },
	{ id: "select-6", targetId: "mountain", cueText: "Find the word for mountain", audioText: "山", choices: [{ id: "mountain", label: "山" }, { id: "river", label: "河" }, { id: "field", label: "田" }], correctChoiceId: "mountain" },
	{ id: "select-7", targetId: "moon", cueText: "Which character means moon?", audioText: "月", choices: [{ id: "rain", label: "雨" }, { id: "moon", label: "月" }, { id: "cloud", label: "云" }], correctChoiceId: "moon" },
	{ id: "select-8", targetId: "one", cueText: "Find the number one", audioText: "一", choices: [{ id: "three", label: "三" }, { id: "two", label: "二" }, { id: "one", label: "一" }], correctChoiceId: "one" },
	{ id: "select-9", targetId: "person", cueText: "Which character means person?", audioText: "人", choices: [{ id: "person", label: "人" }, { id: "woman", label: "女" }, { id: "child", label: "子" }], correctChoiceId: "person" },
	{ id: "select-10", targetId: "good", cueText: "Find the character for good", audioText: "好", choices: [{ id: "come", label: "来" }, { id: "go", label: "去" }, { id: "good", label: "好" }], correctChoiceId: "good" }
];

const PAD_POSITIONS = [
	{ x: 460, y: 490, angle: -2.3 },
	{ x: 720, y: 555, angle: 2.0 },
	{ x: 985, y: 475, angle: -1.2 }
];

const state = {
	runtime: null,
	objects: null,
	rounds: [],
	choiceOrder: [],
	index: 0,
	score: 0,
	attempts: [],
	acceptingInput: false,
	started: false,
	finished: false,
	jump: null,
	tweens: [],
	roundStartedAt: 0,
	startTime: 0,
	audioContext: null
};

runOnStartup(runtime => {
	runtime.addEventListener("beforeprojectstart", () => start(runtime));
});

function start(runtime) {
	state.runtime = runtime;
	state.objects = {
		backdrop: runtime.objects.PondBackdrop.getFirstInstance(),
		scout: runtime.objects.Scout.getFirstInstance(),
		startPad: runtime.objects.StartPad.getFirstInstance(),
		pads: [...runtime.objects.LilyPad.instances()].sort(byChoiceIndex),
		labels: [...runtime.objects.AnswerLabel.instances()].sort(byChoiceIndex),
		prompt: runtime.objects.PromptText.getFirstInstance(),
		instruction: runtime.objects.InstructionText.getFirstInstance(),
		progress: runtime.objects.ProgressText.getFirstInstance(),
		feedback: runtime.objects.FeedbackText.getFirstInstance(),
		sparkles: [...runtime.objects.Sparkle.instances()].sort((a, b) => a.uid - b.uid)
	};

	state.objects.feedback.isVisible = false;
	state.objects.sparkles.forEach(sparkle => sparkle.isVisible = false);
	runtime.addEventListener("pointerup", event => handlePointer(event));
	runtime.addEventListener("pointermove", event => handlePointerMove(event));
	runtime.addEventListener("keydown", event => handleKey(event));
	runtime.addEventListener("tick", () => tick());

	globalThis.addEventListener("message", event => {
		const message = event.data;
		if (!message || message.type !== "EDUGAMES_START" || message.gameId !== GAME_ID) return;
		beginGame(normalizeRounds(message.rounds));
	});

	postToParent({ type: "EDUGAMES_CONSTRUCT_READY", gameId: GAME_ID });
	setTimeout(() => {
		if (!state.started) beginGame(FALLBACK_ROUNDS);
	}, 500);
}

function byChoiceIndex(a, b) {
	return (a.instVars?.ChoiceIndex ?? a.uid) - (b.instVars?.ChoiceIndex ?? b.uid);
}

function normalizeRounds(rounds) {
	if (!Array.isArray(rounds)) return FALLBACK_ROUNDS;
	const valid = rounds.filter(round => round && Array.isArray(round.choices) && round.choices.length >= 3 && round.correctChoiceId);
	return valid.length ? valid.slice(0, 10) : FALLBACK_ROUNDS;
}

function beginGame(rounds) {
	if (state.finished) return;
	state.started = true;
	state.rounds = rounds;
	state.index = 0;
	state.score = 0;
	state.attempts = [];
	state.startTime = performance.now();
	state.objects.backdrop.x = 850;
	state.objects.scout.x = 170;
	state.objects.scout.y = 515;
	state.objects.scout.width = 190;
	state.objects.scout.height = 127;
	state.objects.scout.opacity = 1;
	state.objects.scout.isVisible = true;
	state.objects.startPad.isVisible = true;
	state.objects.startPad.opacity = 1;
	renderRound();
}

function renderRound() {
	if (state.index >= state.rounds.length) {
		playFinale();
		return;
	}

	const round = state.rounds[state.index];
	state.acceptingInput = false;
	state.choiceOrder = shuffled(round.choices.slice(0, 3));
	state.objects.instruction.text = `JUMP ${state.index + 1} OF ${state.rounds.length}  •  CHOOSE THE SAFE LILY PAD`;
	state.objects.prompt.text = round.cueText || "Choose the matching word";
	state.objects.feedback.isVisible = false;
	state.objects.feedback.opacity = 0;
	state.objects.progress.text = progressMarkup(state.index, state.rounds.length);

	state.objects.pads.forEach((pad, visualIndex) => {
		const position = PAD_POSITIONS[(visualIndex + state.index) % PAD_POSITIONS.length];
		const label = state.objects.labels[visualIndex];
		const choice = state.choiceOrder[visualIndex];
		pad.x = position.x + 160;
		pad.y = position.y;
		pad.angleDegrees = position.angle;
		pad.width = 305;
		pad.height = 203;
		pad.opacity = 0;
		pad.colorRgb = [1, 1, 1];
		pad.isVisible = Boolean(choice);
		label.text = choice?.label || "";
		label.x = position.x - 130 + 160;
		label.y = position.y - 40;
		label.opacity = 0;
		label.fontColor = [0.04, 0.13, 0.12];
		label.isVisible = Boolean(choice);
		animate(pad, { x: position.x, opacity: 1, width: 330, height: 220 }, 420 + visualIndex * 80, "backOut");
		animate(label, { x: position.x - 130, opacity: 1 }, 420 + visualIndex * 80, "backOut");
	});

	state.objects.scout.x = 170;
	state.objects.scout.y = 515;
	state.objects.scout.angleDegrees = 0;
	state.objects.scout.opacity = 1;
	state.roundStartedAt = performance.now();
	setTimeout(() => {
		if (!state.finished && state.index < state.rounds.length) {
			state.acceptingInput = true;
			speak(round.audioText);
		}
	}, 500);
}

function shuffled(values) {
	const result = [...values];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

function progressMarkup(completed, total) {
	const markers = [];
	for (let index = 0; index < total; index++) {
		if (index < completed) markers.push("[color=#FFE36A]●[/color]");
		else if (index === completed) markers.push("[color=#A9FFCF]◆[/color]");
		else markers.push("[color=#8EBEB5]○[/color]");
	}
	return markers.join("  ");
}

function handlePointer(event) {
	unlockAudio();
	if (!state.acceptingInput || state.finished) return;
	const layer = state.runtime.layout.getLayer("Game");
	const [x, y] = layer.cssPxToLayer(event.clientX, event.clientY);
	const index = state.objects.pads.findIndex(pad => pad.isVisible && pad.containsPoint(x, y));
	if (index >= 0) choose(index);
}

function handlePointerMove(event) {
	if (!state.acceptingInput || state.finished) return;
	const layer = state.runtime.layout.getLayer("Game");
	const [x, y] = layer.cssPxToLayer(event.clientX, event.clientY);
	state.objects.pads.forEach((pad, index) => {
		const targetWidth = pad.containsPoint(x, y) ? 350 : 330;
		if (Math.abs(pad.width - targetWidth) > 6) {
			animate(pad, { width: targetWidth, height: targetWidth * 2 / 3 }, 140, "outCubic");
			animate(state.objects.labels[index], { opacity: 1 }, 140, "outCubic");
		}
	});
}

function handleKey(event) {
	unlockAudio();
	const index = Number(event.key) - 1;
	if (index >= 0 && index < 3) choose(index);
}

function choose(visualIndex) {
	if (!state.acceptingInput || !state.choiceOrder[visualIndex]) return;
	state.acceptingInput = false;
	const round = state.rounds[state.index];
	const selectedChoice = state.choiceOrder[visualIndex];
	const correct = selectedChoice.id === round.correctChoiceId;
	const correctVisualIndex = state.choiceOrder.findIndex(choice => choice.id === round.correctChoiceId);
	const correctChoice = state.choiceOrder[correctVisualIndex];
	const responseTimeMs = Math.round(performance.now() - state.roundStartedAt);
	const attempt = {
		gameId: GAME_ID,
		promptId: round.id,
		targetId: round.targetId,
		correct,
		response: selectedChoice.id,
		assessmentMode: "automatic",
		responseTimeMs
	};
	state.attempts.push(attempt);
	if (correct) state.score += 1;
	postToParent({ type: "EDUGAMES_ATTEMPT", gameId: GAME_ID, attempt });

	const selectedPad = state.objects.pads[visualIndex];
	const safePad = state.objects.pads[correctVisualIndex];
	const safeLabel = state.objects.labels[correctVisualIndex];
	state.objects.feedback.isVisible = true;
	state.objects.feedback.opacity = 0;

	if (correct) {
		state.objects.feedback.text = "[b]BRILLIANT LEAP![/b]  The path is opening.";
		state.objects.feedback.fontColor = [1, 0.88, 0.35];
		selectedPad.colorRgb = [0.86, 1, 0.72];
		safeLabel.fontColor = [0.03, 0.19, 0.12];
		animate(state.objects.feedback, { opacity: 1 }, 180, "outCubic");
		animate(selectedPad, { width: 370, height: 247 }, 220, "backOut");
		playCorrectSound();
		setTimeout(() => jumpScoutTo(safePad, advanceRound), 180);
	} else {
		state.objects.feedback.text = `[b]ALMOST![/b]  ${correctChoice.label} is the safe pad.`;
		state.objects.feedback.fontColor = [1, 0.62, 0.38];
		selectedPad.colorRgb = [1, 0.62, 0.55];
		safePad.colorRgb = [0.82, 1, 0.68];
		safeLabel.fontColor = [0.03, 0.19, 0.12];
		animate(state.objects.feedback, { opacity: 1 }, 180, "outCubic");
		wobble(selectedPad);
		animate(safePad, { width: 370, height: 247 }, 520, "backOut");
		playMissSound();
		setTimeout(() => jumpScoutTo(safePad, advanceRound), 1050);
	}
}

function wobble(instance) {
	const original = instance.angleDegrees;
	animate(instance, { angleDegrees: original - 7 }, 100, "outCubic", () => {
		animate(instance, { angleDegrees: original + 6 }, 120, "outCubic", () => {
			animate(instance, { angleDegrees: original }, 120, "outCubic");
		});
	});
}

function jumpScoutTo(pad, onComplete) {
	const scout = state.objects.scout;
	state.jump = {
		startTime: performance.now(),
		duration: 760,
		startX: scout.x,
		startY: scout.y,
		targetX: pad.x,
		targetY: pad.y - 28,
		onComplete
	};
	animate(scout, { width: 214, height: 114 }, 150, "outCubic");
}

function advanceRound() {
	burst(state.objects.scout.x, state.objects.scout.y - 45, false);
	state.objects.progress.text = progressMarkup(state.index + 1, state.rounds.length);
	setTimeout(() => {
		state.index += 1;
		if (state.index >= state.rounds.length) {
			playFinale();
			return;
		}

		const progress = state.index / state.rounds.length;
		animate(state.objects.backdrop, { x: 850 - progress * 420 }, 820, "inOutSine");
		state.objects.pads.forEach((pad, index) => {
			animate(pad, { x: pad.x - 250, opacity: 0 }, 520 + index * 40, "inCubic");
			animate(state.objects.labels[index], { x: state.objects.labels[index].x - 250, opacity: 0 }, 520 + index * 40, "inCubic");
		});
		animate(state.objects.scout, { x: 170, y: 515, width: 190, height: 127 }, 760, "inOutSine", renderRound);
	}, 900);
}

function playFinale() {
	if (state.finished) return;
	state.finished = true;
	state.acceptingInput = false;
	state.objects.pads.forEach((pad, index) => {
		animate(pad, { opacity: 0, y: pad.y + 80 }, 600 + index * 80, "inCubic");
		animate(state.objects.labels[index], { opacity: 0, y: state.objects.labels[index].y + 80 }, 600 + index * 80, "inCubic");
	});
	animate(state.objects.startPad, { opacity: 0 }, 500, "outCubic");
	animate(state.objects.backdrop, { x: 430 }, 1100, "inOutSine");
	state.objects.instruction.text = `JOURNEY COMPLETE  •  ${state.score}/${state.rounds.length} SAFE CHOICES`;
	state.objects.prompt.text = "SAFE AT STARLIGHT SHORE!";
	state.objects.progress.text = Array.from({ length: state.rounds.length }, () => "[color=#FFE36A]●[/color]").join("  ");
	state.objects.feedback.text = "[b]Scout made it home.[/b]  You built the path!";
	state.objects.feedback.fontColor = [1, 0.88, 0.35];
	state.objects.feedback.isVisible = true;
	animate(state.objects.feedback, { opacity: 1 }, 300, "outCubic");

	const scout = state.objects.scout;
	state.jump = {
		startTime: performance.now() + 250,
		duration: 1250,
		startX: scout.x,
		startY: scout.y,
		targetX: 1090,
		targetY: 410,
		onComplete: () => {
			burst(1090, 355, true);
			playFinaleSound();
		}
	};

	setTimeout(() => {
		postToParent({
			type: "EDUGAMES_COMPLETE",
			gameId: GAME_ID,
			attempts: state.attempts,
			elapsedMs: Math.round(performance.now() - state.startTime)
		});
	}, 4300);
}

function burst(x, y, finale) {
	const count = finale ? state.objects.sparkles.length : Math.min(6, state.objects.sparkles.length);
	state.objects.sparkles.forEach((sparkle, index) => {
		if (index >= count) return;
		const angle = (Math.PI * 2 * index / count) - Math.PI / 2;
		const distance = finale ? 120 + (index % 3) * 45 : 70 + (index % 2) * 35;
		sparkle.x = x - 30;
		sparkle.y = y - 30;
		sparkle.width = finale ? 72 : 50;
		sparkle.height = finale ? 72 : 50;
		sparkle.opacity = 1;
		sparkle.angleDegrees = 0;
		sparkle.isVisible = true;
		animate(sparkle, {
			x: x + Math.cos(angle) * distance - 30,
			y: y + Math.sin(angle) * distance - 30,
			opacity: 0,
			angleDegrees: 160 + index * 24,
			width: finale ? 30 : 18,
			height: finale ? 30 : 18
		}, finale ? 1500 : 780, "outCubic", () => sparkle.isVisible = false);
	});
}

function tick() {
	const now = performance.now();
	updateTweens(now);
	updateJump(now);
	if (!state.objects || state.finished) return;
	const time = now / 1000;
	if (state.acceptingInput) {
		state.objects.startPad.y = 545 + Math.sin(time * 1.5) * 3;
		state.objects.scout.y = 515 + Math.sin(time * 2.1) * 3;
		state.objects.scout.angleDegrees = Math.sin(time * 1.2) * 1.3;
		state.objects.pads.forEach((pad, index) => {
			const position = PAD_POSITIONS[(index + state.index) % PAD_POSITIONS.length];
			pad.y = position.y + Math.sin(time * (1.35 + index * 0.12) + index) * 5;
			state.objects.labels[index].y = pad.y - 40;
		});
	}
}

function updateJump(now) {
	const jump = state.jump;
	if (!jump || now < jump.startTime) return;
	const progress = Math.min(1, (now - jump.startTime) / jump.duration);
	const eased = ease("inOutSine", progress);
	const inverse = 1 - eased;
	const controlX = (jump.startX + jump.targetX) / 2;
	const controlY = Math.min(jump.startY, jump.targetY) - (jump.duration > 1000 ? 245 : 180);
	const scout = state.objects.scout;
	scout.x = inverse * inverse * jump.startX + 2 * inverse * eased * controlX + eased * eased * jump.targetX;
	scout.y = inverse * inverse * jump.startY + 2 * inverse * eased * controlY + eased * eased * jump.targetY;
	scout.angleDegrees = Math.sin(eased * Math.PI) * -9;
	scout.width = 190 + Math.sin(eased * Math.PI) * 18;
	scout.height = 127 - Math.sin(eased * Math.PI) * 8;
	if (progress >= 1) {
		state.jump = null;
		scout.x = jump.targetX;
		scout.y = jump.targetY;
		scout.angleDegrees = 0;
		scout.width = 190;
		scout.height = 127;
		jump.onComplete?.();
	}
}

function animate(instance, to, duration, easing = "outCubic", onComplete = null) {
	state.tweens = state.tweens.filter(tween => tween.instance !== instance || !Object.keys(to).some(key => key in tween.to));
	const from = {};
	for (const key of Object.keys(to)) from[key] = instance[key];
	state.tweens.push({ instance, from, to, duration, easing, onComplete, startTime: performance.now() });
}

function updateTweens(now) {
	const remaining = [];
	for (const tween of state.tweens) {
		const progress = Math.min(1, (now - tween.startTime) / tween.duration);
		const amount = ease(tween.easing, progress);
		for (const key of Object.keys(tween.to)) {
			tween.instance[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * amount;
		}
		if (progress >= 1) tween.onComplete?.();
		else remaining.push(tween);
	}
	state.tweens = remaining;
}

function ease(name, value) {
	if (name === "inCubic") return value * value * value;
	if (name === "inOutSine") return -(Math.cos(Math.PI * value) - 1) / 2;
	if (name === "backOut") {
		const c1 = 1.70158;
		const c3 = c1 + 1;
		return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
	}
	return 1 - Math.pow(1 - value, 3);
}

function speak(text) {
	if (!text || !globalThis.speechSynthesis || typeof globalThis.SpeechSynthesisUtterance !== "function") return;
	try {
		globalThis.speechSynthesis.cancel();
		const utterance = new globalThis.SpeechSynthesisUtterance(text);
		utterance.lang = "zh-CN";
		utterance.rate = 0.78;
		globalThis.speechSynthesis.speak(utterance);
	} catch {}
}

function unlockAudio() {
	try {
		if (!state.audioContext) state.audioContext = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
		if (state.audioContext.state === "suspended") void state.audioContext.resume();
	} catch {}
}

function tone(frequency, delay, duration, type, gain) {
	const context = state.audioContext;
	if (!context) return;
	const oscillator = context.createOscillator();
	const volume = context.createGain();
	const start = context.currentTime + delay;
	oscillator.type = type;
	oscillator.frequency.setValueAtTime(frequency, start);
	volume.gain.setValueAtTime(0.0001, start);
	volume.gain.exponentialRampToValueAtTime(gain, start + 0.018);
	volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
	oscillator.connect(volume).connect(context.destination);
	oscillator.start(start);
	oscillator.stop(start + duration + 0.02);
}

function playCorrectSound() {
	unlockAudio();
	tone(523.25, 0, 0.18, "sine", 0.06);
	tone(659.25, 0.1, 0.22, "sine", 0.06);
	tone(783.99, 0.2, 0.3, "triangle", 0.045);
}

function playMissSound() {
	unlockAudio();
	tone(210, 0, 0.18, "sine", 0.05);
	tone(165, 0.11, 0.28, "triangle", 0.035);
}

function playFinaleSound() {
	unlockAudio();
	[523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => tone(frequency, index * 0.12, 0.5, "triangle", 0.055));
}

function postToParent(message) {
	try {
		if (globalThis.parent && globalThis.parent !== globalThis) globalThis.parent.postMessage(message, "*");
	} catch {}
}
