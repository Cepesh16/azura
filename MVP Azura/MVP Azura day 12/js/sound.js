import { state } from './state.js';

const correctSound = new Audio('./assets/sounds/correct.mp3');
const wrongSound = new Audio('./assets/sounds/wrong.mp3');

correctSound.preload = 'auto';
wrongSound.preload = 'auto';

export function playCorrect() {
    if (!state.soundEnabled) return;


    correctSound.currentTime = 0;
correctSound.play().catch(() => {}); // 🔒 prevent autoplay errors


}

export function playWrong() {
    if (!state.soundEnabled) return;


    wrongSound.currentTime = 0;
wrongSound.play().catch(() => {}); // 🔒 prevent autoplay errors


}
