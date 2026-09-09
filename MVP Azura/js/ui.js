import { state, clearAutoSubmit } from './state.js';
import { submitAnswer, startNewSession } from './logic.js';

let hasUserFocused = false;


// ui.js — add at module scope (near top, after imports)
export const els = {}; // will hold cached element references

export function initEls() {
  // Cache once at app startup — these are the top-level, mostly-static elements
  els.sessionStateEl   = document.getElementById('session-state');
  els.sentenceAreaEl   = document.getElementById('sentence-area');
  els.sentenceEl       = document.getElementById('sentence');

  els.translationEl    = document.getElementById('translation');
  els.explanationEl    = document.getElementById('explanation');
  els.toggleBtn        = document.getElementById('explanation-toggle');

  els.posEl            = document.getElementById('part-of-speech') || null;
  els.levelEl          = document.getElementById('level-indicator');
  els.progressBarEl    = document.getElementById('progress-bar');
  els.totalCompletedEl = document.getElementById('total-completed-counter');
  els.progressCounter  = document.getElementById('progress-counter');
  els.helperEl         = document.getElementById('helper');
}



// helper to normalize for comparisons in UI-level autosubmit
function cleanCompareStr(s) {
  return (s || '')
    .replace(/\u00A0/g, ' ')       // NBSP -> space
    .replace(/\s+/g, ' ')          // collapse repeated whitespace
    .trim()
    .toLowerCase();
}



// ============================================================
// MEASURE TEXT
// ============================================================

// put this at top-level of ui.js (module scope)
const __measurer = (() => {
  const el = document.createElement('span');
  el.style.position = 'absolute';
  el.style.visibility = 'hidden';
  el.style.whiteSpace = 'pre';
  document.body.appendChild(el);
  return el;
})();

function measureText(input, text) {
  if (!text) return 0;
  const cs = window.getComputedStyle(input);
  const meas = __measurer;
  meas.style.fontFamily = cs.fontFamily;
  meas.style.fontSize   = cs.fontSize;
  meas.style.fontWeight = cs.fontWeight;
  meas.style.letterSpacing = cs.letterSpacing;
  meas.style.lineHeight = cs.lineHeight;
  meas.textContent = text;
  return meas.getBoundingClientRect().width;
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
  if (!input || !current) return;
  const answer = (current.formattedAnswer || current.answer || '').trim();
  if (!answer) return;
  const answerWidth = measureText(input, answer);
  const typedRaw = state.userInput || '';
  const typed = current.isFirstWord && typedRaw.length > 0
    ? typedRaw.charAt(0).toUpperCase() + typedRaw.slice(1)
    : typedRaw;
  const typedWidth = measureText(input, typed);
  const WIDTH_BUFFER = 10;
  const finalWidth = Math.max(answerWidth, typedWidth) + WIDTH_BUFFER;
  // only apply changes if different to avoid layout thrash
  if (parseFloat(input.style.width) !== finalWidth) {
    input.style.width = finalWidth + 'px';
  }
  const minW = answerWidth + WIDTH_BUFFER;
  if (parseFloat(input.style.minWidth) !== minW) {
    input.style.minWidth = minW + 'px';
  }
}


