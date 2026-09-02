import { state } from './state.js';
import { submitAnswer, startNewSession } from './logic.js';

let hasUserFocused = false;


// ============================================================
// MEASURE TEXT
// ============================================================

function measureText(input, text) {

    if (!text) {
        return 0;
    }

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
    meas.style.lineHeight = cs.lineHeight;

    meas.textContent = text;

    document.body.appendChild(meas);

    const width =
        meas.getBoundingClientRect().width;

    meas.remove();

    return width;
}


// ============================================================
// CARET
// ============================================================

function setCaret(input, position) {

    if (!input) {
        return;
    }

    const safePosition =
        Math.max(
            0,
            Math.min(
                position,
                input.value.length
            )
        );

    input.focus();

    try {
        input.setSelectionRange(
            safePosition,
            safePosition
        );
    } catch (err) {
        // Ignore selection errors.
    }
}


// ============================================================
// GAP WIDTH
//
// Minimum = answer width
// Actual width = max(answer width, typed text width)
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

    const answerWidth =
        measureText(
            input,
            answer
        );

    const typedRaw =
        state.userInput || '';

    const typed =
        current.isFirstWord && typedRaw.length > 0
            ? typedRaw.charAt(0).toUpperCase() +
              typedRaw.slice(1)
            : typedRaw;

    const typedWidth =
        measureText(
            input,
            typed
        );

const WIDTH_BUFFER = 10;

const finalWidth =
    Math.max(
        answerWidth,
        typedWidth
    ) + WIDTH_BUFFER;

input.style.minWidth =
    (answerWidth + WIDTH_BUFFER) + 'px';

input.style.width =
    finalWidth + 'px';

    input.style.maxWidth =
        'none';

    input.style.whiteSpace =
        'nowrap';
}




// ============================================================
// RENDER HINT
//
// The input itself displays the typed text.
//
// The overlay displays ONLY the remaining letters of the answer.
// ============================================================

