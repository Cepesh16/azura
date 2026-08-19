// API_URL = "https://script.google.com/macros/s/AKfycbw4tHvovXCybGpA92kxgcuwRz78y6uyPk8tPQ80U3KRU4QpFFeE0y1kE8YMvi5uCJlX/exec";

const API_URL = "https://script.google.com/macros/s/AKfycbw4tHvovXCybGpA92kxgcuwRz78y6uyPk8tPQ80U3KRU4QpFFeE0y1kE8YMvi5uCJlX/exec";

export async function fetchSentences() {
    try {
        const res = await fetch(API_URL);

        const text = await res.text();

        let data;

        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('❌ API did not return JSON:', text);
            alert('Temporary server issue. Please reload.');
            return null;
        }

        return data.map(row => {

            const sentence = row.sentence;
            const answer = row.answer;

            const match = sentence.match(new RegExp(`\\b${answer}\\b`, 'i'));

            return {
                id: row.id,
                sentence,
                answer,
                translation: row.translation,
                partOfSpeech: row.partOfSpeech,
                audioUrl: row.audioUrl,

                // 🔥 NEW
                gapIndex: match ? match.index : -1
            };
        });

    } catch (err) {
        console.error('❌ Network error:', err);
        alert('Network error. Check connection and reload.');
        return null; // ✅ FIXED
    }
}

export async function updateWord(id, correct) {
    try {
        await fetch(`${API_URL}?action=update&id=${id}&correct=${correct}`);
    } catch (err) {
        console.error('❌ updateWord failed:', err);
    }
}

