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


function getIncomingText(e) {
    if (typeof e.data === 'string') {
        return e.data;
    }

    if (e.inputType === 'insertFromPaste' && e.clipboardData) {
        return e.clipboardData.getData('text') || '';
    }

    if (e.inputType === 'insertFromDrop' && e.dataTransfer) {
        return e.dataTransfer.getData('text') || '';
    }

    return '';
}


function getProposedValue(input, e) {
    const incoming = getIncomingText(e);

    const start =
        typeof input.selectionStart === 'number'
            ? input.selectionStart
            : input.value.length;

    const end =
        typeof input.selectionEnd === 'number'
            ? input.selectionEnd
            : start;

    return (
        input.value.slice(0, start) +
        incoming +
        input.value.slice(end)
    );
}


function normalizeAnswer(value) {
    return String(value || '')
        .replace(/\u00A0/g, ' ')
        .toLowerCase();
}


function isAllowedValue(value, current) {
    const answer = normalizeAnswer(
        current.formattedAnswer || current.answer || ''
    );

    const typed = normalizeAnswer(value);

    // Never allow more characters than the answer.
    if (typed.length > answer.length) {
        return false;
    }

    // Normal mode:
    // any text is allowed as long as it isn't too long.
    if (!state.answeredWithHint) {
        return true;
    }

    // Hint mode:
    // only a prefix of the correct answer is allowed.
    return answer.startsWith(typed);
}


