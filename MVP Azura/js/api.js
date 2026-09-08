const API_URL = "assets/json/vocabulary.json";

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
            const answerLength = answer.length;

            const match = sentence.match(new RegExp(`\\b${answer}\\b`, 'i'));
            const gapIndex = match ? match.index : -1;

            const isFirstWord = gapIndex === 0;

            const base = answer.toLowerCase();

            const formattedAnswer = isFirstWord
                ? base.charAt(0).toUpperCase() + base.slice(1)
                : base;

            return {
                id: row.id,
                sentence,
                answer,
                translation: row.translation,
                audioUrl: row.audioUrl,
                partOfSpeech: row.partOfSpeech,

                // 🔥 precomputed
                gapIndex,
                isFirstWord,
                formattedAnswer,
                answerLength
            };
        });


        // apply local updates to parsed array of rows
        function applyLocalUpdatesToRows(rows) {
          try {
            const STORAGE_KEY = 'vocab_updates_v1';
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return rows;
            const updates = JSON.parse(raw);

            // rows is the parsed JSON array with `id` field
            return rows.map(row => {
              const copy = { ...row };
              const upd = updates[row.id];
              if (upd) {
                // merge counts into the row fields you use: correct, wrong, lastSeen
                copy.correct = (Number(copy.correct) || 0) + (upd.correct || 0);
                copy.wrong = (Number(copy.wrong) || 0) + (upd.wrong || 0);
                copy.lastSeen = upd.lastUpdated || copy.lastSeen;
              }
              return copy;
            });
          } catch (err) {
            console.error('applyLocalUpdatesToRows error:', err);
            return rows;
          }
        }

    } catch (err) {
        console.error('❌ Network error:', err);
        alert('Network error. Check connection and reload.');
        return null; // ✅ FIXED
    }
}

// api.js (replace existing updateWord)
export async function updateWord(id, correct) {
  // Quick helper to detect whether API_URL is a static local JSON.
  const looksLikeStaticJson = API_URL.startsWith('assets/') || API_URL.endsWith('.json');

  // Try network update only if API_URL is not a static JSON file.
  if (!looksLikeStaticJson) {
    try {
      await fetch(`${API_URL}?action=update&id=${encodeURIComponent(id)}&correct=${correct}`);
      return;
    } catch (err) {
      console.error('❌ updateWord network request failed:', err);
      // fall through to local fallback
    }
  }

  // Local fallback: track updates in localStorage so progress is not lost.
  try {
    const STORAGE_KEY = 'vocab_updates_v1';
    const raw = localStorage.getItem(STORAGE_KEY);
    const updates = raw ? JSON.parse(raw) : {};

    if (!updates[id]) {
      updates[id] = { correct: 0, wrong: 0, lastUpdated: null };
    }

    if (correct) {
      updates[id].correct = (updates[id].correct || 0) + 1;
    } else {
      updates[id].wrong = (updates[id].wrong || 0) + 1;
    }

    updates[id].lastUpdated = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
  } catch (err) {
    console.error('❌ updateWord local fallback failed:', err);
  }
}

