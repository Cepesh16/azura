export function speak(text, onEnd) {
    // ❗ Check support
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
        console.warn('🔇 Speech not supported');

        // fallback → just continue flow
        if (onEnd) onEnd();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.onend = () => {
        if (onEnd) onEnd();
    };

    speechSynthesis.cancel(); // stop previous if any
    speechSynthesis.speak(utterance);
}