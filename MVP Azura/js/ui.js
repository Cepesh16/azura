import { state } from './state.js';
import { submitAnswer, startNewSession } from './logic.js';

const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

let hasUserFocused = false; // change isMobile to false


function renderOverlay(input, { hintHTML, typed, typedClass }) {

    // clear safely
    input.innerHTML = '';

    const overlay = document.createElement('span');
    overlay.className = 'overlay';

    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.innerHTML = hintHTML; // safe because controlled

    const typedEl = document.createElement('span');
    typedEl.className = `typed ${typedClass}`;
    typedEl.textContent = typed;

    overlay.appendChild(hint);
    overlay.appendChild(typedEl);

    input.appendChild(overlay);
}


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

function scheduleAutoSubmit(input, current) {

    // Cancel any previous pending autosubmit.
    if (state.autoSubmitTimer) {
        clearTimeout(state.autoSubmitTimer);
        state.autoSubmitTimer = null;
    }

    // Never submit while the keyboard is still composing
    // a gesture/IME result.
    if (state.isComposing) return;

    const inputValue = state.userInput.toLowerCase();
    const answer = current.answer.toLowerCase();

    if (
        inputValue.length !== answer.length ||
        inputValue !== answer
    ) {
        return;
    }

    // Wait briefly so gesture typing has time to deliver
    // any remaining characters.
    state.autoSubmitTimer = setTimeout(() => {

        state.autoSubmitTimer = null;

        // Re-check everything after the delay.
        if (state.isComposing) return;
        if (state.isSubmitting) return;
        if (state.status !== 'waiting' && state.status !== 'wrong') return;

        const latestInput = (state.userInput || '').toLowerCase();
        const latestAnswer = current.answer.toLowerCase();

        if (
            latestInput.length === latestAnswer.length &&
            latestInput === latestAnswer
        ) {
            submitAnswer();
        }

    }, 180);
}


function updateHintUI(input, current) {

    const rawTyped = state.userInput.toLowerCase();
    
    const isFirstWord = current.isFirstWord;
    const fullAnswer = current.formattedAnswer;

    const typed =
        isFirstWord && rawTyped.length > 0
            ? rawTyped.charAt(0).toUpperCase() + rawTyped.slice(1)
            : rawTyped;

    const typedLen = rawTyped.length;

    const hiddenPart = fullAnswer.slice(0, typedLen);
    const visiblePart = fullAnswer.slice(typedLen);

    const hintHTML = `<span style="visibility:hidden">${hiddenPart}</span>${visiblePart}`;

    const typedClass = state.lastTypedCorrect ? 'correct' : 'wrong';

    renderOverlay(input, {
        hintHTML,
        typed,
        typedClass
    });

    setCaret(input, rawTyped.length);
}

function createGapSentence(sentenceObj) {

    const { sentence, gapIndex } = sentenceObj;

    if (gapIndex === -1) {
        console.warn('⚠️ gapIndex not found:', sentenceObj);
        return sentence;
    }

    const before = sentence.slice(0, gapIndex);
    const after = sentence.slice(gapIndex + sentenceObj.answerLength);

    return `${before}<div class="gap-wrapper"><span id="gap-input" contenteditable="true" data-word-id="${sentenceObj.id}" data-placeholder="..." class="gap"></span></div>${after}`;
}


