console.log('🚨 LOGIC.JS LOADED');

const version = '1.3';

import { state } from './state.js';
import { render, resetSentence } from './ui.js';
import { speak } from './speech.js';
import { playCorrect, playWrong, playWordAudio } from './sound.js';
import { updateWord } from './api.js';


function onFadeEnd(el, callback) {
    if (!el) return;

    const handler = (e) => {
        if (e.target !== el) return;
        el.removeEventListener('transitionend', handler);
        callback();
    };

    el.addEventListener('transitionend', handler);
}

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
    const sentenceArea = document.getElementById('sentence-area');
    if (!sentenceArea) return;

    // 🔴 STEP 1 — fade OUT
    sentenceArea.classList.remove('fade-gone');
    sentenceArea.classList.add('fade-hidden');
    sentenceArea.classList.remove('fade-visible');

    onFadeEnd(sentenceArea, () => {

        state.currentQueueIndex++;

        // =========================
        // 🏁 FINISHED
        // =========================
        if (state.currentQueueIndex >= state.sessionQueue.length) {

            sentenceArea.classList.add('fade-gone');

            state.status = 'finished';
            render();

            const summary = document.getElementById('session-state');

            if (summary) {
                // 🟢 STEP 1 — bring into layout
                summary.classList.remove('fade-gone');

                // 🔴 STEP 2 — set hidden state FIRST
                summary.classList.add('fade-hidden');
                summary.classList.remove('fade-visible');

                // 🔥 STEP 3 — force browser to apply it
                summary.getBoundingClientRect();

                // 🟢 STEP 4 — animate IN
                requestAnimationFrame(() => {
                    summary.classList.remove('fade-hidden');
                    summary.classList.add('fade-visible');
                });
            }

            return;
        }

        // =========================
        // NEXT SENTENCE
        // =========================
        state.currentIndex = state.sessionQueue[state.currentQueueIndex];

        state.userInput = '';
        state.status = 'waiting';
        state.answeredWithHint = false;
        state.isSubmitting = false;

        render();

        const newSentenceArea = document.getElementById('sentence-area');

        if (newSentenceArea) {
            newSentenceArea.classList.remove('fade-gone');
            newSentenceArea.classList.add('fade-hidden');
            newSentenceArea.classList.remove('fade-visible');
        }

        requestAnimationFrame(() => {
            if (newSentenceArea) {
                newSentenceArea.classList.remove('fade-hidden');
                newSentenceArea.classList.add('fade-visible');
            }
        });
    });
}

// =========================
// FINISH WORD
// =========================
function finishWord(current, immediateCorrect) {
    state.sessionCount++;
    state.completedCount++;
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
    state.completedCount = 0;

    state.sessionQueue = buildSessionQueue();
    state.currentQueueIndex = 0;

    // 🔥 RESET PROGRESS BAR (ADD THIS HERE)
    const bar = document.getElementById('progress-bar');
    if (bar) {
        bar.dataset.initialized = '';
        bar.innerHTML = '';
    }

    if (state.sessionQueue.length > 0) {
        state.currentIndex = state.sessionQueue[0];
    }

    state.userInput = '';
    state.status = 'waiting';
    state.answeredWithHint = false;
    state.isSubmitting = false;

    resetSentence();

    const summary = document.getElementById('session-state');
    // 🔴 FADE OUT SUMMARY
    if (summary) {
        // 🔴 STEP 1 — fade OUT (DO NOT touch fade-gone here)
        summary.classList.add('fade-hidden');
        summary.classList.remove('fade-visible');

        onFadeEnd(summary, () => {

            // 🔴 STEP 2 — NOW remove from layout
            summary.classList.add('fade-gone');

            // 🟢 STEP 3 — render new sentence
            render();

            const sentenceArea = document.getElementById('sentence-area');

            if (sentenceArea) {
                // 🟢 bring into layout
                sentenceArea.classList.remove('fade-gone');

                // 🔥 force browser layout (critical)
                sentenceArea.getBoundingClientRect();

                // 🟢 prepare hidden
                sentenceArea.classList.add('fade-hidden');
                sentenceArea.classList.remove('fade-visible');

                // 🟢 animate IN
                requestAnimationFrame(() => {
                    sentenceArea.classList.remove('fade-hidden');
                    sentenceArea.classList.add('fade-visible');
                });
            }

        });
    }
}