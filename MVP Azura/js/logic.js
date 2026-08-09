console.log('🚨 LOGIC.JS LOADED');

const version = '1.3';

import { state } from './state.js';
import { render, resetSentence } from './ui.js';
import { speak } from './speech.js';
import { playCorrect, playWrong, playWordAudio } from './sound.js';
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
    const total = state.sentences.length;

    if (!total) return [];

    const limit = Math.max(1, Number(state.sessionLimit) || 5);

    console.log('SESSION LIMIT:', limit);
    console.log('TOTAL SENTENCES:', total);

    // 🔹 create array of all indices
    const indices = [...Array(total).keys()];

    // 🔹 shuffle (Fisher-Yates)
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const result = indices.slice(0, limit);

    console.log('✅ QUEUE BUILT:', result);

    return result;
}

// =========================
// NEXT SENTENCE
// =========================
function nextSentence() {
    const sentenceEl = document.getElementById('sentence');

    // 🔥 fade out FIRST
    if (sentenceEl) {
        sentenceEl.classList.remove('fade-in');
        sentenceEl.classList.add('fade-out');
    }

    setTimeout(() => {
        state.currentQueueIndex++;

        if (state.currentQueueIndex >= state.sessionQueue.length) {
            const sentenceEl = document.getElementById('sentence');

            if (sentenceEl) {
                sentenceEl.classList.remove('fade-in');
                sentenceEl.classList.remove('fade-out');
            }

            state.status = 'finished';
            render();
            return;
        }

        state.currentIndex = state.sessionQueue[state.currentQueueIndex];

        state.userInput = '';
        state.status = 'waiting';
        state.answeredWithHint = false;
        state.layoutWarning = false;
        state.isSubmitting = false;

        render();

        // 🔥 fade in AFTER render
        requestAnimationFrame(() => {
            const el = document.getElementById('sentence');
            if (!el) return;

            el.classList.remove('fade-out');
            el.classList.add('fade-in');
        });

    }, 120);
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
    
    console.log('🔊 AUDIO URL:', current.audioUrl);

// American or British pronunciation        
    const url = `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${current.answer.toLowerCase()}--_us_1.mp3`;
    // const url = `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${current.answer.toLowerCase()}--_gb_1.mp3`;

    playWordAudio(url);

    setTimeout(() => {
        document.getElementById('sentence')?.classList.remove('fade-in');
        nextSentence();
    }, 600);

}, delay);


}

// =========================
// 🚨 FINAL FIXED SUBMIT
// =========================
export function submitAnswer() {
    console.log('SUBMIT CALLED');

    // 🔒 HARD LOCK (fix for mobile double fire)
    if (state.isSubmitting) {
        console.log('⛔ BLOCKED DOUBLE SUBMIT');
        return;
    }

    state.isSubmitting = true;

    console.log('STATE INPUT:', JSON.stringify(state.userInput));

    const current = state.sentences[state.currentIndex];
let input = '';

const el = document.getElementById('gap-input');

if (el) {
    // 🔥 clone node so we don’t touch real DOM
    const clone = el.cloneNode(true);

    // 🔥 remove hint completely
    const hint = clone.querySelector('.hint');
    if (hint) hint.remove();

    // 🔥 now only user text remains
    input = clone.innerText.trim();
}

state.userInput = input;

console.log('📥 FINAL INPUT:', input);



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

    // 🚫 Second Enter → HARD BLOCK
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

        state.isSubmitting = false;
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


export function startNewSession() {

    state.sessionCount = 0;
    state.sessionCorrect = 0;
    state.sessionWrong = 0;

    state.sessionQueue = buildSessionQueue();
    state.currentQueueIndex = 0;

    if (state.sessionQueue.length > 0) {
        state.currentIndex = state.sessionQueue[0];
    }

    state.userInput = '';
    state.status = 'waiting';
    state.answeredWithHint = false;
    state.isSubmitting = false;

    resetSentence();
    const sentenceEl = document.getElementById('sentence');
    if (sentenceEl) {
        // sentenceEl.classList.remove('fade-out');
        sentenceEl.classList.remove('fade-in');
    }
    render();
}