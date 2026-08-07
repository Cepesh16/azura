import { state } from './state.js';

const correctSound = new Audio('./assets/sounds/correct.mp3');
const wrongSound = new Audio('./assets/sounds/wrong.mp3');

correctSound.preload = 'auto';
wrongSound.preload = 'auto';

let currentAudio = null;

// ✅ WORD AUDIO (NEW)
export function playWordAudio(url) {
    if (!state.soundEnabled) return;
    if (!url) return;

    try {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        currentAudio = new Audio(url);
        currentAudio.play().catch(() => {
            console.warn('🔇 Word audio blocked');
        });

    } catch (e) {
        console.warn('🔇 Audio error', e);
    }
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