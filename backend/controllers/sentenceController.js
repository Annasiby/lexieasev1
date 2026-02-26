import SentenceState from "../models/SentenceState.js";
import LetterState from "../models/LetterState.js";
import { selectNextState } from "../src/bandit/selectNext.js";
import { updateBanditState } from "../src/bandit/updateState.js";
import { SENTENCES } from "../data/sentences.js";
import SentenceAttempt from "../models/SentenceAttempt.js";


// Chooses the next sentence based on the student's weakest letters (2–3)
export const getNextSentence = async (req, res) => {
  try {
    const studentId = req.user._id;
    
    // Get weakest letters
    const weakLetterStates = await LetterState.find({ studentId })
      .sort({ avgReward: 1 }) // lowest = hardest
      .limit(3);

    let weakLetters = weakLetterStates.map(ls => ls.letter);

    // Fallback for new users
    if (weakLetters.length === 0) {
      weakLetters = ["a", "e", "i"];
    }

    // Score sentences
    const scoreSentence = (sentenceText, letters) => {
      const text = sentenceText.toLowerCase();
      let score = 0;

      for (const letter of letters) {
        score += text.split(letter).length - 1;
      }

      return score;
    };

    const rankedSentences = SENTENCES
      .map(s => ({
        ...s,
        score: scoreSentence(s.text, weakLetters),
      }))
      .filter(s => s.score > 0);

    // Fallback: if no sentence stresses weak letters
    const finalSentences =
      rankedSentences.length > 0
        ? rankedSentences
        : SENTENCES.map(s => ({ ...s, score: 1 }));

    // Ensure SentenceState exists
    await Promise.all(
      finalSentences.map(sentence =>
        SentenceState.findOneAndUpdate(
          { studentId, sentenceId: sentence.id },
          {},
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );

    // Fetch candidate states
    const candidateStates = await SentenceState.find({
      studentId,
      sentenceId: { $in: finalSentences.map(s => s.id) },
    });

    if (candidateStates.length === 0) {
      return res.status(500).json({
        success: false,
        error: "No sentence states available",
      });
    }

    const RECENT_WINDOW_MS = 30 * 1000; // 30 seconds

    const now = Date.now();

    const filteredStates = candidateStates.filter(state => {
    if (!state.lastShownAt) return true;
    return now - new Date(state.lastShownAt).getTime() > RECENT_WINDOW_MS;
    });

    // fallback if all filtered out
    const selectionPool =
    filteredStates.length > 0 ? filteredStates : candidateStates;

    const chosenState = selectNextState(selectionPool);
    // BEFORE activating chosenState
    await SentenceState.updateMany(
    {
        studentId,
        isActive: true,
        sentenceId: { $ne: chosenState.sentenceId },
    },
    { isActive: false }
    );

    // Bandit selection
    //const chosenState = selectNextState(candidateStates);

    chosenState.isActive = true;
    chosenState.lastShownAt = new Date();
    await chosenState.save();

    // Return sentence
    const chosenSentence = SENTENCES.find(
      s => s.id === chosenState.sentenceId
    );

    return res.json({
      success: true,
      sentenceId: chosenSentence.id,
      sentence: chosenSentence.text,
      targetLetters: weakLetters,
    });

  } catch (err) {
    console.error("getNextSentence error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

//Evaluates sentence attempt and reinforces letter learning
// ─── REPLACE the logSentenceAttempt function in geminiSentence.js ───────────
// Only the SentenceAttempt.create() call and the const→let fix need changing.
// Everything else stays identical.

// export const logSentenceAttempt = async (req, res) => {
//   console.log("HIT /sentences/attempt", req.body);
//   try {
//     const studentId = req.user._id;
//     const { sentenceId, expected, spoken, responseTimeMs, visualIsHard } = req.body;

//     // ✅ FIX: was const — cannot reassign a const
//     let visualScore = Number(req.body.visualScore) || 0;

//     if (!sentenceId || !expected || !spoken || responseTimeMs === undefined) {
//       return res.status(400).json({ success: false, error: "Missing required fields" });
//     }

//     const sentenceState = await SentenceState.findOne({ studentId, sentenceId });
//     console.log("ATTEMPT UPDATE", { sentenceId, expected, studentId });

//     if (!sentenceState) {
//       return res.status(409).json({ success: false, error: "No active sentence or sentence mismatch" });
//     }

//     // Normalize
//     const normalize = (text) =>
//       text.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

//     const expectedNorm  = normalize(expected);
//     const spokenNorm    = normalize(spoken);
//     const expectedWords = expectedNorm.split(" ");
//     const spokenWords   = spokenNorm.split(" ");

//     const matchedWords      = expectedWords.filter(w => spokenWords.includes(w));
//     const sentenceAccuracy  = matchedWords.length / expectedWords.length;
//     const sentenceCorrect   = sentenceAccuracy >= 0.7;

//     // Problem letters
//     const problemLetters = new Set();
//     const minLen = Math.min(expectedNorm.length, spokenNorm.length);
//     for (let i = 0; i < minLen; i++) {
//       const expChar = expectedNorm[i];
//       if (expChar !== spokenNorm[i] && expChar >= "a" && expChar <= "z") {
//         problemLetters.add(expChar);
//       }
//     }

//     // Reward
//     const fluencyScore  = Math.min(1, 3000 / responseTimeMs);
//     const visionPenalty = visualScore * 0.2;
//     const sentenceReward = 0.6 * (sentenceCorrect ? 1 : 0) + 0.4 * fluencyScore;
//     const finalReward    = Math.max(0, sentenceReward - visionPenalty);

//     console.log("REWARD DEBUG", { responseTimeMs, fluencyScore, sentenceCorrect, sentenceReward, visualScore, visualIsHard });

//     await updateBanditState(sentenceState, sentenceReward);
//     sentenceState.isActive = false;
//     await sentenceState.save();

//     // Reinforce LetterState
//     for (const letter of problemLetters) {
//       const letterState = await LetterState.findOne({ studentId, letter });
//       if (!letterState) continue;
//       updateBanditState(letterState, -0.2);
//       await letterState.save();
//     }

//     // ✅ SAVE ATTEMPT — now includes eye-tracking fields
//     await SentenceAttempt.create({
//       studentId,
//       sentenceId,
//       expected,
//       spoken,
//       sentenceCorrect,
//       sentenceAccuracy,
//       responseTimeMs,
//       problemLetters: Array.from(problemLetters),
//       visualScore,                          // ✅ new
//       visualIsHard: Boolean(visualIsHard),  // ✅ new
//     });

//     return res.json({
//       success:          true,
//       sentenceCorrect,
//       sentenceAccuracy,
//       problemLetters:   Array.from(problemLetters),
//       message:          sentenceCorrect
//         ? "Good job! Keep going."
//         : "Nice try! Focus on the highlighted sounds.",
//     });

//   } catch (err) {
//     console.error("logSentenceAttempt error:", err);
//     return res.status(500).json({ success: false, error: "Internal server error" });
//   }
// };

// ─── REPLACE the logSentenceAttempt function in geminiSentence.js ───────────
// Only the SentenceAttempt.create() call and the const→let fix need changing.
// Everything else stays identical.

export const logSentenceAttempt = async (req, res) => {
  console.log("HIT /sentences/attempt", req.body);
  try {
    const studentId = req.user._id;
    const { sentenceId, expected, spoken, responseTimeMs, visualIsHard } = req.body;

    // ✅ FIX: was const — cannot reassign a const
    let visualScore = Number(req.body.visualScore) || 0;

    if (!sentenceId || !expected || !spoken || responseTimeMs === undefined) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const sentenceState = await SentenceState.findOne({ studentId, sentenceId });
    console.log("ATTEMPT UPDATE", { sentenceId, expected, studentId });

    if (!sentenceState) {
      return res.status(409).json({ success: false, error: "No active sentence or sentence mismatch" });
    }

    // Normalize
    const normalize = (text) =>
      text.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

    const expectedNorm  = normalize(expected);
    const spokenNorm    = normalize(spoken);
    const expectedWords = expectedNorm.split(" ");
    const spokenWords   = spokenNorm.split(" ");

    // ✅ Position-aware matching: compare word-by-word at same index
    // Also tries the spoken word at nearby positions to handle insertions/deletions
    let matchedCount = 0;
    const wrongWords = []; // expected words that were wrong

    for (let i = 0; i < expectedWords.length; i++) {
      const exp = expectedWords[i];
      // Check exact position first, then ±1 positions to tolerate minor insertions
      const matched =
        spokenWords[i] === exp ||
        spokenWords[i - 1] === exp ||
        spokenWords[i + 1] === exp;

      if (matched) {
        matchedCount++;
      } else {
        wrongWords.push(exp);
      }
    }

    const sentenceAccuracy = matchedCount / expectedWords.length;
    // ✅ Stricter threshold: all words must match (1.0) or at most 1 word wrong
    const sentenceCorrect  = wrongWords.length === 0 ||
      (wrongWords.length === 1 && expectedWords.length >= 6);

    // ✅ Problem letters: extract first letters of wrong words (word-level errors)
    const problemLetters = new Set();
    for (const word of wrongWords) {
      // Add the first letter and any letter that differs from the spoken version
      const spokenEquiv = spokenWords[expectedWords.indexOf(word)];
      if (word[0]) problemLetters.add(word[0]); // first letter of missed word
      if (spokenEquiv) {
        const minLen = Math.min(word.length, spokenEquiv.length);
        for (let i = 0; i < minLen; i++) {
          if (word[i] !== spokenEquiv[i]) {
            problemLetters.add(word[i]);
            break; // first mismatch char per word is enough
          }
        }
      }
    }

    // Reward
    const fluencyScore  = Math.min(1, 3000 / responseTimeMs);
    const visionPenalty = visualScore * 0.2;
    const sentenceReward = 0.6 * (sentenceCorrect ? 1 : 0) + 0.4 * fluencyScore;
    const finalReward    = Math.max(0, sentenceReward - visionPenalty);

    console.log("REWARD DEBUG", { responseTimeMs, fluencyScore, sentenceCorrect, sentenceReward, visualScore, visualIsHard });

    await updateBanditState(sentenceState, sentenceReward);
    sentenceState.isActive = false;
    await sentenceState.save();

    // Reinforce LetterState
    for (const letter of problemLetters) {
      const letterState = await LetterState.findOne({ studentId, letter });
      if (!letterState) continue;
      updateBanditState(letterState, -0.2);
      await letterState.save();
    }

    // ✅ SAVE ATTEMPT — now includes eye-tracking fields
    await SentenceAttempt.create({
      studentId,
      sentenceId,
      expected,
      spoken,
      sentenceCorrect,
      sentenceAccuracy,
      responseTimeMs,
      problemLetters: Array.from(problemLetters),
      visualScore,                          // ✅ new
      visualIsHard: Boolean(visualIsHard),  // ✅ new
    });

    return res.json({
      success:          true,
      sentenceCorrect,
      sentenceAccuracy,
      problemLetters:   Array.from(problemLetters),
      message:          sentenceCorrect
        ? "Good job! Keep going."
        : "Nice try! Focus on the highlighted sounds.",
    });

  } catch (err) {
    console.error("logSentenceAttempt error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};