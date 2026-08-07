// API_URL = "https://script.google.com/macros/s/AKfycbw4tHvovXCybGpA92kxgcuwRz78y6uyPk8tPQ80U3KRU4QpFFeE0y1kE8YMvi5uCJlX/exec";

const API_URL = "https://script.google.com/macros/s/AKfycbw4tHvovXCybGpA92kxgcuwRz78y6uyPk8tPQ80U3KRU4QpFFeE0y1kE8YMvi5uCJlX/exec";

export async function fetchSentences() {
    const res = await fetch(API_URL);
    const data = await res.json();

    return data.map(row => ({
        id: row.id,
        sentence: row.sentence,
        answer: row.answer,
        translation: row.translation,
        audioUrl: row.audioUrl // 👈 important
    }));
}

export async function updateWord(id, correct) {

    await fetch(
        `${API_URL}?action=update&id=${id}&correct=${correct}`
    );

}



