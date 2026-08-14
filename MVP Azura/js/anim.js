// =========================
// 🎬 ANIMATION HELPERS
// =========================

// 🔹 wait for transition end (safe)
export function onFadeEnd(el, callback) {
    const handler = (e) => {
        if (e.target !== el) return;
        el.removeEventListener('transitionend', handler);
        callback();
    };
    el.addEventListener('transitionend', handler);
}

// =========================
// 🟢 FADE IN
// =========================
export function fadeIn(el) {
    if (!el) return;

    // bring into layout
    el.classList.remove('fade-gone');

    // set start state
    el.classList.add('fade-hidden');
    el.classList.remove('fade-visible');

    // force layout
    el.getBoundingClientRect();

    // animate
    requestAnimationFrame(() => {
        el.classList.remove('fade-hidden');
        el.classList.add('fade-visible');
    });
}

// =========================
// 🔴 FADE OUT
// =========================
export function fadeOut(el, { remove = true } = {}) {
    if (!el) return;

    el.classList.add('fade-hidden');
    el.classList.remove('fade-visible');

    if (remove) {
        onFadeEnd(el, () => {
            el.classList.add('fade-gone');
        });
    }
}

// =========================
// 🔁 SWAP (OUT → IN)
// =========================
export function swapFade(outEl, inEl) {
    if (!outEl || !inEl) return;

    // fade OUT first
    outEl.classList.add('fade-hidden');
    outEl.classList.remove('fade-visible');

    onFadeEnd(outEl, () => {
        outEl.classList.add('fade-gone');

        // then fade IN
        fadeIn(inEl);
    });
}