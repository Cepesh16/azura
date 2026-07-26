import { state } from './state.js';
import { submitAnswer } from './logic.js';

let sentenceInitialized = false;


function getTimeUntilNextDay() {
    const now = new Date();

    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return tomorrow - now;
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function createGapSentence(sentenceObj) {
    const { sentence, answer } = sentenceObj;

    const regex = new RegExp(`\\b${answer}\\b`, 'i');

    return sentence.replace(
        regex,
        `<span id="gap-input" contenteditable="true" class="gap"></span>`
    );
}

function renderHint(answer, userInput) {
    let result = '';

    for (let i = 0; i < answer.length; i++) {
        const correctChar = answer[i];
        const userChar = userInput[i];

        if (userChar) {
            result += `<span class="correct">${userChar}</span>`;
        } else {
            result += `<span class="hint">${correctChar}</span>`;
        }
    }

    return result;
}

export function resetSentence() {
    sentenceInitialized = false;
}

function flashWrong(el) {
    el.classList.add('flash-wrong');

    setTimeout(() => {
        el.classList.remove('flash-wrong');
    }, 400);
}

function placeCursorAtPosition(el, position) {
    const range = document.createRange();
    const sel = window.getSelection();

    let currentPos = 0;

    function walk(node) {
        if (node.nodeType === 3) {
            const nextPos = currentPos + node.length;
            if (position <= nextPos) {
                range.setStart(node, position - currentPos);
                range.collapse(true);
                return true;
            }
            currentPos = nextPos;
        } else {
            for (let child of node.childNodes) {
                if (walk(child)) return true;
            }
        }
        return false;
    }

    walk(el);

    sel.removeAllRanges();
    sel.addRange(range);
}

export function render() {
    const sentenceEl = document.getElementById('sentence');
    const translationEl = document.getElementById('translation');
    const progressEl = document.getElementById('progress');
    const current = state.sentences[state.currentIndex];

    // No words to study
    if (!current) {

        const sentenceEl = document.getElementById('sentence');
        const translationEl = document.getElementById('translation');
        const progressEl = document.getElementById('progress');

        if (state.studyMode === 'review') {

            sentenceEl.innerHTML = `
                <div class="empty-state">
                    🎉 <strong>Review complete!</strong><br><br>
                    There are no words to review.
                </div>
            `;

        } else {

            const total = state.sessionCorrect + state.sessionWrong;

            sentenceEl.innerHTML = `
                <div class="empty-state">
                    🎉 <strong>You're done for today!</strong><br><br>

                    You studied <strong>${total}</strong> words<br>
                    ✅ Correct: <strong>${state.sessionCorrect}</strong><br>
                    ❌ Mistakes: <strong>${state.sessionWrong}</strong><br><br>

                    Next session in: <span id="countdown"></span>
                </div>
            `;

            setInterval(() => {
                const el = document.getElementById('countdown');
                if (el) {
                    el.innerText = formatTime(getTimeUntilNextDay());
                }
            }, 1000);
        }

        translationEl.innerText = '';
        progressEl.innerText = '';

        return;
    }

    progressEl.innerText = `${state.sessionCount} / ${state.sessionLimit}`;

    const progressFill = document.getElementById('progress-fill');
    const percent = Math.min(
        (state.sessionCount / state.sessionLimit) * 100,
        100
    );

    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }


    if (!sentenceInitialized) {
        sentenceEl.innerHTML = createGapSentence(current);
        sentenceInitialized = true;
    }

    translationEl.innerText = current.translation;

    const input = document.getElementById('gap-input');
    if (!input) return;
    input.classList.remove('correct', 'flash-wrong');
    input.focus();

    // 🟢 NORMAL MODE
    if (state.status === 'waiting') {
        input.innerText = state.userInput;

        input.oninput = () => {
            state.userInput = input.innerText;
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitAnswer();
            }
        };

        return;
    }
    // 🟢 CORRECT FLASH MODE 
    if (state.status === 'correct') {
        input.innerText = current.answer;

        input.classList.add('correct');

        return;
    }

    // 🔴 WRONG FLASH MODE (show user's wrong word)
    if (state.status === 'wrongFlash') {
        input.innerText = state.userInput;

        if (state.flashWrong) {
            flashWrong(input);
            state.flashWrong = false;
        }

        return;
    }

    // 🔴 WRONG MODE (guided typing with hint)
    input.innerHTML = renderHint(current.answer, state.userInput);

    input.onkeydown = (e) => {
        e.preventDefault();

        const answer = current.answer;
        const nextIndex = state.userInput.length;

        if (e.key === 'Backspace') {
            state.userInput = state.userInput.slice(0, -1);

            input.innerHTML = renderHint(answer, state.userInput);
            placeCursorAtPosition(input, state.userInput.length);
            return;
        }

        if (e.key.length !== 1) return;

        const expectedChar = answer[nextIndex];

        if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
            state.userInput += e.key;

            input.innerHTML = renderHint(answer, state.userInput);
            placeCursorAtPosition(input, state.userInput.length);

            if (state.userInput.length === answer.length) {
                submitAnswer();
            }
        }
    };
}