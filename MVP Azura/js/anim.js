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
    console.log(
        'FADE IN:',
        el.id,
        'classes:',
        el.className,
        'opacity:',
        getComputedStyle(el).opacity
    );
    if (!el) return;

    // 👇 restore layout FIRST
    el.style.display = '';

    el.classList.add('fade-hidden');
    el.classList.remove('fade-visible');

    el.getBoundingClientRect();

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

    if (el.classList.contains('fade-hidden')) {
        el.style.display = 'none';
        return;
    }

    el.classList.add('fade-hidden');
    el.classList.remove('fade-visible');

    await waitTransition(el);

    el.style.display = 'none';
}