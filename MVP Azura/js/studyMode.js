import { state } from './state.js';
import { resetSentence, render } from './ui.js';

// Returns true if the word is due today or earlier
function isDue(word) {

    if (!word.nextReview) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reviewDate = new Date(word.nextReview);
    reviewDate.setHours(0, 0, 0, 0);

    return reviewDate <= today;
}

// Rebuild active list
export function refreshStudyMode() {

    // 🚫 DO NOT mutate during session
    if (state.sessionCount > 0) {
        return;
    }

    if (state.studyMode === 'all') {

        state.sentences = state.allSentences.filter(word => {
            return isDue(word);
        });

    } else if (state.studyMode === 'review') {

        state.sentences = state.allSentences.filter(word => {

            if (!isDue(word)) return false;

            const memory = Number(word.memoryLevel) || 0;
            const correct = Number(word.correct) || 0;
            const wrong = Number(word.wrong) || 0;

            if (!word.lastSeen) return false;

            return memory <= 1 || wrong > correct;
        });
    }

    if (state.currentIndex >= state.sentences.length) {
        state.currentIndex = 0;
    }
}

// User intentionally changed study mode
export function setStudyMode(mode) {
    // 🚫 DO NOT reset during active session
    if (state.sessionCount > 0) {
        return;
    }

    const sessionData = JSON.parse(localStorage.getItem('sessionData'));
    const today = new Date().toDateString();

// TO TEST WORDS CLEAR LOCAL STORAGE - COMMENT THESE IF BLOCK
    // 🔒 lock if session completed today
/*    if (sessionData && sessionData.date === today && sessionData.completed) {
        state.sentences = [];
        render();
        return;
    }*/

    state.studyMode = mode;

    // ✅ reset session
    state.sessionCount = 0;
    state.sessionCorrect = 0;
    state.sessionWrong = 0;

    refreshStudyMode();

    // highlight buttons
    const allBtn = document.getElementById('mode-all');
    const reviewBtn = document.getElementById('mode-review');

    allBtn.classList.remove('active');
    reviewBtn.classList.remove('active');

    if (mode === 'all') {
        allBtn.classList.add('active');
    } else {
        reviewBtn.classList.add('active');
    }

    state.currentIndex = 0;

    state.userInput = '';
    state.status = 'waiting';

    resetSentence();
    render();
}