export function speak(text, onEnd) {

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.onend = () => {
        if (onEnd) {
            onEnd();
        }
    };

    speechSynthesis.speak(utterance);
}