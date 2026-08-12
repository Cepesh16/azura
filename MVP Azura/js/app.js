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

        state.allSentences = data;

        state.userInput = '';
        state.status = 'waiting';

state.sessionCount = 0;
state.sessionCorrect = 0;
state.sessionWrong = 0;
state.currentQueueIndex = 0;      

        localStorage.removeItem('sessionData'); // dev mode

        // 🔹 Build session
        state.sentences = state.allSentences;

        state.sessionQueue = buildSessionQueue();
        console.log('QUEUE:', state.sessionQueue);
        if (!state.sessionQueue || state.sessionQueue.length === 0) {
            console.error('❌ EMPTY QUEUE');
            return;
        }

        state.currentQueueIndex = 0;

        if (state.sessionQueue.length > 0) {
            state.currentIndex = state.sessionQueue[0];
        }

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