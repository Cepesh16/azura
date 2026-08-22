import { state } from './state.js';

const correctSound = new Audio('./assets/sounds/correct.mp3');
const wrongSound = new Audio('./assets/sounds/wrong.mp3');

correctSound.preload = 'auto';
wrongSound.preload = 'auto';

let currentAudio = null;

// ✅ WORD AUDIO
const audioCache = new Map();

export function playWordAudio(url) {
    return new Promise((resolve) => {
        if (!url) return resolve();

        // If we already cached an Audio element for this URL, reuse it
        let audio = audioCache.get(url);

        if (!audio) {
            audio = new Audio(url);
            audio.preload = 'auto';
            audioCache.set(url, audio);
        }

        // If another playback is running on same Audio element, clone to avoid interruption
        const playTarget = audio.cloneNode(true);
        playTarget.onended = resolve;
        playTarget.onerror = () => {
            // if playback fails, still resolve to keep flow moving
            resolve();
        };

        // Try to play (catch promise rejection)
        playTarget.play().catch(() => {
            resolve();
        });
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