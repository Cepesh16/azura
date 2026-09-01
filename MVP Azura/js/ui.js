import { state } from './state.js';
import { submitAnswer, startNewSession } from './logic.js';

const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

let hasUserFocused = false;


// ============================================================
// RENDER OVERLAY
// ============================================================

function renderOverlay(
    input,
    { hintHTML, typed, typedClass, fullText }
) {

    input.innerHTML = '';

    const overlay = document.createElement('span');
    overlay.className = 'overlay';

    // Invisible element that controls the real width.
    const sizer = document.createElement('span');
    sizer.className = 'overlay-sizer';
    sizer.textContent = fullText || typed || '';

    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.innerHTML = hintHTML || '';

    const typedEl = document.createElement('span');
    typedEl.className = `typed ${typedClass || ''}`;
    typedEl.textContent = typed || '';

    overlay.appendChild(sizer);
    overlay.appendChild(hint);
    overlay.appendChild(typedEl);

    input.appendChild(overlay);

    requestAnimationFrame(() => {
        setCaret(
            input,
            (state.userInput || '').length
        );
    });
}


// ============================================================
// CARET
// ============================================================

function setCaret(el, position) {

    const range = document.createRange();
    const sel = window.getSelection();

    const typedNode =
        el.querySelector('.typed');

    if (!typedNode || !typedNode.firstChild) {
        return;
    }

    const textNode =
        typedNode.firstChild;

    const safePos =
        Math.min(position, textNode.length);

    range.setStart(
        textNode,
        safePos
    );

    range.collapse(true);

    sel.removeAllRanges();
    sel.addRange(range);
}


// ============================================================
// AUTOSUBMIT
// ============================================================

function scheduleAutoSubmit(input, current) {

    if (state.autoSubmitTimer) {
        clearTimeout(state.autoSubmitTimer);
        state.autoSubmitTimer = null;
    }

if (state.isComposing) return;
if (state.inputLocked && !state.answerComplete) return;
if (state.isSubmitting) return;

    const value =
        (state.userInput || '').toLowerCase();

    const answer =
        current.answer.toLowerCase();

    if (value !== answer) {
        return;
    }

    state.autoSubmitTimer = setTimeout(() => {

        state.autoSubmitTimer = null;

if (state.isComposing) return;
if (state.inputLocked && !state.answerComplete) return;
if (state.isSubmitting) return;

        const latestValue =
            (state.userInput || '').toLowerCase();

        const latestAnswer =
            current.answer.toLowerCase();

        if (
            latestValue === latestAnswer &&
            latestValue.length === latestAnswer.length
        ) {
            submitAnswer();
        }

    }, 350);
}


// ============================================================
// HINT UI
// ============================================================

function updateHintUI(input, current) {

    const rawTyped =
        (state.userInput || '').toLowerCase();

    const isFirstWord =
        current.isFirstWord;

    const fullAnswer =
        current.formattedAnswer;

    const typed =
        isFirstWord && rawTyped.length > 0
            ? rawTyped.charAt(0).toUpperCase() +
              rawTyped.slice(1)
            : rawTyped;

    // IMPORTANT:
    // The FULL answer is visible as the hint.
    // The typed element is positioned on top of it.
    const hintHTML =
        fullAnswer;

    const typedClass =
        state.lastTypedCorrect
            ? 'correct'
            : 'wrong';

    renderOverlay(input, {
        hintHTML,
        typed,
        typedClass,
        fullText: fullAnswer
    });

    setCaret(
        input,
        rawTyped.length
    );
}


// ============================================================
// TYPED-ONLY UI
// ============================================================

function updateTypedOnlyUI(input, current) {

    const rawTyped =
        (state.userInput || '').toLowerCase();

    const typed =
        current.isFirstWord && rawTyped.length > 0
            ? rawTyped.charAt(0).toUpperCase() +
              rawTyped.slice(1)
            : rawTyped;

    renderOverlay(input, {
        hintHTML: '',
        typed,
        typedClass:
            state.lastTypedCorrect
                ? 'correct'
                : 'wrong',
        fullText: typed
    });

    setCaret(
        input,
        rawTyped.length
    );
}


