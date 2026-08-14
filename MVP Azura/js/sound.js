import { state } from './state.js';

const correctSound = new Audio('./assets/sounds/correct.mp3');
const wrongSound = new Audio('./assets/sounds/wrong.mp3');

correctSound.preload = 'auto';
wrongSound.preload = 'auto';

let currentAudio = null;

// ✅ WORD AUDIO
export function playWordAudio(url) {
    return new Promise((resolve) => {
        const audio = new Audio(url);

        audio.onended = resolve;
        audio.onerror = resolve; // fallback

        audio.play();
    });
}

// ✅ EXISTING
export function playCorrect() {
    if (!state.soundEnabled) return;

    correctSound.currentTime = 0;
    correctSound.play().catch(() => {});
}

export function playWrong() {
    if (!state.soundEnabled) return;

    wrongSound.currentTime = 0;
    wrongSound.play().catch(() => {});
}