export const state = {
    sentences: [],
    allSentences: [],
    currentIndex: 0,

    userInput: '',

    status: 'loading',

    hasTypedAfterWrong: false,
    cursorInitialized: false,
    flashWrong: false,
    answeredWithHint: false,

    // Session control
    sessionCount: 0,
    sessionLimit: 5,
    sessionWords: [],

    // ✅ Session stats (FIXED)
    sessionCorrect: 0,
    sessionWrong: 0,

    studyMode: 'all'
};