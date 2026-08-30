export const state = {
    sentences: [],   // active dataset from API

    queue: [],       // session order
    queueIndex: 0,   // pointer in session
    current: null,   // current word object

    userInput: '',
// in export const state = { ... }
inputLocked: false,   // used to temporarily block input while animations run
isComposing: false,   // tracks IME composition state
autoSubmitTimer: null,
answerComplete: false,

    status: 'loading',

    flashWrong: false,
    lastTypedCorrect: true,
    answeredWithHint: false,
    layoutWarning: false,
    isSubmitting: false,


    soundEnabled: true,

    // Session control
    sessionLimit: 10,
    sessionCount: 0,
    completedCount: 0,
    totalCompleted: Number(localStorage.getItem('totalCompleted')) || 0,
    nextSessionLimit: null,
    sessionWords: [],

    // Session stats
    sessionCorrect: 0,
    sessionWrong: 0,
};