import { state } from './state.js';
import { render, resetSentence } from './ui.js';
import { speak } from './speech.js';

function normalize(str) {
    return str.trim().toLowerCase();
}

function nextSentence() {
    state.currentIndex++;

    if (state.currentIndex >= state.sentences.length) {
        state.currentIndex = 0;
    }

    state.userInput = '';
    state.status = 'waiting';

    resetSentence();
    render();
}

export function submitAnswer() {
    const current = state.sentences[state.currentIndex];

    if (!state.userInput.trim()) return;

    const isCorrect =
        normalize(state.userInput) ===
        normalize(current.answer);

    if (isCorrect) {
        state.status = 'correct';
        render();

        speak(current.sentence);

        setTimeout(() => {
            nextSentence();
        }, 800);

    } else {
        state.status = 'wrongFlash';
        state.flashWrong = true;

        // keep user's wrong input visible
        render();

        // after animation → switch to hint mode
        setTimeout(() => {
            state.status = 'wrong';
            state.userInput = ''; // reset for guided typing
            render();
        }, 400); // match CSS duration
    }
}