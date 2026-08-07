import { state } from './state.js';

export function initOptions() {
    const btn = document.getElementById('options-btn');
    const modal = document.getElementById('options-modal');
    const save = document.getElementById('save-options');
    const toggle = document.getElementById('sound-toggle');

// =========================
// 🔊 SOUND TOGGLE
// =========================
    if (toggle) {
        const saved = localStorage.getItem('soundEnabled');

        if (saved !== null) {
            state.soundEnabled = saved === 'true';
        }

        toggle.checked = state.soundEnabled;

        toggle.addEventListener('change', () => {
            state.soundEnabled = toggle.checked;
            localStorage.setItem('soundEnabled', state.soundEnabled);
        });
    }

// =========================
// 🧩 MODAL LOGIC
// =========================
    if (!btn || !modal) return;

// open
    btn.onclick = () => {
        modal.style.display = 'flex';
    };

// close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };

// save (just close for now)
    if (save) {
        save.onclick = () => {
            modal.style.display = 'none';
        };
    }

}
