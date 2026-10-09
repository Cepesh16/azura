import { fetchSentences } from './api.js';
import { state } from './state.js';
import { buildSessionQueue } from './logic.js';
import { render, initEls } from './ui.js';
import { initOptions } from './options.js';

const version = '1.0';
console.log('VERSION:', version);


let screenHistory = [];

function showScreen(screenId) {
const currentScreen = document.querySelector('.screen.active');


if (currentScreen && currentScreen.id !== screenId) {
    screenHistory.push(currentScreen.id);
}

document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
});

document.getElementById(screenId).classList.add('active');

// Create a browser history entry for Android/browser Back
history.pushState({ appScreen: screenId }, '');


}

document.getElementById('profile-start').addEventListener('click', () => {
showScreen('trainer-screen');
});

// Return to the previous screen
function goBack() {
const previousScreen = screenHistory.pop();


if (!previousScreen) return;

document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
});

document.getElementById(previousScreen).classList.add('active');


}

// Your on-screen Back button
document.getElementById('trainer-back').addEventListener('click', () => {
goBack();
});

// Handle Android/browser Back button
history.replaceState({ appScreen: 'profile-screen' }, '');
history.pushState({ appScreen: 'profile-screen' }, '');

window.addEventListener('popstate', () => {
goBack();


// Keep a history entry so Back can be handled again
history.pushState({ appScreen: 'current' }, '');


});




// update every icon version in sprite
function updateSpriteVersions() {
    document.querySelectorAll('use[href*="sprite.svg"]').forEach(use => {
        const href = use.getAttribute('href');

        const [spritePath, iconId] = href.split('#');

        use.setAttribute(
            'href',
            `${spritePath.split('?')[0]}?v=${version}#${iconId}`
        );
    });
}


async function startApp() {
    try {

        updateSpriteVersions();

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
        state.current = state.sentences[state.queue[0]] || null;

        // 🔹 Show UI
        const app = document.getElementById('app');

        document.getElementById('loading').style.display = 'none';
        app.style.display = 'flex';

        setTimeout(() => {
            app.classList.add('visible');
            // initialize cached element references once
            initEls();
            render();
            initOptions();
        }, 10);

    } catch (err) {
        console.error('Error loading data:', err);
    }
}

startApp();