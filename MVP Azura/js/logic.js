import { state } from './state.js';
import { render, resetSentence } from './ui.js';
import { speak } from './speech.js';
import { playCorrect, playWrong } from './sound.js';
import { updateWord } from './api.js';

function normalize(str) {
    return str
    .replace(/\u00A0/g, ' ')
    .trim()
    .toLowerCase();
}

// =========================
// SESSION QUEUE (unchanged)
// =========================
const recentHistory = [];
const HISTORY_LIMIT = 5;

function getWeight(memoryLevel) {
    const weights = [10, 8, 6, 4, 2, 1];
    const level = Number(memoryLevel) || 0;
    return weights[Math.min(level, 5)];
}

export function buildSessionQueue() {
    const pool = [];


    state.sentences.forEach((sentence, index) => {
        const weight = getWeight(sentence.memoryLevel);
        for (let i = 0; i < weight; i++) {
            pool.push(index);
        }
    });

    const selected = [];

    while (
        selected.length < state.sessionLimit &&
        pool.length > 0
        ) {
        const random = Math.floor(Math.random() * pool.length);
    const index = pool[random];

    if (!selected.includes(index)) {
        selected.push(index);
    }

    for (let i = pool.length - 1; i >= 0; i--) {
        if (pool[i] === index) {
            pool.splice(i, 1);
        }
    }
}

return selected;


}

// =========================
// NEXT SENTENCE
// =========================
function nextSentence() {
    state.currentQueueIndex++;


    if (state.currentQueueIndex >= state.sessionQueue.length) {
        return;
    }

    state.currentIndex = state.sessionQueue[state.currentQueueIndex];

    state.userInput = '';
    state.status = 'waiting';
    state.answeredWithHint = false;
    state.layoutWarning = false;
    state.isSubmitting = false;

    resetSentence();
    render();


}

// =========================
// FINISH WORD
// =========================
function finishWord(current, immediateCorrect) {
    state.sessionCount++;
    render();


    if (immediateCorrect) {
        current.memoryLevel = Math.min(
            (Number(current.memoryLevel) || 0) + 1,
            5
            );

        current.correct = (Number(current.correct) || 0) + 1;
        state.sessionCorrect++;
    }

    current.lastSeen = new Date();

    if (immediateCorrect) {
        updateWord(current.id, true);
    }

    state.status = 'correct';
    render();

    playCorrect();

    const delay = immediateCorrect ? 0 : 600;

    setTimeout(() => {
        speak(current.sentence, () => {
            nextSentence();
        });
    }, delay);


}

// =========================
// 🚨 FINAL FIXED SUBMIT
// =========================
export function submitAnswer() {
    console.log('SUBMIT CALLED');
    console.log('STATE INPUT:', JSON.stringify(state.userInput));


    if (state.isSubmitting) return;
    state.isSubmitting = true;

    const current = state.sentences[state.currentIndex];

// 🔥 ONLY TRUST STATE (NOT DOM)
    const input = state.userInput.trim();

    console.log('STATE INPUT:', JSON.stringify(input));

// =========================
// ❗ EMPTY INPUT
// =========================
    if (input === '') {

    // First Enter → show hint
        if (!state.answeredWithHint) {
            state.answeredWithHint = true;
            state.status = 'wrong';
            render();
        }

    // Second Enter → DO NOTHING
        state.isSubmitting = false;
        return;
    }

// =========================
// ✅ CORRECT (ONLY if user typed)
// =========================
    const isCorrect =
    input.length === current.answer.length &&
    normalize(input) === normalize(current.answer);

    if (isCorrect) {

        resetSentence();

    // if user used hint → not immediate correct
        finishWord(current, !state.answeredWithHint);

        return;
    }

// =========================
// ❌ WRONG
// =========================
    state.sessionWrong++;

    current.memoryLevel = Math.max(
        (Number(current.memoryLevel) || 0) - 1,
        0
        );

    current.wrong = (Number(current.wrong) || 0) + 1;
    current.lastSeen = new Date();

    updateWord(current.id, false);

    state.answeredWithHint = true;

    playWrong();

    state.status = 'wrongFlash';
    state.flashWrong = true;

    render();

    setTimeout(() => {
        state.status = 'wrong';
        state.userInput = '';
        state.isSubmitting = false;
        render();
    }, 400);


}
