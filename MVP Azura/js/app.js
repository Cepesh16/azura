async function startApp() {
    try {
        const version = document
            .querySelector('meta[name="app-version"]')
            .content;

        console.log('VERSION:', version);

        // 🔥 LOAD MODULES WITH VERSION
        const { fetchSentences } = await import(`./api.js?v=${version}`);
        const { state } = await import(`./state.js?v=${version}`);
        const { buildSessionQueue } = await import(`./logic.js?v=${version}`);
        const { render } = await import(`./ui.js?v=${version}`);
        const { initOptions } = await import(`./options.js?v=${version}`);

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