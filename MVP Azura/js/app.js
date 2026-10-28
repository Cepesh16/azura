import { fetchSentences } from './api.js';
import { state } from './state.js';
import { buildSessionQueue } from './logic.js';
import { render, initEls } from './ui.js';
import { initOptions } from './options.js';

const version = '1.012';
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

// Connect buttons with screens they open
document.getElementById('profile-start').addEventListener('click', () => {
showScreen('trainer-screen');
});
document.getElementById('profile-status').addEventListener('click', () => {
    showScreen('status-screen');
});

document.getElementById('profile-progress').addEventListener('click', () => {
    showScreen('progress-screen');
});

    document.getElementById('progress-words').addEventListener('click', () => {
        renderWordsList();
        showScreen('progress-words-screen');
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
document.querySelectorAll('.back-button').forEach(button => {
    button.addEventListener('click', () => {
        history.back();
    });
});

// Handle Android/browser Back button
history.replaceState({ appScreen: 'profile-screen' }, '');
history.pushState({ appScreen: 'profile-screen' }, '');

window.addEventListener('popstate', () => {
    goBack();

    // Keep a history entry so Back can be handled again
    const currentScreen = document.querySelector('.screen.active');

    history.pushState(
        { appScreen: currentScreen.id },
        ''
    );
});



function renderWordsList() {
    const list = document.getElementById('words-list');
    if (!list) return;

    const searchInput = document.getElementById('words-search');
    const levelFilter = document.getElementById('words-level-filter');

    const search = searchInput.value.trim().toLowerCase();
    const selectedLevel = levelFilter.value;

    const words = [...state.sentences]
        .filter(word => {
            const matchesSearch = word.answer
                .toLowerCase()
                .includes(search);

            const level = Number(word.memoryLevel) || 0;
            const matchesLevel =
                selectedLevel === 'all' ||
                level === Number(selectedLevel);

            return matchesSearch && matchesLevel;
        })
        .sort((a, b) => a.answer.localeCompare(b.answer));


        const wordsCount = document.getElementById('words-count');

        if (wordsCount) {
            wordsCount.textContent = `Words: ${words.length}`;
        }

    list.replaceChildren();

    if (words.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'words-empty';
        empty.textContent = 'No words found.';
        list.appendChild(empty);
        return;
    }

    words.forEach(word => {
        const level = Math.max(
            0,
            Math.min(5, Number(word.memoryLevel) || 0)
        );

        const row = document.createElement('div');
        row.className = 'word-row';

        const name = document.createElement('span');
        name.className = 'word-name';
        name.textContent = word.answer;

        const levelLabel = document.createElement('span');
        levelLabel.className = 'word-level';
        levelLabel.textContent = `${level}/5`;

        const bar = document.createElement('div');
        bar.className = 'word-level-bar';
        bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', `Level ${level} out of 5`);

        for (let i = 1; i <= 5; i++) {
            const segment = document.createElement('span');
            segment.className =
                i <= level
                    ? 'word-level-segment filled'
                    : 'word-level-segment';

            bar.appendChild(segment);
        }

        const details = document.createElement('div');
        details.className = 'word-details';
        details.append(name, bar);

        row.append(details, levelLabel);
        list.appendChild(row);
    });
}

document.getElementById('words-search').addEventListener('input', renderWordsList);
document.getElementById('words-level-filter').addEventListener('change', renderWordsList);



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