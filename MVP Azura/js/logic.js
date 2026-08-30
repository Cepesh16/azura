console.log('🚨 LOGIC.JS LOADED');

const version = '1.3';

import { state } from './state.js';
import { render } from './ui.js';
import { speak } from './speech.js';
import { playCorrect, playWrong, playWordAudio } from './sound.js';
import { updateWord } from './api.js';
import { fadeIn, fadeOut } from './anim.js';


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
async function nextSentence() {
if (state.autoSubmitTimer) {
    clearTimeout(state.autoSubmitTimer);
    state.autoSubmitTimer = null;
}

    const sentenceArea = document.getElementById('sentence-area');
    if (!sentenceArea) return;

    state.queueIndex++;

    // 🏁 FINISHED
    if (state.queueIndex >= state.queue.length) {
        const progressRow = document.getElementById('progress-row');

        state.status = 'finished';

        await Promise.all([
            fadeOut(sentenceArea),
            fadeOut(progressRow)
        ]);

        render();

        const summary = document.getElementById('session-state');
        await fadeIn(summary);

        return;
    }

    await fadeOut(sentenceArea);

    // 🔥 DIRECT current update (NO LOOKUPS ELSEWHERE)
    state.current = state.sentences[state.queue[state.queueIndex]];

    state.userInput = '';
    state.status = 'waiting';
    state.answeredWithHint = false;
    state.isSubmitting = false;

    render();

    const newSentenceArea = document.getElementById('sentence-area');
    await fadeIn(newSentenceArea);
}

// =========================
// FINISH WORD
// =========================
function finishWord(current, immediateCorrect) {
    state.sessionCount++;
    state.completedCount++;
    state.totalCompleted++;
    localStorage.setItem('totalCompleted', state.totalCompleted);
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

    // American or British pronunciation        
    const url = `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${current.answer.toLowerCase()}--_us_1.mp3`;

    (async () => {

        // optional delay only if NOT immediate
        if (!immediateCorrect) {
            await new Promise(r => setTimeout(r, 600));
        }

        await playWordAudio(url);

        nextSentence();

    })();


}

// =========================
// 🚨 FINAL FIXED SUBMIT
// =========================
export function submitAnswer() {
    console.log('SUBMIT CALLED');
if (state.autoSubmitTimer) {
    clearTimeout(state.autoSubmitTimer);
    state.autoSubmitTimer = null;
}

    // 🔒 HARD LOCK (fix for mobile double fire)
    if (state.isSubmitting) {
        console.log('⛔ BLOCKED DOUBLE SUBMIT');
        return;
    }

    state.isSubmitting = true;

    console.log('STATE INPUT:', JSON.stringify(state.userInput));

    const current = state.current;

    // ❗ DO NOT read DOM anymore
    const input = (state.userInput || '').trim().toLowerCase();

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


}


export async function startNewSession() {
if (state.autoSubmitTimer) {
    clearTimeout(state.autoSubmitTimer);
    state.autoSubmitTimer = null;
}

    state.sessionCount = 0;
    state.sessionCorrect = 0;
    state.sessionWrong = 0;
    state.completedCount = 0;

    // 🔥 build new session queue
    state.queue = buildSessionQueue();
    state.queueIndex = 0;

    // 🔥 RESET PROGRESS BAR
    const bar = document.getElementById('progress-bar');
    if (bar) {
        bar.dataset.initialized = '';
        bar.innerHTML = '';
    }

    // set first word
    state.current = state.sentences[state.queue[0]] || null;

    state.userInput = '';
    state.status = 'waiting';
    state.answeredWithHint = false;
    state.isSubmitting = false;


    const summary = document.getElementById('session-state');
    const progressRow = document.getElementById('progress-row');

    await fadeOut(summary);

    render();

    const sentenceArea = document.getElementById('sentence-area');

    await Promise.all([
        fadeIn(sentenceArea),
        fadeIn(progressRow)
    ]);
}