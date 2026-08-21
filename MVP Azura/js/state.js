export const state = {
    sentences: [],   // active dataset from API

    queue: [],       // session order
    queueIndex: 0,   // pointer in session
    current: null,   // current word object

    userInput: '',

    status: 'loading',

    flashWrong: false,
    lastTypedCorrect: true,
    answeredWithHint: false,
    layoutWarning: false,
    isSubmitting: false,

    soundEnabled: true,

    // Session control
    sessionLimit: 3,
    sessionCount: 0,
    completedCount: 0,
    totalCompleted: Number(localStorage.getItem('totalCompleted')) || 0,
    nextSessionLimit: null,
    sessionWords: [],

    // Session stats
    sessionCorrect: 0,
    sessionWrong: 0,
};