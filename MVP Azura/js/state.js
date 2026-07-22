export const state = {
    sentences: [],
    currentIndex: 0,
    userInput: '',
    
    status: 'loading', // 'waiting' | 'correct' | 'wrong'
    
    hasTypedAfterWrong: false,
    cursorInitialized: false,
    flashWrong: false,
    
    sessionCount: 0,
};