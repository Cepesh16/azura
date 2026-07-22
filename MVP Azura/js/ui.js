import { state } from './state.js';
import { submitAnswer } from './logic.js';

let sentenceInitialized = false;

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

    const current = state.sentences[state.currentIndex];
    if (!current) return;

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