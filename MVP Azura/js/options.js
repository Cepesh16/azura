import { state } from './state.js';

export function initOptions() {
    const btn = document.getElementById('options-btn');
    const modal = document.getElementById('options-modal');
    const save = document.getElementById('save-options');
    const toggle = document.getElementById('sound-toggle');

    // =========================
    // 🔊 SOUND TOGGLE (existing)
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
    // 🌗 THEME TOGGLE (new)
    // =========================
    const themeToggle = document.getElementById('theme-toggle');

    // Apply saved theme on load
    const savedTheme = localStorage.getItem('theme'); // 'dark' or 'light' or null
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.checked = true;
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeToggle) themeToggle.checked = false;
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            if (themeToggle.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // =========================
    // 🧩 MODAL LOGIC (existing)
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