import { state } from './state.js';
import { render, resetSentence } from './ui.js';
import { speak } from './speech.js';
import { updateWord } from './api.js';
import { refreshStudyMode } from './studyMode.js';

function normalize(str) {
    return str.trim().toLowerCase();
}

// Keep history of last shown words
const recentHistory = [];
const HISTORY_LIMIT = 5;

function getWeight(memoryLevel) {
    const weights = [10, 8, 6, 4, 2, 1];
    const level = Number(memoryLevel) || 0;
    return weights[Math.min(level, 5)];
}

function chooseNextSentence() {

    const currentIndex = state.currentIndex;
    const candidates = [];

    state.sentences.forEach((sentence, index) => {

        if (index === currentIndex) return;
        if (recentHistory.includes(index)) return;

        const weight = getWeight(sentence.memoryLevel);

        for (let i = 0; i < weight; i++) {
            candidates.push(index);
        }
    });

    if (candidates.length === 0) {
        state.sentences.forEach((_, index) => {
            if (index !== currentIndex) {
                candidates.push(index);
            }
        });
    }

    if (candidates.length === 0) return 0;

    const random = Math.floor(Math.random() * candidates.length);
    const nextIndex = candidates[random];

    recentHistory.push(nextIndex);

    if (recentHistory.length > HISTORY_LIMIT) {
        recentHistory.shift();
    }

    return nextIndex;
}

function nextSentence() {


    refreshStudyMode();

    if (state.sentences.length === 0) {

        state.currentIndex = 0;
        state.userInput = '';
        state.status = 'waiting';

        resetSentence();
        render();
        return;
    }

    state.currentIndex = chooseNextSentence();

    state.userInput = '';
    state.status = 'waiting';
    state.answeredWithHint = false;

    resetSentence();
    render();
}

function finishWord(immediateCorrect) {
    state.sessionCount++;
    render();
    
    const current = state.sentences[state.currentIndex];

    if (immediateCorrect) {

        current.memoryLevel = Math.min(
            (Number(current.memoryLevel) || 0) + 1,
            5
        );

        current.correct = (Number(current.correct) || 0) + 1;

        // ✅ only real correct counts
        state.sessionCorrect++;
    }

    current.lastSeen = new Date();

    if (immediateCorrect) {
        updateWord(current.id, true);
    }

    state.status = 'correct';
    render();

    speak(current.sentence);

    setTimeout(() => {

        // ✅ STOP BEFORE going to next word
        if (state.sessionCount >= state.sessionLimit) {

            localStorage.setItem('sessionData', JSON.stringify({
                date: new Date().toDateString(),
                completed: true,
                correct: state.sessionCorrect,
                wrong: state.sessionWrong
            }));

            state.sentences = [];
            render();
            return;
        }

        nextSentence();

    }, 800);
}

export function submitAnswer() {

    const current = state.sentences[state.currentIndex];

    if (!state.userInput.trim()) return;

    const isCorrect =
        normalize(state.userInput) ===
        normalize(current.answer);

    if (isCorrect && state.answeredWithHint) {
        finishWord(false);
        return;
    }

    if (isCorrect) {
        finishWord(true);
        return;
    }

    // ❌ WRONG

    state.sessionWrong++;

    current.memoryLevel = Math.max(
        (Number(current.memoryLevel) || 0) - 1,
        0
    );

    current.wrong = (Number(current.wrong) || 0) + 1;

    current.lastSeen = new Date();

    updateWord(current.id, false);

    state.answeredWithHint = true;

    state.status = 'wrongFlash';
    state.flashWrong = true;

    render();

    setTimeout(() => {
        state.status = 'wrong';
        state.userInput = '';
        render();
    }, 400);
}