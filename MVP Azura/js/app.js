import { fetchSentences } from './api.js';
import { state } from './state.js';
import { buildSessionQueue } from './logic.js';
import { render } from './ui.js';
import { initOptions } from './options.js';

const version = '1.3';
console.log('VERSION:', version);

async function startApp() {
    try {

        // 🔥 VERSION CHECK (after modules loaded)
        const savedVersion = localStorage.getItem('appVersion');

        if (savedVersion && savedVersion !== version) {
            localStorage.setItem('appVersion', version);
            location.reload();
            return;
        } else {
            localStorage.setItem('appVersion', version);
        }

        // 🔹 Load data
        const data = await fetchSentences();
        if (!data) return; // stop app init completely
        
        console.log('AFTER FETCH:', data.length);

        // SINGLE SOURCE OF TRUTH
        state.sentences = data;

        state.userInput = '';
        state.status = 'waiting';

        state.sessionCount = 0;
        state.sessionCorrect = 0;
        state.sessionWrong = 0;
        state.queueIndex = 0;     
        state.completedCount = 0;

        localStorage.removeItem('sessionData'); // dev mode

        // 🔹 Build session
        state.queue = buildSessionQueue();

        console.log('QUEUE:', state.queue);

        if (!state.queue || state.queue.length === 0) {
            console.error('❌ EMPTY QUEUE');
            return;
        }

        state.queueIndex = 0;

        // set first word
        state.current = state.queue[0] || null;

        // 🔹 Show UI
        const app = document.getElementById('app');

        document.getElementById('loading').style.display = 'none';
        app.style.display = 'block';

        setTimeout(() => {
            app.classList.add('visible');
            render();
            initOptions();
        }, 10);

    } catch (err) {
        console.error('Error loading data:', err);
    }
}

startApp();