export async function fetchSentences() {
    const res = await fetch('https://script.google.com/macros/s/AKfycbw4tHvovXCybGpA92kxgcuwRz78y6uyPk8tPQ80U3KRU4QpFFeE0y1kE8YMvi5uCJlX/exec');
    const data = await res.json();



    console.log("RAW API RESPONSE:", data);

    return data;
}