export function render() {
    const sessionStateEl = document.getElementById('session-state');
    const sentenceAreaEl = document.getElementById('sentence-area');

    if (!sentenceAreaEl || !sessionStateEl) return;

    const sentenceEl = document.getElementById('sentence');
    const translationEl = document.getElementById('translation');
    const posEl = document.getElementById('part-of-speech');

    const levelEl = document.getElementById('level-indicator');
    const progressBar = document.getElementById('progress-bar');

    const totalCompletedEl = document.getElementById('total-completed-counter');
    if (totalCompletedEl) {
        totalCompletedEl.innerText = `${state.totalCompleted}`;
    }

    const progressCounter = document.getElementById('progress-counter');
    const optionsBtn = document.getElementById('options-btn');

    // 🔥 GLOBAL VISIBILITY
    const isFinished = state.status === 'finished' || state.status === 'idle';

    if (levelEl) levelEl.classList.toggle('hidden', isFinished);
    if (progressBar) progressBar.classList.toggle('hidden', isFinished);
    if (progressCounter) progressCounter.classList.toggle('hidden', isFinished);
    // if (optionsBtn) optionsBtn.classList.toggle('hidden', isFinished);
    

    const helperEl = document.getElementById('helper');

    const current = state.current;
    console.log(current);

    if (state.status === 'idle') {

        sessionStateEl.innerHTML = `
            <div class="session-state session-state--start">
                <div class="session-state__title">Ready to learn?</div>
                <div class="session-state__actions">
                    <button id="start-btn">Start session</button>
                </div>
            </div>
        `;

        sessionStateEl.classList.remove('hidden');
        sentenceEl.innerHTML = '';
        translationEl.innerText = '';

        const btn = document.getElementById('start-btn');
        if (btn) {
            btn.onclick = () => {
                state.status = 'waiting';
                render();
            };
        }

        return;
    }


    // =========================
    // 👁️ GLOBAL VISIBILITY
    // =========================
    if (levelEl) {
        levelEl.classList.toggle('hidden', state.status === 'finished');
    }

    if (helperEl) {
        helperEl.classList.toggle('hidden', state.status === 'finished');
    }

    // =========================
    // 🏁 FINISHED
    // =========================
    if (state.status === 'finished') {

        sessionStateEl.innerHTML = `
            <div class="session-state session-state--end">
                <div class="session-state__title">Session complete</div>

                <div class="session-state__stats">
                    <div class="session-state__stat">
                        Correct: ${state.sessionCorrect} / ${state.sessionCount}
                    </div>
                    <div class="session-state__stat">
                        Wrong: ${state.sessionWrong}
                    </div>
                    <div class="session-state__stat">
                        Accuracy: ${Math.round((state.sessionCorrect / state.sessionCount) * 100)}%
                    </div>
                </div>

                <div class="session-state__actions">
                    <button id="restart-btn">New session</button>
                </div>
            </div>
        `;

        sessionStateEl.classList.remove('hidden');
        sessionStateEl.classList.add('fade-hidden');  // start from hidden state
        sessionStateEl.classList.remove('fade-visible');


        const btn = document.getElementById('restart-btn');
        if (btn) {
            btn.onclick = () => startNewSession();
        }

        return;
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
    // LEVEL INDICATOR
    // =========================
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
    const bar = document.getElementById('progress-bar');

    if (bar && state.queue.length > 0) {
        const total = state.queue.length;

        let html = '';

        for (let i = 0; i < total; i++) {
            let cls = 'progress-segment';

            if (i < state.completedCount) cls += ' filled';
            else if (i === state.completedCount) cls += ' active';

            html += `<div class="${cls}"></div>`;
        }

        if (!bar.dataset.initialized) {
            let html = '';

            for (let i = 0; i < total; i++) {
                html += `<div class="progress-segment"></div>`;
            }

            bar.innerHTML = html;
            bar.dataset.initialized = 'true';
        }

        const segments = bar.children;

        for (let i = 0; i < segments.length; i++) {
            segments[i].classList.remove('filled', 'active');

            if (i < state.completedCount) {
                segments[i].classList.add('filled');
            } else if (i === state.completedCount) {
                segments[i].classList.add('active');
            }
        }
    }

// =========================
// SENTENCE
// =========================

// Reuse the existing input when we are still on the same word.
// This is critical on mobile because replacing a focused
// contenteditable element can hide the keyboard.
const existingInput = document.getElementById('gap-input');

const canReuseInput =
    existingInput &&
    existingInput.dataset.wordId === String(current.id);

if (!canReuseInput) {
    sentenceEl.innerHTML = createGapSentence(current);
}

translationEl.innerText = current.translation;

    if (posEl) {
        posEl.innerText = current.partOfSpeech
            ? current.partOfSpeech.toLowerCase()
            : '';
    }

    const input = document.getElementById('gap-input');
    if (!input) return;
    input.setAttribute('enterkeyhint', 'done');

input.classList.remove('flash-wrong', 'correct', 'correct-pop');
input.contentEditable = "true";

input.onfocus = () => {
    hasUserFocused = true;
};

// Only automatically focus when the user is expected to type.
// During wrongFlash we deliberately keep the existing focus.
if (state.status === 'waiting' || state.status === 'wrong') {
    setTimeout(() => {
        input.focus();
    }, 0);
}

    // =========================
    // 🧠 HELPER
    // =========================
    if (helperEl) {
        if (!hasUserFocused) {
            helperEl.innerText = 'Tap to start';
            helperEl.classList.add('show');
        }
        else if (state.sessionCount < 1) {
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

    input.oninput = null;
    input.onkeydown = null;




    // =========================
    // 🟢 WAITING
    // =========================
    if (state.status === 'waiting') {

        input.oninput = () => {
            let text = input.textContent.replace(/\n/g, '').toLowerCase();

            state.userInput = text;

            // ✅ AUTOSUBMIT (ADD THIS)
scheduleAutoSubmit(input, current);

    // force clean text (no weird mobile stuff)
            if (input.textContent !== text) {
                input.textContent = text;
            }

    // move cursor to end
            const range = document.createRange();
            const sel = window.getSelection();

            range.selectNodeContents(input);
            range.collapse(false);

            sel.removeAllRanges();
            sel.addRange(range);
        };



        input.onkeydown = (e) => {
            console.log('KEY:', e.key);

            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();

                if (state.isSubmitting) return;

                submitAnswer();
            }
        };

        return;
    }

    // =========================
    // 🟢 CORRECT
    // =========================
    if (state.status === 'correct') {

        input.textContent = current.formattedAnswer;

        input.classList.add('correct', 'correct-pop');

        input.contentEditable = "false";
        input.blur();

        return;
    }

 // =========================
// 🔴 WRONG FLASH
// =========================
if (state.status === 'wrongFlash') {

    renderOverlay(input, {
        hintHTML: `<span style="visibility:hidden">${state.userInput}</span>`,
        typed: state.userInput,
        typedClass: 'wrong'
    });

    input.classList.add('flash-wrong');

    // Lock input while the wrong-answer animation is running.
    state.inputLocked = true;

    const onAnimEnd = (e) => {
        if (e.target !== input) return;

        input.removeEventListener('animationend', onAnimEnd);

        state.inputLocked = false;
        state.status = 'wrong';
        state.userInput = '';
        state.isSubmitting = false;

        // IMPORTANT:
        // Do NOT recreate the input element.
        // Keep the existing focused element so mobile keyboard stays open.
        updateHintUI(input, state.current);

        input.classList.remove('flash-wrong');

        input.focus();
        setCaret(input, 0);

        // Update helper text without rebuilding the sentence.
        if (helperEl) {
            helperEl.innerText = 'Type the correct word';
            helperEl.classList.add('show');
        }

        // Reattach normal input handling.
        input.contentEditable = 'true';

        input.oninput = null;
        input.onkeydown = null;

        input.oninput = () => {
            let text = input.textContent
                .replace(/\n/g, '')
                .toLowerCase();

            state.userInput = text;

scheduleAutoSubmit(input, current);

            if (input.textContent !== text) {
                input.textContent = text;
            }

            const range = document.createRange();
            const sel = window.getSelection();

            range.selectNodeContents(input);
            range.collapse(false);

            sel.removeAllRanges();
            sel.addRange(range);
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();

                if (state.isSubmitting) return;

                submitAnswer();
            }
        };
    };

    input.addEventListener('animationend', onAnimEnd);

    return;
}

    // =========================
    // 🔵 HINT
    // =========================
    updateHintUI(input, current);

    input.contentEditable = "true";
    setTimeout(() => input.focus(), 0);

    function forceFocusAndCaret() {
        input.focus(); // ✅ force focus FIRST

        setTimeout(() => {
            setCaret(input, state.userInput.length);
        }, 0);
    }

    input.onmousedown = (e) => {
        e.preventDefault(); // ✅ prevents weird selection issues
        forceFocusAndCaret(); // ✅ mobile critical
    };

    input.ontouchend = forceFocusAndCaret;

// --- IME / gesture typing handling ---
input.isComposing = false;

input.addEventListener('compositionstart', () => {
    state.isComposing = true;
    input.isComposing = true;
});

input.addEventListener('compositionend', (ev) => {
    state.isComposing = false;
    input.isComposing = false;

    const composed = (ev.data || '').toLowerCase().trim();

    if (!composed) return;

    const current = state.current;
    const answer = current.answer.toLowerCase();

    // Gesture typing must match the COMPLETE answer.
    // Never accept a valid prefix of a longer word.
    if (composed === answer) {
        state.userInput = answer;
        state.lastTypedCorrect = true;

        updateHintUI(input, current);
        setCaret(input, state.userInput.length);

        scheduleAutoSubmit(input, current);
        return;
    }

    // Wrong gesture result.
    state.lastTypedCorrect = false;

    // Keep the typed result visible briefly.
    state.userInput = composed;

    renderOverlay(input, {
        hintHTML: `<span style="visibility:hidden">${composed}</span>`,
        typed: composed,
        typedClass: 'wrong'
    });

    input.classList.add('flash-wrong-letter');

    setTimeout(() => {
        input.classList.remove('flash-wrong-letter');

        state.userInput = '';

        updateHintUI(input, current);
        input.focus();
        setCaret(input, 0);
    }, 200);
});

    input.onselectstart = (e) => e.preventDefault();
    
    // ✅ mobile fix
    input.onbeforeinput = (e) => {
        const current = state.current;

        // 🚫 ALWAYS block native DOM changes
        e.preventDefault();
// inside input.onbeforeinput, right after e.preventDefault():
if (state.inputLocked || state.isSubmitting || state.isComposing) {
  // ignore events while locked, submitting, or during IME composition
  return;
}

        // =========================
        // ✍️ typing
        // =========================
    if (e.inputType === 'insertText') {
        e.preventDefault();

        const text = (e.data || '').toLowerCase();

        let added = false;

        for (let i = 0; i < text.length; i++) {
            const nextIndex = state.userInput.length;
            const expected = current.answer[nextIndex];

            if (text[i] === expected?.toLowerCase()) {
                state.userInput += text[i];
                added = true;
            } else {
                // stop at first wrong letter
                break;
            }
        }

        if (added) {
            state.lastTypedCorrect = true;
            updateHintUI(input, current);

            // ✅ STRICT AUTOSUBMIT
scheduleAutoSubmit(input, current);

        } else {
            state.lastTypedCorrect = false;

// <-- REPLACEMENT: reset typed state but KEEP keyboard open
state.userInput = '';
updateHintUI(input, current);

// keep keyboard visible — move caret to start so user can try again
input.focus();
setCaret(input, 0);

// short visual flash for the wrong letter
input.classList.add('flash-wrong-letter');
setTimeout(() => {
    input.classList.remove('flash-wrong-letter');
}, 200);
        }

        return;
    }

        // =========================
        // ⬅️ backspace
        // =========================
        if (e.inputType === 'deleteContentBackward') {
            state.userInput = state.userInput.slice(0, -1);
            updateHintUI(input, current);
            return;
        }
    };

    input.onkeydown = (e) => {
        console.log('KEY:', e.key);

        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();

            if (state.isSubmitting) return;

            submitAnswer();
        }
    };
}