function flashWrongLetter(input) {
    input.classList.remove('flash-wrong-letter');

    // Restart animation cleanly.
    void input.offsetWidth;

    input.classList.add('flash-wrong-letter');
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

// REPLACE the old adjustGapWidth(...) with this version
function adjustGapWidth(input, current) {
  if (!input || !current) return;
  const answer = (current.formattedAnswer || current.answer || '').trim();
  if (!answer) return;

  // We want the visible gap to match the answer width — do NOT grow with typed text.
  const answerWidth = measureText(input, answer);
  const WIDTH_BUFFER = 10;
  const finalWidth = answerWidth + WIDTH_BUFFER;

  // only apply changes if different to avoid layout thrash
  if (parseFloat(input.style.width) !== finalWidth) {
    input.style.width = finalWidth + 'px';
  }
  const minW = answerWidth + WIDTH_BUFFER;
  if (parseFloat(input.style.minWidth) !== minW) {
    input.style.minWidth = minW + 'px';
  }
}


// Call: attachGapInputHandlers(inputEl, current)
// Purpose: block wrong letters when hint-mode is ON and flash animation instead.
// Allows deletions/backspace always, allows any typing when not in hint-mode,
// updates state.userInput and calls renderHint / scheduleAutoSubmit.
// --- REPLACE or ADD this function in js/ui.js ---
function attachGapInputHandlers(input, current) {
  if (!input || !current) return;

  // idempotency: don't attach twice to same DOM element
  if (input.dataset.handlersAttached === '1') {
    // update maxLength if current changed
    input.maxLength = (current.answer || '').length || 0;
    return;
  }

  input.dataset.handlersAttached = '1';

  // Ensure the visible gap doesn't grow — maxLength enforces typed chars limit too.
  const answer = (current.formattedAnswer || current.answer || '');
  if (answer) {
    input.maxLength = answer.length;
  } else {
    input.removeAttribute('maxLength');
  }

  // small helper to flash wrong-letter animation (uses your CSS .flash-wrong-letter)
  function flashWrongLetter() {
    const wrap = input.closest('.gap-input-wrap');
    if (!wrap) return;
    wrap.classList.add('flash-wrong-letter');
    // match the CSS animation duration (adjust 300 -> your CSS length if different)
    setTimeout(() => wrap.classList.remove('flash-wrong-letter'), 300);
  }

  // Normalize helper: returns the lowercased, trimmed string used for comparisons.
  function norm(s) {
    return (s || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // BEFOREINPUT: best place to block incorrect insertions (covers typing + paste + drop)
  input.addEventListener('beforeinput', (ev) => {
    // Allow composition/IME — don't interfere while composing.
    if (state.isComposing) return;

    // Allow deletions (backspace/delete/undo)
    if (ev.inputType && ev.inputType.startsWith('delete')) return;

    const answerNow = ( (state.current && (state.current.formattedAnswer || state.current.answer)) || answer || '' );
    const answerNorm = norm(answerNow);

    // If no answer, don't block anything.
    if (!answerNow) return;

    // Compute what the resulting value would be if we allow this input.
    // Handle selection replacement correctly.
    const selStart = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
    const selEnd   = typeof input.selectionEnd   === 'number' ? input.selectionEnd   : selStart;
    const insert = ev.data === null ? '' : ev.data; // data may be null for some inputTypes
    const proposed = input.value.slice(0, selStart) + insert + input.value.slice(selEnd);

    const proposedNorm = norm(proposed);

    // 1) Enforce length: proposed must not exceed answer length.
    if (proposedNorm.length > answerNorm.length) {
      ev.preventDefault();
      flashWrongLetter();
      return;
    }

    // 2) If hint-mode active, allow only prefix matches of the answer.
    if (state.answeredWithHint) {
      // allow the proposed value only if answer starts with proposed value
      if (!answerNorm.startsWith(proposedNorm)) {
        ev.preventDefault();
        flashWrongLetter();
      }
      // else allow
      return;
    }

    // 3) Normal mode (hint not shown): allow anything up to length limit
    // But also enforce length already done above. So just allow.
  }, { passive: false });

  // INPUT event: update state and UI overlays
  input.addEventListener('input', () => {
    // Keep state.userInput up to date (actual DOM value)
    state.userInput = input.value || '';

    // adjust width (we keep visible width pinned to answer size in adjustGapWidth)
    adjustGapWidth(input, state.current || current);

    // re-render hint (no-op if not in hint-mode)
    renderHint(input, state.current || current);

    // schedule autosubmit (your existing logic compares normalized values)
    scheduleAutoSubmit(input, state.current || current);
  });

  // KEYDOWN fallback for older browsers where beforeinput is unreliable.
  input.addEventListener('keydown', (ev) => {
    if (state.isComposing) return;

    // Only consider single-character printable keys
    if (ev.key && ev.key.length === 1) {
      const answerNow = ( (state.current && (state.current.formattedAnswer || state.current.answer)) || answer || '' );
      const answerNorm = norm(answerNow);
      if (!answerNow) return;

      // get caret + selected range
      const selStart = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
      const selEnd   = typeof input.selectionEnd   === 'number' ? input.selectionEnd   : selStart;

      // proposed after this key
      const proposed = input.value.slice(0, selStart) + ev.key + input.value.slice(selEnd);
      const proposedNorm = norm(proposed);

      // enforce length
      if (proposedNorm.length > answerNorm.length) {
        ev.preventDefault();
        flashWrongLetter();
        return;
      }

      // if hint-mode active, require prefix match
      if (state.answeredWithHint && !answerNorm.startsWith(proposedNorm)) {
        ev.preventDefault();
        flashWrongLetter();
        return;
      }
    }
  });

  // Focus behavior: keep caret at end when focusing to avoid shifting keyboard hiccups
  input.addEventListener('focus', () => {
    try {
      // place caret at end (safe)
      const len = input.value.length;
      input.setSelectionRange(len, len);
    } catch (err) { /* ignore selection errors */ }
  });

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
                    type="search"
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

    // --- in render() where you build the sentence ---
    const existingInput = document.getElementById('gap-input');

    const canReuseInput =
      existingInput &&
      existingInput.dataset.wordId === String(current.id);

    if (!canReuseInput) {

      // create fresh HTML (old input will be removed from DOM so its listeners are cleaned up)
      sentenceEl.innerHTML = createGapSentence(current);

        // --- after sentenceEl.innerHTML = createGapSentence(current)
const gapInput = document.getElementById('gap-input');

if (gapInput) {
    const answer = (current.formattedAnswer || current.answer || '') || '';

    gapInput.maxLength = answer.length;

    adjustGapWidth(gapInput, current);

    renderHint(gapInput, current);

    state.userInput = gapInput.value || '';
}

    } else { // canReuseInput === true
      // existingInput is still in the DOM for the same current.id — update layout & hint
      const answer = (current.formattedAnswer || current.answer || '') || '';
      existingInput.maxLength = answer.length || 0;
      adjustGapWidth(existingInput, current);
      renderHint(existingInput, current);
      state.userInput = existingInput.value || '';
      // no attach/reattach here because listeners should already be present
    }

// keep translation updated (this is fine where you had it)
translationEl.innerText = current.translation || '';

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

    // ========================================================
    // ENTER
    // ========================================================

    if (e.key === 'Enter') {

        e.preventDefault();
        e.stopPropagation();

        if (state.isSubmitting) {
            return;
        }

        submitAnswer();
        return;
    }

    // ========================================================
    // SPACE
    // ========================================================

    if (
        e.key === ' ' ||
        e.code === 'Space'
    ) {

        const answerHasSpace =
            (current.answer || '').includes(' ');

        if (!answerHasSpace) {
            e.preventDefault();
            return;
        }
    }

    // ========================================================
    // NORMAL/HINT LENGTH SAFETY
    //
    // Usually beforeinput handles this.
    // This protects browsers/keyboards where it doesn't.
    // ========================================================

    if (
        e.key &&
        e.key.length === 1
    ) {

        const start =
            typeof input.selectionStart === 'number'
                ? input.selectionStart
                : input.value.length;

        const end =
            typeof input.selectionEnd === 'number'
                ? input.selectionEnd
                : start;

        const proposed =
            input.value.slice(0, start) +
            e.key +
            input.value.slice(end);

        if (
            !isAllowedValue(
                proposed,
                current
            )
        ) {

            e.preventDefault();

            // Only hint mode flashes.
            if (state.answeredWithHint) {
                flashWrongLetter(input);
            }

            return;
        }
    }
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

    // Recalculate width AFTER putting the complete
    // formatted answer into the input.
    adjustGapWidth(
        input,
        current
    );

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

    setGapState(input, 'flash-wrong');

    input.classList.add('flash-wrong');

    state.inputLocked =
        true;

    input.onanimationend = (e) => {

        if (e.target !== input) {
            return;
        }

        // IMPORTANT:
        // Only the main wrong-answer shake should finish
        // the wrongFlash state.
        if (e.animationName !== 'wrongShake') {
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

    // Let IME composition work normally.
    if (
        state.isComposing ||
        e.inputType === 'insertCompositionText'
    ) {
        return;
    }

    // Deletions are always allowed.
    if (
        e.inputType &&
        e.inputType.startsWith('delete')
    ) {
        return;
    }

    const incoming = getIncomingText(e);

    // Nothing we can validate.
    if (!incoming) {
        return;
    }

    const proposedValue =
        getProposedValue(input, e);

    const answer =
        current.formattedAnswer ||
        current.answer ||
        '';

    const proposedLength =
        proposedValue.length;

    // ========================================================
    // NORMAL MODE
    // ========================================================
    //
    // Only length matters.
    // Wrong letters themselves are allowed.
    // Too-long input is silently blocked.
    //
    if (!state.answeredWithHint) {

        if (proposedLength > answer.length) {
            e.preventDefault();
            return;
        }

        return;
    }

    // ========================================================
    // HINT MODE
    // ========================================================
    //
    // Only a prefix of the correct answer is allowed.
    //
    const allowed =
        isAllowedValue(
            proposedValue,
            current
        );

    if (!allowed) {

        e.preventDefault();

        // Wrong input in hint mode:
        // block it completely and show flash.
        flashWrongLetter(input);

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

    const actualValue =
        input.value || '';

    // ========================================================
    // SAFETY CHECK
    //
    // beforeinput should normally prevent invalid input.
    // This is a second line of defense for mobile keyboards
    // that sometimes bypass beforeinput.
    // ========================================================

    if (!isAllowedValue(actualValue, current)) {

        // NORMAL MODE:
        // silently restore the previous valid value.
        if (!state.answeredWithHint) {

            input.value =
                state.userInput || '';

        } else {

            // HINT MODE:
            // restore previous value + flash.
            input.value =
                state.userInput || '';

            flashWrongLetter(input);
        }

        setCaret(
            input,
            input.value.length
        );

        return;
    }

    // ========================================================
    // ACCEPT VALID INPUT
    // ========================================================

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

    // ========================================================
    // IMMEDIATE ACCEPT
    // ========================================================

    const typedClean =
        cleanCompareStr(state.userInput);

    const answerClean =
        cleanCompareStr(current.answer);

    if (
        typedClean &&
        answerClean &&
        typedClean === answerClean &&
        typedClean.length === answerClean.length &&
        !state.isComposing &&
        !state.inputLocked &&
        !state.isSubmitting
    ) {

        clearAutoSubmit();

        submitAnswer();

        return;
    }

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

//6. One important thing: remove the keyboard hide/show code
    
    // setTimeout(() => {

    //     if (
    //         !state.isSubmitting &&
    //         !state.inputLocked &&
    //         !input.disabled
    //     ) {

    //         input.focus();

    //         setCaret(
    //             input,
    //             state.userInput.length
    //         );
    //     }

    // }, 0);
}