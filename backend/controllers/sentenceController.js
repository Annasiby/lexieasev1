import SentenceState from "../models/SentenceState.js";
import LetterState from "../models/LetterState.js";
import { selectNextState } from "../src/bandit/selectNext.js";
import { updateBanditState } from "../src/bandit/updateState.js";
import { SENTENCES } from "../data/sentences.js";

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
export const logSentenceAttempt = async (req, res) => {
  console.log("HIT /sentences/attempt", req.body);
  try {
    const studentId = req.user._id;
    const { sentenceId, expected, spoken, responseTimeMs } = req.body;

    if (!sentenceId || !expected || !spoken || responseTimeMs === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Verify active sentence
    const sentenceState = await SentenceState.findOne({
      studentId,
      sentenceId,
    });
    console.log("ATTEMPT UPDATE", {
    sentenceId,
    expected,
    studentId,
    });

    if (!sentenceState) {
      return res.status(409).json({
        success: false,
        error: "No active sentence or sentence mismatch",
      });
    }

    // Normalize text
    const normalize = (text) =>
      text
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const expectedNorm = normalize(expected);
    const spokenNorm = normalize(spoken);

    const expectedWords = expectedNorm.split(" ");
    const spokenWords = spokenNorm.split(" ");

    // Sentence-level correctness   
    const matchedWords = expectedWords.filter((word) =>
      spokenWords.includes(word)
    );

    const sentenceAccuracy =
      matchedWords.length / expectedWords.length;

    const sentenceCorrect = sentenceAccuracy >= 0.7;

    // Extract letter-level errors   
    const problemLetters = new Set();

    const minLen = Math.min(expectedNorm.length, spokenNorm.length);

    for (let i = 0; i < minLen; i++) {
      const expChar = expectedNorm[i];
      const spkChar = spokenNorm[i];

      if (expChar !== spkChar) {
        if (expChar >= "a" && expChar <= "z") {
          problemLetters.add(expChar);
        }
      }
    }

    // Update SentenceState   
    const fluencyScore = Math.min(1, 3000 / responseTimeMs);

    const sentenceReward =
      0.6 * (sentenceCorrect ? 1 : 0) +
      0.4 * fluencyScore;

    console.log("REWARD DEBUG", {
    responseTimeMs,
    fluencyScore,
    sentenceCorrect,
    sentenceReward,
  });

    await updateBanditState(sentenceState, sentenceReward);
    sentenceState.isActive = false;
    await sentenceState.save();

    // Reinforce LetterState
    for (const letter of problemLetters) {
      const letterState = await LetterState.findOne({
        studentId,
        letter,
      });

      if (!letterState) continue;

      // Small penalty, not harsh
      const letterPenalty = 0.2;

      updateBanditState(letterState, -letterPenalty);
      await letterState.save();
    }

    // Respond
    return res.json({
      success: true,
      sentenceCorrect,
      sentenceAccuracy,
      problemLetters: Array.from(problemLetters),
      message: sentenceCorrect
        ? "Good job! Keep going."
        : "Nice try! Focus on the highlighted sounds.",
    });

  } catch (err) {
    console.error("logSentenceAttempt error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
  
};
