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

    const { sentence, answer, gapIndex } = sentenceObj;

    if (gapIndex === -1) {
        console.warn('⚠️ gapIndex not found:', sentenceObj);
        return sentence;
    }

    const before = sentence.slice(0, gapIndex);
    const after = sentence.slice(gapIndex + sentenceObj.answerLength);

    return `${before}<div class="gap-wrapper"><span id="gap-input" contenteditable="true" data-placeholder="..." class="gap"></span></div>${after}`;
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

    setTimeout(() => input.focus(), 0);
    input.onfocus = () => {
        hasUserFocused = true;
    };

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
            if (
                state.userInput.length === current.answer.length &&
                state.userInput.toLowerCase() === current.answer.toLowerCase()
            ) {
                setTimeout(() => {
                    submitAnswer();
                }, 0);
            }

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

        // 🔥 render typed text (same as hint mode but without hint)
        renderOverlay(input, {
            hintHTML: `<span style="visibility:hidden">${state.userInput}</span>`,
            typed: state.userInput,
            typedClass: 'wrong'
        });

// <-- REPLACEMENT: keep keyboard visible, but lock input handling briefly
input.classList.add('flash-wrong');

// temporarily prevent processing new input in onbeforeinput/oninput handler
state.inputLocked = true;

// Wait for the animation to finish (match CSS duration ~0.25s) then switch to 'wrong'
// we avoid blur() / contentEditable=false so mobile keyboard stays visible.
const onAnimEnd = (e) => {
  input.removeEventListener('animationend', onAnimEnd);

  // clear lock and reset
  state.inputLocked = false;
  state.status = 'wrong';
  state.userInput = '';
  state.isSubmitting = false;

  // ensure caret is visible and at start
  input.focus();
  setCaret(input, 0);

  render();
};

input.addEventListener('animationend', onAnimEnd);

// return immediately (render will update after animationend handler runs)
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

// --- IME / composition handling (place immediately after input.ontouchend = forceFocusAndCaret;)
input.isComposing = false; // per-input flag (helpful for debugging)

input.addEventListener('compositionstart', () => {
  // user started composing (IME on Android, iOS, some desktop IMEs)
  state.isComposing = true;
  input.isComposing = true;
});

input.addEventListener('compositionend', (ev) => {
  // composition finished — final text is in ev.data
  state.isComposing = false;
  input.isComposing = false;

  // Optionally feed composed text into your existing logic.
  // We will simply append composed characters to state.userInput
  // and update the hint UI. This keeps behavior consistent with onbeforeinput flow.
  const composed = (ev.data || '').toLowerCase();
  if (composed) {
    // append only matching letters using the same strict logic as onbeforeinput
    const current = state.current;
    for (let i = 0; i < composed.length; i++) {
      const nextIndex = state.userInput.length;
      const expected = current.answer[nextIndex];
      if (composed[i] === expected?.toLowerCase()) {
        state.userInput += composed[i];
      } else {
        break; // stop on first mismatch
      }
    }
    // update UI & caret
    updateHintUI(input, state.current);
    setCaret(input, state.userInput.length);
    // If autosubmit conditions met, submit (keeps same autosubmit behavior)
    if (
      state.userInput.length === current.answer.length &&
      state.userInput.toLowerCase() === current.answer.toLowerCase()
    ) {
      setTimeout(() => submitAnswer(), 0);
    }
  }
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
            if (
                state.userInput.length === current.answer.length &&
                state.userInput.toLowerCase() === current.answer.toLowerCase()
            ) {
                setTimeout(() => {
                    submitAnswer();
                }, 0);
            }

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