// ============================================================
// GAP WIDTH
// ============================================================

function adjustGapWidth(input, current) {

    if (!input || !current) {
        return;
    }

    const answer =
        (
            current.formattedAnswer ||
            current.answer ||
            ''
        ).trim();

    if (!answer) {
        return;
    }

    // Measure the actual answer text using the same
    // typography as the gap.
    const cs =
        window.getComputedStyle(input);

    const meas =
        document.createElement('span');

    meas.style.position = 'absolute';
    meas.style.visibility = 'hidden';
    meas.style.whiteSpace = 'pre';

    meas.style.fontFamily = cs.fontFamily;
    meas.style.fontSize = cs.fontSize;
    meas.style.fontWeight = cs.fontWeight;
    meas.style.letterSpacing = cs.letterSpacing;
    meas.style.padding = cs.padding;
    meas.style.lineHeight = cs.lineHeight;

    meas.textContent = answer;

    document.body.appendChild(meas);

    const answerWidth =
        meas.offsetWidth;

    meas.remove();

    // The answer width is the FLOOR.
    // The gap is still allowed to grow/shrink
    // naturally according to the user's typed text.
    input.style.minWidth =
        answerWidth + 'px';

    input.style.width = '';
    input.style.maxWidth = '';
}


// ============================================================
// CREATE SENTENCE
// ============================================================

function createGapSentence(sentenceObj) {

    const {
        sentence,
        gapIndex
    } = sentenceObj;

    if (gapIndex === -1) {

        console.warn(
            '⚠️ gapIndex not found:',
            sentenceObj
        );

        return sentence;
    }

    const before =
        sentence.slice(
            0,
            gapIndex
        );

    const after =
        sentence.slice(
            gapIndex +
            sentenceObj.answerLength
        );

    return `${before}
        <div class="gap-wrapper">
            <span
                id="gap-input"
                contenteditable="true"
                data-word-id="${sentenceObj.id}"
                data-placeholder="..."
                class="gap"
            ></span>
        </div>
    ${after}`;
}


// ============================================================
// RENDER
// ============================================================

