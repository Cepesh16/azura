function waitForTransition(el, timeoutMs = 350) {
    return new Promise((resolve) => {

        if (!el) {
            resolve();
            return;
        }

        let done = false;

        const finish = () => {

            if (done) return;

            done = true;

            el.removeEventListener(
                'transitionend',
                onEnd
            );

            clearTimeout(timer);

            resolve();
        };

        const onEnd = (e) => {

            if (e.target !== el) {
                return;
            }

            if (
                e.propertyName &&
                e.propertyName !== 'opacity'
            ) {
                return;
            }

            finish();
        };

        el.addEventListener(
            'transitionend',
            onEnd
        );

        const timer =
            setTimeout(
                finish,
                timeoutMs + 80
            );
    });
}


// ============================================================
// FADE OUT
//
// Element becomes invisible BUT keeps its layout space.
// Used for:
//   - translation-row
//   - progress-row
//   - normal sentence transitions
// ============================================================

export async function fadeOut(
    el,
    timeoutMs = 350
) {

    if (!el) {
        return;
    }

    el.classList.remove(
        'fade-visible'
    );

    void el.offsetWidth;

    el.classList.add(
        'fade-hidden'
    );

    el.setAttribute(
        'aria-hidden',
        'true'
    );

    await waitForTransition(
        el,
        timeoutMs
    );
}


// ============================================================
// FADE IN
//
// Restores a visible element.
// If the element was hidden with fadeOutAndHide(),
// its original display value is restored.
// ============================================================

export async function fadeIn(
    el,
    timeoutMs = 350
) {

    if (!el) {
        return;
    }

    // Restore layout if fadeOutAndHide() was used.
    if (
        el.dataset.fadeDisplay !== undefined
    ) {

        el.style.display =
            el.dataset.fadeDisplay;

        delete el.dataset.fadeDisplay;
    }

    el.removeAttribute(
        'aria-hidden'
    );

    el.classList.remove(
        'fade-visible'
    );

    el.classList.add(
        'fade-hidden'
    );

    // Force browser to register the hidden state.
    void el.offsetWidth;

    el.classList.remove(
        'fade-hidden'
    );

    el.classList.add(
        'fade-visible'
    );

    await waitForTransition(
        el,
        timeoutMs
    );
}


// ============================================================
// FADE OUT + REMOVE FROM LAYOUT
//
// Element fades out and THEN stops occupying space.
//
// Used only for:
//   - sentence-area when session ends
//   - session-state when starting a new session
// ============================================================

export async function fadeOutAndHide(
    el,
    timeoutMs = 350
) {

    if (!el) {
        return;
    }

    // Remember the element's normal display mode.
    if (
        el.dataset.fadeDisplay === undefined
    ) {

        el.dataset.fadeDisplay =
            getComputedStyle(el).display;
    }

    el.classList.remove(
        'fade-visible'
    );

    void el.offsetWidth;

    el.classList.add(
        'fade-hidden'
    );

    el.setAttribute(
        'aria-hidden',
        'true'
    );

    await waitForTransition(
        el,
        timeoutMs
    );

    // Remove from layout only AFTER the fade finishes.
    el.style.display =
        'none';
}