function renderHint(input, current) {

    const wrap =
        input.closest('.gap-input-wrap');

    if (!wrap) {
        return;
    }

    let overlay =
        wrap.querySelector('.overlay');

    if (!overlay) {

        overlay =
            document.createElement('span');

        overlay.className =
            'overlay';

        wrap.appendChild(
            overlay
        );
    }

    overlay.innerHTML = '';

    // --------------------------------------------------------
    // NORMAL MODE
    //
    // No hint yet.
    // Keep native input centered.
    // --------------------------------------------------------

    if (!state.answeredWithHint) {

        input.style.textAlign =
            'center';

        input.style.paddingLeft =
            '0px';

        input.style.paddingRight =
            '0px';

        return;
    }


    // --------------------------------------------------------
    // HINT MODE
    //
    // The entire answer is centered inside the input,
    // but the user's typed text starts at the LEFT
    // edge of that centered answer.
    // --------------------------------------------------------

    input.style.textAlign =
        'left';

    input.style.paddingRight =
        '0px';


    const typed =
        state.userInput || '';

    const answer =
        current.formattedAnswer ||
        current.answer ||
        '';

    const remaining =
        answer.slice(
            typed.length
        );

    // Width of the complete answer.
    const answerWidth =
        measureText(
            input,
            answer
        );

    const inputWidth =
        input.getBoundingClientRect().width;

    // Left edge of the centered answer.
    const answerStart =
        Math.max(
            0,
            (inputWidth - answerWidth) / 2
        );

    // Move native left-aligned text to that position.
    input.style.paddingLeft =
        answerStart + 'px';


    // Nothing remains to display.
    if (!remaining) {
        return;
    }


    // --------------------------------------------------------
    // HINT POSITION
    //
    // Hint starts immediately after the real typed text.
    // --------------------------------------------------------

    const typedWidth =
        measureText(
            input,
            typed
        );

    const hint =
        document.createElement('span');

    hint.className =
        'hint';

    hint.textContent =
        remaining;

    hint.style.left =
        (
            answerStart +
            typedWidth
        ) + 'px';

    overlay.appendChild(
        hint
    );
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
        <span class="gap-wrapper">
            <span class="gap-input-wrap">
                <input
                    id="gap-input"
                    type="text"
                    data-word-id="${sentenceObj.id}"
                    class="gap"
                    inputmode="text"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    enterkeyhint="done"
                    aria-label="Type missing word"
                >
            </span>
        </span>
    ${after}`;
}


// ============================================================
// AUTOSUBMIT
// ============================================================

function scheduleAutoSubmit(input, current) {

    if (state.autoSubmitTimer) {

        clearTimeout(
            state.autoSubmitTimer
        );

        state.autoSubmitTimer = null;
    }

    if (state.isComposing) {
        return;
    }

    if (
        state.inputLocked &&
        !state.answerComplete
    ) {
        return;
    }

    if (state.isSubmitting) {
        return;
    }

    const value =
        (state.userInput || '').toLowerCase();

    const answer =
        current.answer.toLowerCase();

    if (value !== answer) {
        return;
    }

    state.autoSubmitTimer =
        setTimeout(() => {

            state.autoSubmitTimer = null;

            if (state.isComposing) {
                return;
            }

            if (
                state.inputLocked &&
                !state.answerComplete
            ) {
                return;
            }

            if (state.isSubmitting) {
                return;
            }

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

                state.status =
                    'waiting';

                render();
            };
        }

        return;
    }


    // ========================================================
    // GLOBAL COUNTER
    // ========================================================

    if (totalCompletedEl) {

        totalCompletedEl.innerText =
            `${state.totalCompleted}`;
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
                Number(current.memoryLevel) || 0,
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
        document.getElementById('gap-input');

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
        document.getElementById('gap-input');

    if (!input) {
        return;
    }


    // ========================================================
    // SYNC NATIVE INPUT
    // ========================================================

    if (
        input.value !==
        (state.userInput || '')
    ) {

        input.value =
            state.userInput || '';
    }

    input.disabled =
        false;

    input.dataset.wordId =
        String(current.id);


    // ========================================================
    // BASE CLASSES
    // ========================================================

    input.classList.remove(
        'flash-wrong',
        'correct',
        'correct-pop'
    );


    // ========================================================
    // FOCUS
    // ========================================================

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

    state.userInput =
        current.formattedAnswer;

    input.style.textAlign = 'center';
    input.style.paddingLeft = '0px';
    input.style.paddingRight = '0px';

    input.value =
        current.formattedAnswer;

    input.classList.add(
        'correct',
        'correct-pop'
    );

    const wrap = input.closest('.gap-input-wrap');

    if (wrap) {
        wrap.classList.add('correct');

        const overlay =
            wrap.querySelector('.overlay');

        if (overlay) {
            overlay.innerHTML = '';
        }
    }

    input.disabled = true;
    input.blur();

    return;
}


    // ========================================================
    // WRONG FLASH
    // ========================================================

    if (state.status === 'wrongFlash') {

        input.value =
            state.userInput || '';

        input.classList.add(
            'flash-wrong'
        );

        const wrap = input.closest('.gap-input-wrap');
        if (wrap) wrap.classList.add('flash-wrong');

        state.inputLocked =
            true;

        input.onanimationend = (e) => {

            if (e.target !== input) {
                return;
            }

            input.classList.remove(
                'flash-wrong'
            );
            wrap?.classList.remove('flash-wrong');

            state.inputLocked =
                false;

            state.status =
                'wrong';

            state.userInput =
                '';

            input.value =
                '';

            state.isSubmitting =
                false;

            state.answeredWithHint =
                true;

            render();
        };

        return;
    }


    // ========================================================
    // NORMAL INPUT
    // ========================================================

    input.disabled =
        false;

    adjustGapWidth(
        input,
        current
    );

    renderHint(
        input,
        current
    );


    // ========================================================
    // COMPOSITION
    // ========================================================

    input.oncompositionstart = () => {

        if (state.autoSubmitTimer) {

            clearTimeout(
                state.autoSubmitTimer
            );

            state.autoSubmitTimer =
                null;
        }

        state.isComposing =
            true;
    };


    input.oncompositionend = () => {

        state.isComposing =
            false;

        state.userInput =
            input.value;

        adjustGapWidth(
            input,
            current
        );

        renderHint(
            input,
            current
        );

        scheduleAutoSubmit(
            input,
            current
        );
    };


    // ========================================================
    // INPUT
    //
    // BEFORE HINT:
    //   Accept everything.
    //
    // AFTER HINT:
    //   Only accept the next correct character.
    // ========================================================

    input.onbeforeinput = (e) => {

        if (
            state.inputLocked ||
            state.answerComplete ||
            state.isSubmitting
        ) {
            e.preventDefault();
            return;
        }

        if (state.autoSubmitTimer) {

            clearTimeout(
                state.autoSubmitTimer
            );

            state.autoSubmitTimer =
                null;
        }

        if (state.isComposing) {
            return;
        }

        // -----------------------------------------------
        // BEFORE HINT
        // -----------------------------------------------

        if (!state.answeredWithHint) {
            return;
        }

        // -----------------------------------------------
        // HINT PHASE
        // -----------------------------------------------

        if (
            e.inputType === 'insertText' &&
            e.data
        ) {

            const text =
                e.data.toLowerCase();

            // For regular typing we handle one
            // character at a time.
            if (text.length !== 1) {
                return;
            }

            const nextIndex =
                state.userInput.length;

            const expected =
                current.answer[nextIndex]
                    ?.toLowerCase();

            if (text !== expected) {

                e.preventDefault();

                input.classList.remove(
                    'flash-wrong-letter'
                );

                void input.offsetWidth;

                input.classList.add(
                    'flash-wrong-letter'
                );

                return;
            }

            return;
        }


        // -----------------------------------------------
        // BACKSPACE
        // -----------------------------------------------

        if (
            e.inputType ===
            'deleteContentBackward'
        ) {
            return;
        }
    };


    // ========================================================
    // INPUT EVENT
    // ========================================================

    input.oninput = () => {

        if (
            state.inputLocked ||
            state.isSubmitting
        ) {
            return;
        }

        if (state.isComposing) {
            return;
        }

        state.userInput =
            input.value;

        state.lastTypedCorrect =
            true;

        adjustGapWidth(
            input,
            current
        );

        renderHint(
            input,
            current
        );

        scheduleAutoSubmit(
            input,
            current
        );

        setCaret(
            input,
            state.userInput.length
        );
    };


    // ========================================================
    // MOUSE / TOUCH
    // ========================================================

    input.onmousedown = () => {

        setTimeout(() => {

            setCaret(
                input,
                state.userInput.length
            );

        }, 0);
    };

    input.ontouchend = () => {

        setTimeout(() => {

            setCaret(
                input,
                state.userInput.length
            );

        }, 0);
    };


    // ========================================================
    // DISABLE SELECTION BEHAVIOR OUTSIDE INPUT
    // ========================================================

    input.onselectstart = () => {
        return true;
    };


    // ========================================================
    // INITIAL WIDTH + HINT
    // ========================================================

    adjustGapWidth(
        input,
        current
    );

    renderHint(
        input,
        current
    );


    // ========================================================
    // FOCUS
    // ========================================================

    setTimeout(() => {

        if (
            !state.isSubmitting &&
            !state.inputLocked &&
            !input.disabled
        ) {

            input.focus();

            setCaret(
                input,
                state.userInput.length
            );
        }

    }, 0);
}