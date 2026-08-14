// =========================
// 🎬 ANIMATION HELPERS
// =========================
function waitTransition(el) {
    return new Promise((resolve) => {
        if (!el) return resolve();

        const handler = (e) => {
            if (e.target !== el) return;
            if (e.propertyName !== 'opacity') return;

            el.removeEventListener('transitionend', handler);
            resolve();
        };

        el.addEventListener('transitionend', handler);
    });
}


// =========================
// 🟢 FADE IN
// =========================
export async function fadeIn(el) {
    if (!el) return;

    // 🔴 ALWAYS clean state first
    el.classList.remove('fade-gone');
    el.classList.remove('fade-visible');
    el.classList.add('fade-hidden');

    // 🔥 force layout
    el.getBoundingClientRect();

    // 🟢 animate IN
    requestAnimationFrame(() => {
        el.classList.remove('fade-hidden');
        el.classList.add('fade-visible');
    });

    await waitTransition(el);
}

// =========================
// 🔴 FADE OUT
// =========================
export async function fadeOut(el) {
    if (!el) return;

    el.classList.remove('fade-gone');

    el.getBoundingClientRect();

    el.classList.add('fade-hidden');
    el.classList.remove('fade-visible');

    await waitTransition(el);

    el.classList.add('fade-gone');
}
