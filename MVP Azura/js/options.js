export function initOptions() {
    const btn = document.getElementById('options-btn');
    const modal = document.getElementById('options-modal');
    const save = document.getElementById('save-options');

    if (!btn || !modal) return;

    // 🔥 OPEN
    btn.onclick = () => {
        modal.style.display = 'flex';
    };

    // 🔥 CLOSE on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };

    // 🔥 SAVE (just close for now)
    if (save) {
        save.onclick = () => {
            modal.style.display = 'none';
        };
    }
}