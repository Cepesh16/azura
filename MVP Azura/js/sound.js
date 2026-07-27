const correctSound = new Audio('./assets/sounds/correct.mp3');
const wrongSound = new Audio('./assets/sounds/wrong.mp3');

correctSound.preload = 'auto';
wrongSound.preload = 'auto';

export function playCorrect() {

    if (localStorage.getItem('soundEnabled') === 'false') return;

    correctSound.currentTime = 0;
    correctSound.play();
}

export function playWrong() {

    if (localStorage.getItem('soundEnabled') === 'false') return;

    wrongSound.currentTime = 0;
    wrongSound.play();
}