
const API_URL = "assets/json/vocabulary.json";
const STORAGE_KEY = "vocab_updates_v1";

export async function fetchSentences() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) {
      throw new Error(`Vocabulary request failed: ${res.status}`);
    }

    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ API did not return JSON:", text);
      alert("Temporary server issue. Please reload.");
      return null;
    }

    // Build the sentence objects used by the trainer.
    const rows = data.map(row => {
      const sentence = row.sentence;
      const answer = row.answer;
      const answerLength = answer.length;
      const match = sentence.match(
        new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
      );
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
        explanation: row.explanation,
        translation: row.translation,
        audioUrl: row.audioUrl,
        partOfSpeech: row.partOfSpeech,
        gapIndex,
        isFirstWord,
        formattedAnswer,
        answerLength,

        // Keep any progress already present in the vocabulary JSON.
        memoryLevel: Number(row.memoryLevel) || 0,
        everReachedLevel3: Boolean(row.everReachedLevel3),
        everReachedLevel5: Boolean(row.everReachedLevel5),
        correct: Number(row.correct) || 0,
        wrong: Number(row.wrong) || 0,
        lastSeen: row.lastSeen || null
      };
    });

    // Merge progress saved in this browser.
    let updates = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      updates = raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.error("Could not read saved vocabulary progress:", err);
    }

    return rows.map(row => {
      const upd = updates[row.id];
      if (!upd) return row;

      const memoryLevel = Math.max(
        0,
        Math.min(5, Number(upd.memoryLevel ?? row.memoryLevel) || 0)
      );

      return {
        ...row,
        memoryLevel,
        everReachedLevel3:
          row.everReachedLevel3 ||
          Boolean(upd.everReachedLevel3) ||
          memoryLevel >= 3,
        everReachedLevel5:
          row.everReachedLevel5 ||
          Boolean(upd.everReachedLevel5) ||
          memoryLevel >= 5,
        correct: (Number(row.correct) || 0) + (Number(upd.correct) || 0),
        wrong: (Number(row.wrong) || 0) + (Number(upd.wrong) || 0),
        lastSeen: upd.lastUpdated || row.lastSeen
      };
    });
  } catch (err) {
    console.error("❌ Network error:", err);
    alert("Network error. Check connection and reload.");
    return null;
  }
}

/*
 * outcome:
 *   true  = correct without hint; increase the correct count
 *   false = wrong answer; increase the wrong count
 *   null  = completed with a hint; save progress without changing either count
 *
 * Pass the full word object so its learning progress is saved as well.
 */
export async function updateWord(word, outcome = null) {
  if (!word || word.id == null) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const updates = raw ? JSON.parse(raw) : {};

    const existing = updates[word.id] || {
      correct: 0,
      wrong: 0,
      lastUpdated: null
    };

    if (outcome === true) {
      existing.correct = (Number(existing.correct) || 0) + 1;
    } else if (outcome === false) {
      existing.wrong = (Number(existing.wrong) || 0) + 1;
    }

    existing.memoryLevel = Math.max(
      0,
      Math.min(5, Number(word.memoryLevel) || 0)
    );
    existing.everReachedLevel3 = Boolean(word.everReachedLevel3);
    existing.everReachedLevel5 = Boolean(word.everReachedLevel5);
    existing.lastUpdated = new Date().toISOString();

    updates[word.id] = existing;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
  } catch (err) {
    console.error("❌ Could not save vocabulary progress:", err);
  }
}
