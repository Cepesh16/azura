import { fetchSentences } from './api.js';
import { state } from './state.js';
import { buildSessionQueue } from './logic.js';
import { render } from './ui.js';
import { initOptions } from './options.js';

const CURRENT_VERSION = document
  .querySelector('meta[name="app-version"]')
  .content;

const savedVersion = localStorage.getItem('appVersion');

if (savedVersion && savedVersion !== CURRENT_VERSION) {
    localStorage.setItem('appVersion', CURRENT_VERSION);
    location.reload();
} else {
    localStorage.setItem('appVersion', CURRENT_VERSION);
}


async function init() {
try {
    console.log('VERSION:', document.querySelector('meta[name="app-version"]').content);

    // 🔹 Load data
    const data = await fetchSentences();
    console.log('AFTER FETCH:', data.length);

    state.allSentences = data;

    state.userInput = '';
    state.status = 'idle';

    localStorage.removeItem('sessionData'); // dev mode

    // 🔹 Build session
    state.sentences = state.allSentences;

    state.sessionQueue = buildSessionQueue();
    console.log('QUEUE:', state.sessionQueue);

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

init();