function setGapState(input, stateName) {
    const wrap = input.closest('.gap-input-wrap');
    if (!wrap) return;

    wrap.classList.remove(
        'correct',
        'flash-wrong'
    );

    if (stateName) {
        wrap.classList.add(stateName);
    }
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

clearAutoSubmit();

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

    const value = cleanCompareStr(state.userInput);
    const answer = cleanCompareStr(current.answer);

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

            const latestValue = cleanCompareStr(state.userInput);
            const latestAnswer = cleanCompareStr(current.answer);

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

const sessionStateEl = els.sessionStateEl || document.getElementById('session-state');
const sentenceAreaEl  = els.sentenceAreaEl  || document.getElementById('sentence-area');

    if (
        !sentenceAreaEl ||
        !sessionStateEl
    ) {
        return;
    }

const sentenceEl      = els.sentenceEl      || document.getElementById('sentence');

const translationEl   = els.translationEl   || document.getElementById('translation');
const explanationEl   = els.explanationEl   || document.getElementById('explanation');
const toggleBtn       = els.toggleBtn       || document.getElementById('explanation-toggle');

const posEl           = els.posEl           || document.getElementById('part-of-speech');
const levelEl         = els.levelEl         || document.getElementById('level-indicator');

const progressBar     = els.progressBarEl   || document.getElementById('progress-bar');
const totalCompletedEl= els.totalCompletedEl|| document.getElementById('total-completed-counter');
const progressCounter = els.progressCounter || document.getElementById('progress-counter');
const helperEl        = els.helperEl        || document.getElementById('helper');


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

            btn.onclick = () => {

                // remove focus BEFORE UI changes
                if (document.activeElement === btn) {
                    btn.blur();
                }

                startNewSession();
            };
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
    current.translation || '';

if (explanationEl && toggleBtn) {

    const toggleExplanation = () => {
        const isOpen =
            explanationEl.classList.contains('show');

        if (isOpen) {
            explanationEl.classList.remove('show');
            toggleBtn.innerText = '+';
        } else {
            explanationEl.classList.add('show');
            toggleBtn.innerText = '−';
        }
    };

    // reset text every render
    explanationEl.innerText = current.explanation || '';
    explanationEl.classList.remove('show');
    toggleBtn.innerText = '+';

    // CLICK on +
    toggleBtn.onclick = toggleExplanation;

    // CLICK on translation text ALSO triggers it
    if (translationEl) {
        translationEl.style.cursor = 'pointer';
        translationEl.onclick = toggleExplanation;
    }
}

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

     // enforce max length equal to exact answer length (prevents extra letters)
    try {
      // some answers may contain spaces; use .length on the raw answer string
      input.maxLength = Number(current.answer.length) || 100; // fallback safe cap
    } catch (err) {
      // ignore if anything goes wrong (defensive)
      input.removeAttribute('maxlength');
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
        // Block Space key if current answer is single-word
        if (e.key === ' ' || e.code === 'Space') {
          const answerHasSpace = (current.answer || '').includes(' ');
          if (!answerHasSpace) {
            e.preventDefault();
            return;
          }
        }

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

    // Input controls text/caret appearance.
    input.classList.add(
        'correct',
        'correct-pop'
    );

    // Wrapper controls the underline.
    setGapState(
        input,
        'correct'
    );

    input.disabled = true;

    const wrap =
        input.closest('.gap-input-wrap');

    if (wrap) {

        const overlay =
            wrap.querySelector('.overlay');

        if (overlay) {
            overlay.innerHTML = '';
        }
    }

    input.blur();

    return;
}


    // ========================================================
    // WRONG FLASH
    // ========================================================

if (state.status === 'wrongFlash') {

    input.value =
        state.userInput || '';

    // The wrapper controls the underline color.
    setGapState(input, 'flash-wrong');

    // The input controls the shake animation.
    input.classList.add('flash-wrong');

    state.inputLocked =
        true;

        input.onanimationend = (e) => {

            if (e.target !== input) {
                return;
            }

            setGapState(input, null);

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

clearAutoSubmit();

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

    clearAutoSubmit();

    if (state.isComposing) {
        return;
    }

    // Prevent inserting a SPACE when the expected answer is single-word
    // (allow space if the correct answer contains spaces).
    if (e.inputType === 'insertText' && e.data) {
        const isWhitespaceChar = e.data === ' ' || e.data === '\u00A0' || /^\s$/.test(e.data);
        if (isWhitespaceChar) {
            const answerHasSpace = (current.answer || '').includes(' ');
            if (!answerHasSpace) {
                e.preventDefault();
                return;
            }
        }
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

        const incoming = e.data; // could be 1 char (typing) or many chars (swipe)

        // ---------- single character (existing behavior) ----------
        if (incoming.length === 1) {

            const text = incoming.toLowerCase();

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

            // allow single correct char to go through
            return;
        }

        // ---------- multi-character (swipe) ----------
        // We will prevent the default insertion and either accept whole
        // incoming (if it exactly matches the expected prefix) or treat
        // it as a wrong answer (option B).
        e.preventDefault();

        const expectedRemaining =
            (current.answer || '').slice(state.userInput.length);

        const incomingLower = incoming.toLowerCase();
        const expectedSlice = expectedRemaining.slice(0, incoming.length).toLowerCase();

        // If the swipe exactly matches the expected prefix -> accept it fully.
        if (incomingLower === expectedSlice) {

            state.userInput = (state.userInput || '') + incoming;
            input.value = state.userInput;

            adjustGapWidth(input, current);
            renderHint(input, current);
            scheduleAutoSubmit(input, current);
            setCaret(input, state.userInput.length);

            return;
        }

        // Otherwise: treat as WRONG, but DON'T show the swiped word
        state.userInput = '';
        input.value = '';

        // Optional: small visual feedback before submit
        input.classList.remove('flash-wrong-letter');
        void input.offsetWidth;
        input.classList.add('flash-wrong-letter');

        submitAnswer();

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

        // ---------- IMMEDIATE ACCEPT WHEN MATCH ----------
        // If user's typed text already equals the answer (after cleaning),
        // submit immediately instead of waiting for the auto-timer.
        try {
            const typedClean = cleanCompareStr(state.userInput);
            const answerClean = cleanCompareStr(current.answer);

            if (
                typedClean &&
                answerClean &&
                typedClean === answerClean &&
                !state.isComposing &&     // don't submit during IME composition
                !state.inputLocked &&
                !state.isSubmitting
            ) {
                // prevent any pending auto timer and submit right now
                clearAutoSubmit();
                submitAnswer();
                return; // avoid further UI updates in this input handler
            }
        } catch (err) {
            // defensive: if something goes wrong, ignore and continue
            console.error('Immediate accept check error:', err);
        }
        // -------------------------------------------------

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