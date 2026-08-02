import { state } from './state.js';
import { submitAnswer, startNewSession } from './logic.js';

let sentenceInitialized = false;
let lastRenderedIndex = null;

function setCaret(el, position) {
    const range = document.createRange();
    const sel = window.getSelection();


    const typedNode = el.querySelector('.typed');
    if (!typedNode || !typedNode.firstChild) return;

    const textNode = typedNode.firstChild;
    const safePos = Math.min(position, textNode.length);

    range.setStart(textNode, safePos);
    range.collapse(true);

    sel.removeAllRanges();
    sel.addRange(range);


}



function createGapSentence(sentenceObj) {
    const { sentence, answer } = sentenceObj;


    const regex = new RegExp(`\\b${answer}\\b`, 'i');

    return sentence.replace(
        regex,
    `<span id="gap-input" contenteditable="true" class="gap"></span>`
    );


}

export function resetSentence() {
    sentenceInitialized = false;
}

export function render() {
    const sentenceEl = document.getElementById('sentence');
    const translationEl = document.getElementById('translation');

    const current = state.sentences[state.currentIndex];

    if (state.status === 'finished') {
        sentenceEl.innerHTML = `
            <div class="empty-state">
                <div style="margin-bottom: 12px;">Session complete</div>
                <div style="font-size:16px; color:#666; margin-bottom:16px;">
                    Correct: ${state.sessionCorrect} / ${state.sessionCount}<br>
                    Wrong: ${state.sessionWrong}<br>
                    Accuracy: ${Math.round((state.sessionCorrect / state.sessionCount) * 100)}%
                </div>
                <button id="restart-btn">Start new session</button>
            </div>
        `;

        translationEl.innerText = '';

        const btn = document.getElementById('restart-btn');
        if (btn) {
            btn.onclick = () => startNewSession();
        }

        return;
    }

    if (!current) {
        sentenceEl.innerHTML = `<div>Done</div>`;
        translationEl.innerText = '';
        return;
    }


    // =========================
    // LEVEL INDICATOR
    // =========================
    const levelEl = document.getElementById('level-indicator');

    if (levelEl) {
        const level = Math.min(current.memoryLevel || 0, 5);

        let dots = '';

        for (let i = 0; i < 5; i++) {
            if (i < level) {
                dots += `<div class="level-dot level-${level}"></div>`;
            } else {
                dots += `<div class="level-dot"></div>`;
            }
        }

        levelEl.innerHTML = `<div class="level-dots">${dots}</div>`;
    }


    // =========================
    // 📊 PROGRESS
    // =========================
    const counterEl = document.getElementById('progress-counter'); // or 'progress'

    if (counterEl && state.sessionQueue.length > 0) {
        const currentNum = state.currentQueueIndex + 1;
        const total = state.sessionQueue.length;

        counterEl.innerText = `${currentNum} / ${total}`;
    }

    const fillEl = document.getElementById('progress-fill');

    if (fillEl && state.sessionQueue.length > 0) {
        const progress =
        ((state.currentQueueIndex + 1) / state.sessionQueue.length) * 100;

        fillEl.style.width = `${progress}%`;
    }

    // =========================
    // SENTENCE INIT
    // =========================
    if (state.currentIndex !== lastRenderedIndex) {
        sentenceInitialized = false;
        lastRenderedIndex = state.currentIndex;
    }

    // =========================
    // EMPTY
    // =========================
    if (!current) {
        sentenceEl.innerHTML = `<div>Done</div>`;
        translationEl.innerText = '';
        return;
    }

    // =========================
    // SENTENCE
    // =========================
    if (!sentenceInitialized) {
        sentenceEl.innerHTML = createGapSentence(current);
        sentenceInitialized = true;
    }

    translationEl.innerText = current.translation;

    const input = document.getElementById('gap-input');
    if (!input) return;

    // 🔥 ALWAYS RESET STATE CLEANLY
    input.classList.remove('flash-wrong', 'correct', 'correct-pop');
    input.contentEditable = "true";

    input.focus();

    // =========================
    // 🧠 HELPER (ALWAYS LAST)
    // =========================
    const helperEl = document.getElementById('helper');

    if (helperEl) {
        // helperEl.classList.remove('show');

        if (state.sessionCount < 1) {
            helperEl.innerText = 'Type the missing word and press Enter';
            helperEl.classList.add('show');
        }
        else if (state.status === 'waiting' && state.userInput === '') {
            helperEl.innerText = 'Press Enter to reveal hint';
            helperEl.classList.add('show');
        }
        else if (state.status === 'wrong') {
            helperEl.innerText = 'Type the correct word';
            helperEl.classList.add('show');
        }
        else if (state.status === 'correct') {
            helperEl.innerText = 'Good';
            helperEl.classList.add('show');
        }
        else {
            helperEl.innerText = '';
        }
    }


    // 🔥 CLEAN HANDLERS EVERY RENDER
    input.oninput = null;
    input.onkeydown = null;

    // =========================
    // 🟢 WAITING
    // =========================
    if (state.status === 'waiting') {

        input.innerText = state.userInput;

        input.oninput = () => {
            const text = input.innerText.replace(/\n/g, '');
            state.userInput = text;

            if (input.innerText !== text) {
                input.innerText = text;
            }

            // keep cursor at end
            const range = document.createRange();
            const sel = window.getSelection();

            range.selectNodeContents(input);
            range.collapse(false);

            sel.removeAllRanges();
            sel.addRange(range);
        };

        input.onkeydown = (e) => {
            if (e.key !== 'Enter') return;

            e.preventDefault();
            e.stopPropagation();

            if (state.isSubmitting) return;

            submitAnswer();
        };

        return;
    }

    // =========================
    // 🟢 CORRECT
    // =========================
    if (state.status === 'correct') {
        input.innerText = current.answer;
        input.classList.add('correct', 'correct-pop');

        input.contentEditable = "false";
        input.blur();

        return;
    }

    // =========================
    // 🔴 WRONG FLASH (LOCKED)
    // =========================
    if (state.status === 'wrongFlash') {
        input.innerText = state.userInput;
        input.classList.add('flash-wrong');

        // 🔒 CRITICAL: LOCK INPUT DURING FLASH
        input.contentEditable = "false";
        input.blur();

        return;
    }

    // =========================
    // 🔵 HINT
    // =========================
    const typed = state.userInput;
    const hint = current.answer.slice(typed.length);

    input.innerHTML = `<span class="typed">${typed}</span><span class="hint">${hint}</span>`;

    // 🔥 place caret after typed
    setCaret(input, state.userInput.length);

    // 🔓 ensure input is editable again AFTER flash
    input.contentEditable = "true";
    input.focus();

    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();

            if (state.isSubmitting) return;

            submitAnswer();
            return;
        }

        e.preventDefault();

        if (e.key === 'Backspace') {
            state.userInput = state.userInput.slice(0, -1);
            render();
            return;
        }

        if (e.key.length !== 1) return;

        const nextIndex = state.userInput.length;
        const expected = current.answer[nextIndex];

        if (e.key.toLowerCase() === expected.toLowerCase()) {
            state.userInput += e.key;
            render();
        }
    };


}
