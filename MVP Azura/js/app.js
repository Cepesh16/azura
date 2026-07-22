import { fetchSentences } from './api.js';
import { state } from './state.js';
import { render } from './ui.js';

async function init() {
    try {
        const data = await fetchSentences();

        console.log('Loaded sentences:', data);

        state.sentences = data;
        state.currentIndex = 0;
        state.userInput = '';
        state.status = 'waiting';

        render();

    } catch (err) {
        console.error('Error loading data:', err);
    }
}

init();