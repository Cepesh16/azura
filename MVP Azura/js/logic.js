import { state } from './state.js';
import { render, resetSentence } from './ui.js';
import { speak } from './speech.js';
import { updateWord } from './api.js';

function normalize(str) {
    return str.trim().toLowerCase();
}

// 🔹 Keep history of last shown words
const recentHistory = [];
const HISTORY_LIMIT = 5;

// Weight based on memory level
function getWeight(memoryLevel) {
    const weights = [10, 8, 6, 4, 2, 1];
    const level = Number(memoryLevel) || 0;
    return weights[Math.min(level, 5)];
}

// Choose next word
function chooseNextSentence() {

    const currentIndex = state.currentIndex;

    const pool = [];

    state.sentences.forEach((sentence, index) => {

        // ❌ don't repeat current
        if (index === currentIndex) return;

        // ❌ don't repeat recent history
        if (recentHistory.includes(index)) return;

        const weight = getWeight(sentence.memoryLevel);

        for (let i = 0; i < weight; i++) {
            pool.push(index);
        }
    });

    // ⚠️ fallback if everything excluded
    if (pool.length === 0) {
        // fallback to anything except current
        state.sentences.forEach((_, index) => {
            if (index !== currentIndex) pool.push(index);
        });
    }

    const random = Math.floor(Math.random() * pool.length);
    const nextIndex = pool[random];

    // 🔹 update history
    recentHistory.push(nextIndex);

    if (recentHistory.length > HISTORY_LIMIT) {
        recentHistory.shift();
    }

    return nextIndex;
}

function nextSentence() {
    state.sessionCount++;
    state.currentIndex = chooseNextSentence();

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

        // Update locally
        current.memoryLevel = Math.min(
            (Number(current.memoryLevel) || 0) + 1,
            5
        );

        current.correct = (Number(current.correct) || 0) + 1;
        current.lastSeen = new Date();

        updateWord(current.id, true);

        state.status = 'correct';
        render();

        speak(current.sentence);

        setTimeout(() => {
            nextSentence();
        }, 800);

    } else {

        // Update locally
        current.memoryLevel = Math.max(
            (Number(current.memoryLevel) || 0) - 1,
            0
        );

        current.wrong = (Number(current.wrong) || 0) + 1;
        current.lastSeen = new Date();

        updateWord(current.id, false);

        state.status = 'wrongFlash';
        state.flashWrong = true;

        render();

        setTimeout(() => {
            state.status = 'wrong';
            state.userInput = '';
            render();
        }, 400);
    }
}