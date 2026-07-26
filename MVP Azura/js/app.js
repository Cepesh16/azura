import { fetchSentences } from './api.js';
import { state } from './state.js';
import { render } from './ui.js';
import { setStudyMode } from './studyMode.js';

async function init() {
    try {
        // 🔹 Setup UI first
        const optionsBtn = document.getElementById('options-btn');
        const modal = document.getElementById('options-modal');
        const saveBtn = document.getElementById('save-options');
        const select = document.getElementById('session-select');

        // Open modal
        optionsBtn.onclick = () => {
            // show current value in dropdown
            select.value = state.sessionLimit;

            modal.style.display = 'flex';
        };

        // Save
        saveBtn.onclick = () => {
            state.sessionLimit = Number(select.value);

            modal.style.display = 'none';

            // restart session with new limit
            setStudyMode(state.studyMode);
        };
        // ✅ CLOSE when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };


        // 🔹 Then load data
        const data = await fetchSentences();

        console.log('DATA LENGTH:', data.length);
        console.log('Loaded sentences:', data);

        state.allSentences = data;

        state.userInput = '';
        state.status = 'waiting';


        const sessionData = JSON.parse(localStorage.getItem('sessionData'));
        const today = new Date().toDateString();

        if (sessionData && sessionData.date === today && sessionData.completed) {
            state.sessionCorrect = sessionData.correct || 0;
            state.sessionWrong = sessionData.wrong || 0;

            state.sentences = [];
            render();


//TEMPORARY CODE FOR RESET SESSION BUTTON - DELETE OR HIDE LATER, ALSO REMOVE HTML CODE FOR BUTTON
            document.getElementById('reset-session').onclick = () => {

                localStorage.removeItem('sessionData');

                state.sessionCount = 0;
                state.sessionCorrect = 0;
                state.sessionWrong = 0;

                setStudyMode(state.studyMode);
            };
// THE END OF TEMPORARY RESET SESSION BUTTON



            const app = document.getElementById('app');

            document.getElementById('loading').style.display = 'none';
            app.style.display = 'block';

            setTimeout(() => {
                app.classList.add('visible');
            }, 10);

            return;
        }

        // ✅ New day → reset automatically
        localStorage.removeItem('sessionData');


        // Build the active list according to the current study mode
        setStudyMode('all');
        
        const app = document.getElementById('app');

        document.getElementById('loading').style.display = 'none';
        app.style.display = 'block';

        setTimeout(() => {
            app.classList.add('visible');

            // 🔧 restore focus after fade-in
            const input = document.getElementById('gap-input');
            if (input) input.focus();

        }, 10);
        
        // Study mode buttons
        document.getElementById('mode-all').onclick = () => {
            setStudyMode('all');
        };

        document.getElementById('mode-review').onclick = () => {
            setStudyMode('review');
        };

    } catch (err) {
        console.error('Error loading data:', err);
    }
}

init();