export function render() {

    const sessionStateEl =
        document.getElementById('session-state');

    const sentenceAreaEl =
        document.getElementById('sentence-area');

    if (
        !sentenceAreaEl ||
        !sessionStateEl
    ) {
        return;
    }

    const sentenceEl =
        document.getElementById('sentence');

    const translationEl =
        document.getElementById('translation');

    const posEl =
        document.getElementById('part-of-speech');

    const levelEl =
        document.getElementById('level-indicator');

    const progressBar =
        document.getElementById('progress-bar');

    const totalCompletedEl =
        document.getElementById(
            'total-completed-counter'
        );

    if (totalCompletedEl) {

        totalCompletedEl.innerText =
            `${state.totalCompleted}`;
    }

    const progressCounter =
        document.getElementById(
            'progress-counter'
        );

    const helperEl =
        document.getElementById('helper');

    const current =
        state.current;


    // ========================================================
    // IDLE
    // ========================================================

    if (state.status === 'idle') {

        sessionStateEl.innerHTML = `
            <div class="session-state session-state--start">
                <div class="session-state__title">
                    Ready to learn?
                </div>

                <div class="session-state__actions">
                    <button id="start-btn">
                        Start session
                    </button>
                </div>
            </div>
        `;

        sentenceEl.innerHTML = '';
        translationEl.innerText = '';

        const btn =
            document.getElementById('start-btn');

        if (btn) {

            btn.onclick = () => {

                state.status = 'waiting';

                render();
            };
        }

        return;
    }


    // ========================================================
    // VISIBILITY
    // ========================================================

    const isFinished =
        state.status === 'finished';

    if (levelEl) {

        levelEl.classList.toggle(
            'hidden',
            isFinished
        );
    }

    if (progressBar) {

        progressBar.classList.toggle(
            'hidden',
            isFinished
        );
    }

    if (progressCounter) {

        progressCounter.classList.toggle(
            'hidden',
            isFinished
        );
    }

    if (helperEl) {

        helperEl.classList.toggle(
            'hidden',
            isFinished
        );
    }


    // ========================================================
    // FINISHED
    // ========================================================

    if (state.status === 'finished') {

        sessionStateEl.innerHTML = `
            <div class="session-state session-state--end">

                <div class="session-state__title">
                    Session complete
                </div>

                <div class="session-state__stats">

                    <div class="session-state__stat">
                        Correct:
                        ${state.sessionCorrect}
                        /
                        ${state.sessionCount}
                    </div>

                    <div class="session-state__stat">
                        Wrong:
                        ${state.sessionWrong}
                    </div>

                    <div class="session-state__stat">
                        Accuracy:
                        ${
                            Math.round(
                                (
                                    state.sessionCorrect /
                                    state.sessionCount
                                ) * 100
                            )
                        }%
                    </div>

                </div>

                <div class="session-state__actions">
                    <button id="restart-btn">
                        New session
                    </button>
                </div>

            </div>
        `;

        const btn =
            document.getElementById(
                'restart-btn'
            );

        if (btn) {

            btn.onclick = () =>
                startNewSession();
        }

        return;
    }


    // ========================================================
    // EMPTY
    // ========================================================

    if (!current) {

        sentenceEl.innerHTML =
            `<div>Done</div>`;

        translationEl.innerText = '';

        return;
    }


    // ========================================================
    // LEVEL
    // ========================================================

    if (levelEl) {

        const level =
            Math.min(
                current.memoryLevel || 0,
                5
            );

        let dots = '';

        for (let i = 0; i < 5; i++) {

            if (i < level) {

                dots +=
                    `<div class="level-dot level-${level}"></div>`;

            } else {

                dots +=
                    `<div class="level-dot"></div>`;
            }
        }

        levelEl.innerHTML =
            `<div class="level-dots">${dots}</div>`;
    }


    // ========================================================
    // PROGRESS
    // ========================================================

    if (
        progressBar &&
        state.queue.length > 0
    ) {

        const total =
            state.queue.length;

        if (!progressBar.dataset.initialized) {

            let html = '';

            for (
                let i = 0;
                i < total;
                i++
            ) {

                html +=
                    `<div class="progress-segment"></div>`;
            }

            progressBar.innerHTML =
                html;

            progressBar.dataset.initialized =
                'true';
        }

        const segments =
            progressBar.children;

        for (
            let i = 0;
            i < segments.length;
            i++
        ) {

            segments[i].classList.remove(
                'filled',
                'active'
            );

            if (
                i <
                state.completedCount
            ) {

                segments[i].classList.add(
                    'filled'
                );

            } else if (
                i ===
                state.completedCount
            ) {

                segments[i].classList.add(
                    'active'
                );
            }
        }
    }


    // ========================================================
    // SENTENCE
    // ========================================================

    const existingInput =
        document.getElementById(
            'gap-input'
        );

    const canReuseInput =
        existingInput &&
        existingInput.dataset.wordId ===
            String(current.id);

    if (!canReuseInput) {

        sentenceEl.innerHTML =
            createGapSentence(
                current
            );
    }

    translationEl.innerText =
        current.translation;

    if (posEl) {

        posEl.innerText =
            current.partOfSpeech
                ? current.partOfSpeech.toLowerCase()
                : '';
    }

    const input =
        document.getElementById(
            'gap-input'
        );

    if (!input) {
        return;
    }

    input.setAttribute(
        'enterkeyhint',
        'done'
    );


    // ========================================================
    // BASE INPUT STATE
    // ========================================================

    input.classList.remove(
        'flash-wrong',
        'correct',
        'correct-pop'
    );

    input.contentEditable =
        'true';

    input.onfocus = () => {
        hasUserFocused = true;
    };


    // ========================================================
    // HELPER
    // ========================================================

    if (helperEl) {

        if (!hasUserFocused) {

            helperEl.innerText =
                'Tap to start';

            helperEl.classList.add(
                'show'
            );

        } else if (
            state.sessionCount < 1
        ) {

            helperEl.innerText =
                'Type the missing word and press Enter';

            helperEl.classList.add(
                'show'
            );

        } else if (
            state.status === 'waiting' &&
            state.userInput === ''
        ) {

            helperEl.innerText =
                'Press Enter to reveal hint';

            helperEl.classList.add(
                'show'
            );

        } else if (
            state.status === 'wrong'
        ) {

            helperEl.innerText =
                'Type the correct word';

            helperEl.classList.add(
                'show'
            );

        } else if (
            state.status === 'correct'
        ) {

            helperEl.innerText =
                'Good';

            helperEl.classList.add(
                'show'
            );

        } else {

            helperEl.innerText = '';
        }
    }


    // ========================================================
    // RESET HANDLERS
    // ========================================================

    input.oninput = null;
    input.onkeydown = null;
    input.onbeforeinput = null;
    input.oncompositionstart = null;
    input.oncompositionend = null;
    input.onmousedown = null;
    input.ontouchend = null;
    input.onselectstart = null;
    input.onanimationend = null;


    // ========================================================
    // ENTER
    // ========================================================

    input.onkeydown = (e) => {

        if (e.key !== 'Enter') {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (state.isSubmitting) {
            return;
        }

        submitAnswer();
    };


    // ========================================================
    // CORRECT
    // ========================================================

    if (state.status === 'correct') {

        input.textContent =
            current.formattedAnswer;

        input.classList.add(
            'correct',
            'correct-pop'
        );

        input.contentEditable =
            'false';

        input.blur();

        return;
    }


    // ========================================================
    // WRONG FLASH
    // ========================================================

    if (state.status === 'wrongFlash') {

        renderOverlay(input, {
            hintHTML:
                `<span style="visibility:hidden">${
                    state.userInput
                }</span>`,

            typed:
                state.userInput,

            typedClass:
                'wrong',

            fullText:
                current.formattedAnswer
        });

        input.classList.add(
            'flash-wrong'
        );

        state.inputLocked = true;


        input.onanimationend = (e) => {

            if (e.target !== input) {
                return;
            }

            input.classList.remove(
                'flash-wrong'
            );

            state.inputLocked = false;
            state.status = 'wrong';
            state.userInput = '';
            state.isSubmitting = false;
            state.answeredWithHint = true;

            // CRITICAL:
            // Re-render the hint phase so that
            // all normal input handlers are installed.
            render();
        };

        return;
    }


    // ========================================================
    // NORMAL / HINT INPUT MODE
    // ========================================================

    input.contentEditable =
        'true';


    // Fresh question:
    // show typed letters only.
    //
    // Hint phase:
    // show full hint with typed letters on top.

    if (state.status === 'wrong') {

        updateHintUI(
            input,
            current
        );

    } else if (
        state.userInput.length > 0
    ) {

        updateTypedOnlyUI(
            input,
            current
        );

    } else {

        input.innerHTML = '';
    }

    // Always establish the minimum width from
    // the correct answer.
    adjustGapWidth(
        input,
        current
    );


    // ========================================================
    // FOCUS
    // ========================================================

    setTimeout(() => {

        if (
            !state.isSubmitting &&
            !state.inputLocked
        ) {
            input.focus();
        }

    }, 0);


    function forceFocusAndCaret() {

        input.focus();

        setTimeout(() => {

            setCaret(
                input,
                state.userInput.length
            );

        }, 0);
    }


    input.onmousedown = (e) => {

        e.preventDefault();

        forceFocusAndCaret();
    };


    input.ontouchend = () => {
        forceFocusAndCaret();
    };


    input.onselectstart = (e) => {
        e.preventDefault();
    };


    // ========================================================
    // COMPOSITION / SWIPE
    // ========================================================

    input.isComposing = false;


    input.oncompositionstart = () => {

        if (state.autoSubmitTimer) {

            clearTimeout(
                state.autoSubmitTimer
            );

            state.autoSubmitTimer = null;
        }

        state.isComposing = true;
        input.isComposing = true;
    };


    input.oncompositionend = (e) => {

        state.isComposing = false;
        input.isComposing = false;

        const candidate =
            (e.data || '')
                .toLowerCase()
                .trim();

        if (!candidate) {
            return;
        }

        const currentWord =
            state.current;

        const answer =
            currentWord.answer.toLowerCase();


        // ====================================================
        // BEFORE HINT
        //
        // Swipe result is just user input.
        // NO letter correctness checking.
        // ====================================================

        if (!state.answeredWithHint) {

            state.userInput =
                candidate;

            state.lastTypedCorrect =
                true;

            updateTypedOnlyUI(
                input,
                currentWord
            );

            adjustGapWidth(
                input,
                currentWord
            );

            scheduleAutoSubmit(
                input,
                currentWord
            );

            return;
        }


        // ====================================================
        // HINT PHASE — CORRECT SWIPE
        // ====================================================

if (candidate === answer) {

    state.userInput = candidate;
    state.lastTypedCorrect = true;

    updateHintUI(
        input,
        currentWord
    );

    adjustGapWidth(
        input,
        currentWord
    );

    state.answerComplete = true;
    state.inputLocked = true;

    scheduleAutoSubmit(
        input,
        currentWord
    );

    return;
}


        // ====================================================
        // HINT PHASE — WRONG SWIPE
        // ====================================================

        state.lastTypedCorrect =
            false;

        renderOverlay(input, {

            hintHTML:
                `<span style="visibility:hidden">${
                    candidate
                }</span>`,

            typed:
                candidate,

            typedClass:
                'wrong',

            fullText:
                currentWord.formattedAnswer
        });

        input.classList.add(
            'flash-wrong-letter'
        );

        setTimeout(() => {

            input.classList.remove(
                'flash-wrong-letter'
            );

            state.userInput = '';
            state.lastTypedCorrect = true;

            updateHintUI(
                input,
                currentWord
            );

            adjustGapWidth(
                input,
                currentWord
            );

            input.focus();
            setCaret(input, 0);

        }, 200);
    };


    // ========================================================
    // BEFOREINPUT
    //
    // Before hint:
    //   free typing, no correctness check.
    //
    // After hint:
    //   strict character-by-character checking.
    // ========================================================

input.onbeforeinput = (e) => {

    const currentWord =
        state.current;


    // ====================================================
    // ANSWER ALREADY COMPLETE
    //
    // Do NOT cancel the pending autosubmit.
    // Simply reject any extra input.
    // ====================================================

    if (
        state.answerComplete ||
        state.inputLocked ||
        state.isSubmitting
    ) {

        e.preventDefault();
        return;
    }


    // ====================================================
    // NORMAL NEW INPUT
    //
    // Cancel a pending autosubmit because the answer
    // may be changing again.
    // ====================================================

    if (state.autoSubmitTimer) {

        clearTimeout(
            state.autoSubmitTimer
        );

        state.autoSubmitTimer = null;
    }


        // ----------------------------------------------------
        // COMPOSITION / SWIPE
        //
        // compositionend handles the completed candidate.
        // ----------------------------------------------------

        if (state.isComposing) {

            e.preventDefault();
            return;
        }


        // ====================================================
        // INSERT TEXT
        // ====================================================

        if (e.inputType === 'insertText') {

            e.preventDefault();

            const text =
                (e.data || '')
                    .toLowerCase();

            if (!text) {
                return;
            }


            // =================================================
            // PHASE 1 — BEFORE HINT
            //
            // Accept anything.
            // Enter checks it.
            // Exact correct answers autosubmit.
            // =================================================

            if (!state.answeredWithHint) {

                state.userInput += text;

                state.lastTypedCorrect =
                    true;

                updateTypedOnlyUI(
                    input,
                    currentWord
                );

                scheduleAutoSubmit(
                    input,
                    currentWord
                );

                return;
            }


            // =================================================
            // PHASE 2 — HINT SHOWN
            // =================================================


            // -------------------------------------------------
            // MULTI-CHARACTER INPUT
            // -------------------------------------------------

            if (text.length > 1) {

                const answer =
                    currentWord.answer.toLowerCase();

                // A complete swipe candidate replaces
                // the current typed value.
                state.userInput = text;

                if (text === answer) {

                    state.lastTypedCorrect =
                        true;

                    updateHintUI(
                        input,
                        currentWord
                    );

                    scheduleAutoSubmit(
                        input,
                        currentWord
                    );

                    return;
                }


                // Wrong gesture.
                state.lastTypedCorrect =
                    false;

                renderOverlay(input, {

                    hintHTML:
                        `<span style="visibility:hidden">${
                            text
                        }</span>`,

                    typed:
                        text,

                    typedClass:
                        'wrong',

                    fullText:
                        currentWord.formattedAnswer
                });

                input.classList.add(
                    'flash-wrong-letter'
                );

                setTimeout(() => {

                    input.classList.remove(
                        'flash-wrong-letter'
                    );

                    state.userInput = '';
                    state.lastTypedCorrect = true;

                    updateHintUI(
                        input,
                        currentWord
                    );

                    input.focus();
                    setCaret(input, 0);

                }, 200);

                return;
            }


            // -------------------------------------------------
            // SINGLE CHARACTER — HINT PHASE
            // -------------------------------------------------

            const char =
                text;

            const nextIndex =
                state.userInput.length;

            const expected =
                currentWord.answer[nextIndex];


if (
    char ===
    expected?.toLowerCase()
) {

    state.userInput += char;

    state.lastTypedCorrect = true;

    updateHintUI(
        input,
        currentWord
    );

    // Full answer reached.
    if (
        state.userInput.length ===
        currentWord.answer.length &&
        state.userInput.toLowerCase() ===
        currentWord.answer.toLowerCase()
    ) {

        state.answerComplete = true;
        state.inputLocked = true;

        scheduleAutoSubmit(
            input,
            currentWord
        );

        return;
    }

    scheduleAutoSubmit(
        input,
        currentWord
    );

} else {

                // Wrong letter during hint phase:
                // do not add it to state.
                // Show the flash.
                state.lastTypedCorrect =
                    false;

                input.classList.add(
                    'flash-wrong-letter'
                );

                setTimeout(() => {

                    input.classList.remove(
                        'flash-wrong-letter'
                    );

                }, 200);

                updateHintUI(
                    input,
                    currentWord
                );

                input.focus();

                setCaret(
                    input,
                    state.userInput.length
                );
            }

            return;
        }


        // ====================================================
        // BACKSPACE
        // ====================================================

        if (
            e.inputType ===
            'deleteContentBackward'
        ) {

            e.preventDefault();

            state.userInput =
                state.userInput.slice(0, -1);

            state.lastTypedCorrect =
                true;

            if (state.answeredWithHint) {

                updateHintUI(
                    input,
                    currentWord
                );

            } else {

                updateTypedOnlyUI(
                    input,
                    currentWord
                );
            }

            setCaret(
                input,
                state.userInput.length
            );

            return;
        }
    };
}