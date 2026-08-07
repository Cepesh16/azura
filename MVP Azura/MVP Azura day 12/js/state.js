export const state = {
    sentences: [],
    allSentences: [],
    _currentIndex: 0,

    get currentIndex() {
        return this._currentIndex;
    },

    set currentIndex(value) {
        console.log('🔥 currentIndex →', value);
        console.trace(); // 👈 THIS IS KEY
        this._currentIndex = value;
    },

    userInput: '',

    status: 'loading',

    hasTypedAfterWrong: false,
    cursorInitialized: false,
    flashWrong: false,
    answeredWithHint: false,
    layoutWarning: false,
    isSubmitting: false,

    soundEnabled: true,

    // Session control
    sessionCount: 0,
    sessionLimit: 5,
    nextSessionLimit: null,
    sessionWords: [],
    sessionQueue: [],
    currentQueueIndex: 0,

    // ✅ Session stats (FIXED)
    sessionCorrect: 0,
    sessionWrong: 0,

};