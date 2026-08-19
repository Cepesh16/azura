import { state } from './state.js';
import { submitAnswer, startNewSession } from './logic.js';

let sentenceInitialized = false;

const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

let initialFocusPending = isMobile;

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

function updateHintUI(input, current) {

    const rawTyped = state.userInput.toLowerCase();

    const isFirstWord =
        current.sentence.trim().toLowerCase().startsWith(current.answer.toLowerCase());

    // ✅ typed (visual only)
    const typed =
        isFirstWord && rawTyped.length > 0
            ? rawTyped.charAt(0).toUpperCase() + rawTyped.slice(1)
            : rawTyped;

    // ✅ hint
    let hintRaw = current.answer.slice(rawTyped.length);

    if (isFirstWord && rawTyped.length === 0 && hintRaw.length > 0) {
        hintRaw = hintRaw.charAt(0).toUpperCase() + hintRaw.slice(1);
    }

    const typedClass = state.lastTypedCorrect ? 'correct' : 'wrong';

    input.innerHTML = `
        <span class="typed ${typedClass}">${typed}</span><span class="hint">${hintRaw}</span>
    `;

    setCaret(input, rawTyped.length);
}

function createGapSentence(sentenceObj) {
    const { sentence, answer } = sentenceObj;

    const regex = new RegExp(`\\b${answer}\\b`, 'i');

    return sentence.replace(
        regex,
    `<div class="gap-wrapper"><span id="gap-input" contenteditable="true" class="gap"></span></div>`
    );
}

export function resetSentence() {
    sentenceInitialized = false;
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
        totalCompletedEl.innerText = `🗐 ${state.totalCompleted}`;
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

    const current = state.sentences[state.currentIndex];
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

    if (bar && state.sessionQueue.length > 0) {
        const total = state.sessionQueue.length;

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
    sentenceEl.innerHTML = createGapSentence(current);


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

    if (initialFocusPending) {
        input.onfocus = () => {
            initialFocusPending = false;
        };
    } else {
        setTimeout(() => input.focus(), 0);
    }

    // =========================
    // 🧠 HELPER
    // =========================
    if (helperEl) {
        if (initialFocusPending) {
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

        input.innerText = state.userInput;

        input.oninput = () => {
            let text = input.innerText.replace(/\n/g, '').toLowerCase();

            state.userInput = text;

            if (
                state.userInput.length === current.answer.length &&
                state.userInput.toLowerCase() === current.answer.toLowerCase()
            ) {
                setTimeout(() => {
                    submitAnswer();
                }, 0);
            }

    // force clean text (no weird mobile stuff)
            if (input.innerText !== text) {
                input.innerText = text;
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

        const isFirstWord =
            current.sentence.trim().toLowerCase().startsWith(current.answer.toLowerCase());

        const display = isFirstWord
            ? current.answer.charAt(0).toUpperCase() + current.answer.slice(1)
            : current.answer;

        input.innerText = display;

        input.classList.add('correct', 'correct-pop');

        input.contentEditable = "false";
        input.blur();

        return;
    }

    // =========================
    // 🔴 WRONG FLASH
    // =========================
    if (state.status === 'wrongFlash') {
        input.innerText = state.userInput;
        input.classList.add('flash-wrong');

        input.contentEditable = "false";
        input.blur();

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

    input.onselectstart = (e) => e.preventDefault();
    
    // ✅ mobile fix
    input.onbeforeinput = (e) => {
        const current = state.sentences[state.currentIndex];

        // 🚫 ALWAYS block native DOM changes
        e.preventDefault();

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

            // ✅ AUTOSUBMIT (ADD THIS)
            if (state.userInput.length === current.answer.length) {
                setTimeout(() => {
                    submitAnswer();
                }, 0);
            }

        } else {
            state.lastTypedCorrect = false;

            // 🔥 FULL RESET (state + DOM + IME)
            state.userInput = '';

            input.innerHTML = '<span class="typed"></span><span class="hint">' + current.answer + '</span>';

            // 🔥 force blur → kills mobile composition
            input.blur();

            setTimeout(() => {
                input.focus();
                setCaret(input, 0);
            }, 0);

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