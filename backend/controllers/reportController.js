// import SentenceAttempt from "../models/SentenceAttempt.js";
// import LetterState from "../models/LetterState.js";
// import { SENTENCES } from "../data/sentences.js";

// export const generateStudentReport = async (req, res) => {
//   try {
//     if (!req.user) {
//       return res.status(401).json({ error: "User not authenticated" });
//     }

//     const studentId = req.user._id;
//     const { timeframe = 7 } = req.query;

//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - timeframe);

//     const attempts = await SentenceAttempt.find({
//       studentId,
//       createdAt: { $gte: startDate }
//     }).sort({ createdAt: 1 });

//     if (!attempts.length) {
//       return res.json({
//         success: true,
//         message: "No data available yet",
//         metrics: null,
//       });
//     }

//     // === OVERALL METRICS ===
//     const total = attempts.length;
//     const correctAttempts = attempts.filter(a => a.sentenceCorrect).length;
//     const avgAccuracy = attempts.reduce((sum, a) => sum + a.sentenceAccuracy, 0) / total;
//     const avgResponseTime = attempts.reduce((sum, a) => sum + a.responseTimeMs, 0) / total;

//     // === TREND ANALYSIS ===
//     const trend = calculateTrend(attempts);

//     // === PROBLEM LETTERS ANALYSIS ===
//     const letterFrequency = {};
//     attempts.forEach(attempt => {
//       attempt.problemLetters.forEach(letter => {
//         letterFrequency[letter] = (letterFrequency[letter] || 0) + 1;
//       });
//     });

//     const topProblemLetters = Object.entries(letterFrequency)
//       .sort(([, a], [, b]) => b - a)
//       .slice(0, 5)
//       .map(([letter, count]) => ({
//         letter,
//         errorCount: count,
//         errorRate: ((count / total) * 100).toFixed(1)
//       }));

//     // === SENTENCE-LEVEL INSIGHTS ===
//     const sentenceStats = {};
//     attempts.forEach(attempt => {
//       if (!sentenceStats[attempt.sentenceId]) {
//         sentenceStats[attempt.sentenceId] = {
//           attempts: 0,
//           correct: 0,
//           totalAccuracy: 0,
//           totalTime: 0
//         };
//       }
//       const stats = sentenceStats[attempt.sentenceId];
//       stats.attempts++;
//       if (attempt.sentenceCorrect) stats.correct++;
//       stats.totalAccuracy += attempt.sentenceAccuracy;
//       stats.totalTime += attempt.responseTimeMs;
//     });

//     const mostDifficultSentences = Object.entries(sentenceStats)
//       .map(([sentenceId, stats]) => ({
//         sentenceId,
//         sentence: SENTENCES.find(s => s.id === sentenceId)?.text || "Unknown",
//         attempts: stats.attempts,
//         successRate: ((stats.correct / stats.attempts) * 100).toFixed(1),
//         avgAccuracy: ((stats.totalAccuracy / stats.attempts) * 100).toFixed(1),
//         avgTime: Math.round(stats.totalTime / stats.attempts)
//       }))
//       .sort((a, b) => parseFloat(a.successRate) - parseFloat(b.successRate))
//       .slice(0, 3);

//     // === PROGRESS TIMELINE ===
//     const dailyProgress = groupByDay(attempts);

//     // === PERSONALIZED FEEDBACK ===
//     const feedback = generateFeedback({
//       avgAccuracy,
//       trend,
//       topProblemLetters,
//       avgResponseTime,
//       correctAttempts,
//       total
//     });

//     // === LETTER STATE DATA ===
//     const letterStates = await LetterState.find({ studentId })
//       .sort({ avgReward: 1 })
//       .limit(10);

//     const letterProgress = letterStates.map(ls => ({
//       letter: ls.letter,
//       strength: (ls.avgReward * 100).toFixed(1),
//       attempts: ls.pulls
//     }));

//     return res.json({
//       success: true,
//       metrics: {
//         overview: {
//           totalAttempts: total,
//           correctAttempts,
//           successRate: ((correctAttempts / total) * 100).toFixed(1),
//           accuracyPercentage: (avgAccuracy * 100).toFixed(1),
//           avgResponseTime: Math.round(avgResponseTime),
//         },
//         trend: {
//           direction: trend.direction,
//           change: trend.change,
//           recentAccuracy: (trend.recentAvg * 100).toFixed(1),
//           previousAvg: trend.previousAvg,
//         },
//         problemAreas: {
//           letters: topProblemLetters,
//           sentences: mostDifficultSentences,
//         },
//         progress: {
//           daily: dailyProgress,
//           letterStrength: letterProgress,
//         },
//         feedback,
//         timeframe,
//       },
//     });

//   } catch (err) {
//     console.error("Report error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// // === HELPER FUNCTIONS ===

// function calculateTrend(attempts) {
//   if (attempts.length < 4) {
//     return { direction: 'insufficient_data', change: 0, recentAvg: 0, previousAvg: 0 };
//   }

//   const half = Math.floor(attempts.length / 2);
//   const firstHalf = attempts.slice(0, half);
//   const secondHalf = attempts.slice(half);

//   const firstAvg = firstHalf.reduce((sum, a) => sum + a.sentenceAccuracy, 0) / firstHalf.length;
//   const secondAvg = secondHalf.reduce((sum, a) => sum + a.sentenceAccuracy, 0) / secondHalf.length;

//   const change = ((secondAvg - firstAvg) / firstAvg) * 100;

//   let direction;
//   if (change > 5) direction = 'improving';
//   else if (change < -5) direction = 'declining';
//   else direction = 'stable';

//   return {
//     direction,
//     change: change.toFixed(1),
//     recentAvg: secondAvg,
//     previousAvg: firstAvg,
//   };
// }

// function groupByDay(attempts) {
//   const groups = {};
  
//   attempts.forEach(attempt => {
//     const date = new Date(attempt.createdAt).toISOString().split('T')[0];
//     if (!groups[date]) {
//       groups[date] = { attempts: 0, correct: 0, totalAccuracy: 0 };
//     }
//     groups[date].attempts++;
//     if (attempt.sentenceCorrect) groups[date].correct++;
//     groups[date].totalAccuracy += attempt.sentenceAccuracy;
//   });

//   return Object.entries(groups).map(([date, stats]) => ({
//     date,
//     attempts: stats.attempts,
//     accuracy: ((stats.totalAccuracy / stats.attempts) * 100).toFixed(1),
//     successRate: ((stats.correct / stats.attempts) * 100).toFixed(1),
//   }));
// }

// function generateFeedback({ avgAccuracy, trend, topProblemLetters, avgResponseTime, correctAttempts, total }) {
//   const messages = [];
//   const recommendations = [];

//   // Performance feedback
//   if (avgAccuracy >= 0.9) {
//     messages.push("Excellent work! Your pronunciation is very strong.");
//   } else if (avgAccuracy >= 0.7) {
//     messages.push("Good progress! Keep practicing to improve accuracy.");
//   } else {
//     messages.push("Keep trying! Focus on the problem areas highlighted below.");
//   }

//   // Trend feedback
//   if (trend.direction === 'improving') {
//     messages.push(`Great job! Your accuracy improved by ${Math.abs(parseFloat(trend.change))}% recently.`);
//   } else if (trend.direction === 'declining') {
//     messages.push(`Your recent accuracy decreased by ${Math.abs(parseFloat(trend.change))}%. Let's focus on problem areas.`);
//     recommendations.push("Take more time with each sentence");
//   }

//   // Speed feedback
//   if (avgResponseTime < 2000) {
//     messages.push("Your response time is excellent!");
//   } else if (avgResponseTime > 5000) {
//     messages.push("Try to respond a bit faster as you gain confidence.");
//     recommendations.push("Practice reading sentences aloud before recording");
//   }

//   // Problem letter feedback
//   if (topProblemLetters.length > 0) {
//     const letters = topProblemLetters.slice(0, 3).map(l => l.letter).join(', ');
//     recommendations.push(`Focus extra practice on these sounds: ${letters}`);
//   }

//   // Consistency feedback
//   const successRate = (correctAttempts / total) * 100;
//   if (successRate < 50) {
//     recommendations.push("Review the pronunciation guide for difficult sounds");
//     recommendations.push("Practice in a quiet environment");
//   }

//   return {
//     messages,
//     recommendations,
//     motivationalQuote: getMotivationalMessage(avgAccuracy, trend.direction),
//   };
// }

// function getMotivationalMessage(accuracy, trend) {
//   if (accuracy >= 0.9) {
//     return "You're mastering this! Keep up the fantastic work! 🌟";
//   } else if (trend === 'improving') {
//     return "Every practice session makes you better. You're on the right track! 📈";
//   } else {
//     return "Progress takes time. Keep practicing, you've got this! 💪";
//   }
// }

import SentenceAttempt from "../models/SentenceAttempt.js";
import LetterState from "../models/LetterState.js";
import TwoLetterWordAttempt from "../models/Twoletterattempt.js";
import { SENTENCES } from "../data/sentences.js";

/* ===============================
   HELPERS (must be before exports)
================================ */
// ─── reportController.js  (getSentenceReport only — paste over old function) ───

export const getSentenceReport = async (req, res) => {
  try {
    const studentId = req.user._id;
    const timeframe = parseInt(req.query.timeframe) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);

    const attempts = await SentenceAttempt.find({
      studentId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    if (!attempts.length) return res.json({ success: true, metrics: null });

    const total        = attempts.length;
    const correct      = attempts.filter(a => a.sentenceCorrect).length;
    const avgAccuracy  = attempts.reduce((s, a) => s + (a.sentenceAccuracy  || 0), 0) / total;
    const avgRT        = attempts.reduce((s, a) => s + (a.responseTimeMs    || 0), 0) / total;

    // ── Eye-tracking aggregates ─────────────────────────────────
    const eyeAttempts  = attempts.filter(a => a.visualScore > 0);
    const avgVisual    = eyeAttempts.length
      ? eyeAttempts.reduce((s, a) => s + (a.visualScore || 0), 0) / eyeAttempts.length
      : 0;
    const hardCount    = attempts.filter(a => a.visualIsHard).length;
    const eyeTracked   = eyeAttempts.length;

    // Visual hesitation level label
    const hesitationLevel =
      avgVisual < 0.3 ? "Low"
      : avgVisual < 0.6 ? "Moderate"
      : "High";

    // ── Trend (>= 2 attempts) ───────────────────────────────────
    let trend = { direction: "insufficient_data", change: 0, recentAccuracy: 0, previousAvg: 0 };
    if (attempts.length >= 2) {
      const half      = Math.floor(attempts.length / 2);
      const firstAvg  = attempts.slice(0, half).reduce((s, a) => s + (a.sentenceAccuracy || 0), 0) / half;
      const secondAvg = attempts.slice(half).reduce((s, a) => s + (a.sentenceAccuracy || 0), 0) / (attempts.length - half);
      const change    = firstAvg === 0 ? 0 : ((secondAvg - firstAvg) / firstAvg) * 100;
      trend = {
        direction:      change > 5 ? "improving" : change < -5 ? "declining" : "stable",
        change:         change.toFixed(1),
        recentAccuracy: (secondAvg * 100).toFixed(1),
        previousAvg:    firstAvg,
      };
    }

    // ── Problem letters ─────────────────────────────────────────
    const letterFreq = {};
    attempts.forEach(a => (a.problemLetters || []).forEach(l => {
      letterFreq[l] = (letterFreq[l] || 0) + 1;
    }));
    const problemLetters = Object.entries(letterFreq)
      .sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([letter, count]) => ({
        letter,
        errorCount: count,
        errorRate: ((count / total) * 100).toFixed(1),
      }));

    // ── Difficult sentences ──────────────────────────────────────
    const sentenceStats = {};
    attempts.forEach(a => {
      if (!sentenceStats[a.sentenceId])
        sentenceStats[a.sentenceId] = { attempts: 0, correct: 0, totalTime: 0, totalVisual: 0, visualCount: 0, expected: a.expected };
      const s = sentenceStats[a.sentenceId];
      s.attempts++;
      if (a.sentenceCorrect) s.correct++;
      s.totalTime   += (a.responseTimeMs || 0);
      if (a.visualScore > 0) { s.totalVisual += a.visualScore; s.visualCount++; }
    });
    const difficultSentences = Object.entries(sentenceStats)
      .map(([id, s]) => {
        // Look up actual sentence text — prefer SENTENCES data, fall back to stored `expected`
        const sentenceData = SENTENCES.find(sen => sen.id === id);
        return {
          sentenceId:  id,
          sentence:    sentenceData?.text || s.expected || id,  // ✅ actual text
          attempts:    s.attempts,
          successRate: ((s.correct / s.attempts) * 100).toFixed(1),
          avgTime:     Math.round(s.totalTime / s.attempts),
          avgVisual:   s.visualCount ? (s.totalVisual / s.visualCount).toFixed(2) : "0.00",
        };
      })
      .sort((a, b) => parseFloat(a.successRate) - parseFloat(b.successRate))
      .slice(0, 3);

    // ── Daily ────────────────────────────────────────────────────
    const groups = {};
    attempts.forEach(a => {
      const date = new Date(a.createdAt).toISOString().split("T")[0];
      if (!groups[date]) groups[date] = { attempts: 0, correct: 0, totalAccuracy: 0, totalVisual: 0, visualCount: 0 };
      const g = groups[date];
      g.attempts++;
      if (a.sentenceCorrect) g.correct++;
      g.totalAccuracy += (a.sentenceAccuracy || 0);
      if (a.visualScore > 0) { g.totalVisual += a.visualScore; g.visualCount++; }
    });
    const daily = Object.entries(groups).map(([date, g]) => ({
      date,
      attempts:    g.attempts,
      accuracy:    ((g.totalAccuracy / g.attempts) * 100).toFixed(1),
      successRate: ((g.correct / g.attempts) * 100).toFixed(1),
      avgVisual:   g.visualCount ? (g.totalVisual / g.visualCount).toFixed(2) : "0.00",
    }));

    // ── Feedback ─────────────────────────────────────────────────
    const feedback = genSentenceFeedback({
      avgAccuracy, trend, problemLetters,
      avgResponseTime: avgRT, correctAttempts: correct, total,
      avgVisual, hardCount, eyeTracked,
    });

    return res.json({
      success: true,
      metrics: {
        overview: {
          totalAttempts:      total,
          correctAttempts:    correct,
          successRate:        ((correct / total) * 100).toFixed(1),
          accuracyPercentage: (avgAccuracy * 100).toFixed(1),
          avgResponseTime:    Math.round(avgRT),
        },
        eyeTracking: {
          tracked:          eyeTracked,
          avgVisualScore:   avgVisual.toFixed(3),
          hesitationLevel,
          hardSessions:     hardCount,
          hardRate:         total > 0 ? ((hardCount / total) * 100).toFixed(1) : "0.0",
        },
        trend,
        problemLetters,
        difficultSentences,
        daily,
        feedback,
        timeframe,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// ─── Also update genSentenceFeedback to accept eye-tracking ─────
function genSentenceFeedback({ avgAccuracy, trend, problemLetters, avgResponseTime,
  correctAttempts, total, avgVisual = 0, hardCount = 0, eyeTracked = 0 }) {

  const messages        = [];
  const recommendations = [];

  // Accuracy
  if (avgAccuracy >= 0.9)      messages.push("Excellent work! Your pronunciation is very strong.");
  else if (avgAccuracy >= 0.7) messages.push("Good progress! Keep practising to improve accuracy.");
  else                         messages.push("Keep trying! Focus on the problem areas highlighted below.");

  // Trend
  if (trend.direction === "improving") {
    messages.push(`Great job! Accuracy improved by ${Math.abs(parseFloat(trend.change))}% recently.`);
  } else if (trend.direction === "declining") {
    messages.push(`Accuracy dropped by ${Math.abs(parseFloat(trend.change))}%. Let's focus on problem areas.`);
    recommendations.push("Take more time reading each sentence before recording");
  }

  // Speed
  if (avgResponseTime < 2000)      messages.push("Your response time is excellent!");
  else if (avgResponseTime > 5000) {
    messages.push("Try to respond a bit faster as you gain confidence.");
    recommendations.push("Practise reading sentences aloud before recording");
  }

  // Eye-tracking
  if (eyeTracked > 0) {
    if (avgVisual >= 0.6) {
      messages.push("Eye-tracking shows significant visual hesitation — your eyes are pausing frequently.");
      recommendations.push("Practise smooth left-to-right eye movement across sentences");
      recommendations.push("Use a finger or pointer to guide your eyes while reading");
    } else if (avgVisual >= 0.3) {
      messages.push("Moderate visual hesitation detected. Eye movement is developing.");
      recommendations.push("Try reading sentences in larger font to reduce tracking effort");
    } else {
      messages.push("Great eye movement! Minimal visual hesitation detected.");
    }

    if (hardCount > 0) {
      recommendations.push(`${hardCount} session${hardCount>1?"s":""} flagged as visually hard — consider practising those sentences again`);
    }
  }

  // Problem letters
  if (problemLetters.length > 0) {
    recommendations.push(`Focus on these sounds: ${problemLetters.slice(0, 3).map(l => l.letter).join(", ")}`);
  }

  // Low accuracy
  if ((correctAttempts / total) * 100 < 50) {
    recommendations.push("Review the pronunciation guide for difficult sounds");
    recommendations.push("Practise in a quiet environment to reduce distractions");
  }

  const motivationalQuote =
    avgAccuracy >= 0.9      ? "You're mastering this! Keep up the fantastic work! 🌟"
    : trend.direction === "improving"
    ? "Every practice session makes you better. You're on the right track! 📈"
    : "Progress takes time. Keep practising, you've got this! 💪";

  return { messages, recommendations, motivationalQuote };
}

/* ===============================
   DASHBOARD SUMMARY
================================ */
export const getDashboardSummary = async (req, res) => {
  try {
    const studentId = req.user._id;
    const timeframe = parseInt(req.query.timeframe) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);

    const [sentenceAttempts, wordAttempts, letterStates] = await Promise.all([
      SentenceAttempt.find({ studentId, createdAt: { $gte: startDate } }),
      TwoLetterWordAttempt.find({ studentId, createdAt: { $gte: startDate } }),
      LetterState.find({ studentId })
    ]);

    return res.json({
      success: true,
      summary: {
        sentences: sentenceAttempts.length
          ? {
              total: sentenceAttempts.length,
              successRate: (
                (sentenceAttempts.filter(a => a.sentenceCorrect).length /
                  sentenceAttempts.length) * 100
              ).toFixed(1)
            }
          : null,
        words: wordAttempts.length
          ? {
              total: wordAttempts.length,
              successRate: (
                (wordAttempts.filter(a => a.wordCorrect).length /
                  wordAttempts.length) * 100
              ).toFixed(1)
            }
          : null,
        letters: letterStates.length
          ? {
              total: letterStates.length,
              avgStrength: (
                (letterStates.reduce((s, l) => s + l.avgReward, 0) /
                  letterStates.length) * 100
              ).toFixed(1)
            }
          : null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ===============================
   WORD REPORT
================================ */
export const getWordReport = async (req, res) => {
  try {
    const studentId = req.user._id;
    const timeframe = parseInt(req.query.timeframe) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);

    const attempts = await TwoLetterWordAttempt.find({
      studentId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    if (!attempts.length) return res.json({ success: true, metrics: null });

    const total = attempts.length;
    const correct = attempts.filter(a => a.wordCorrect).length;
    const avgResponseTime = attempts.reduce((s, a) => s + (a.responseTimeMs || 0), 0) / total;

    // Trend
    let trend = { direction: "insufficient_data", change: 0, recentAccuracy: 0, previousAvg: 0 };
    if (attempts.length >= 2) {
      const half = Math.floor(attempts.length / 2);
      const firstRate = attempts.slice(0, half).filter(a => a.wordCorrect).length / half;
      const secondRate = attempts.slice(half).filter(a => a.wordCorrect).length / (attempts.length - half);
      const change = firstRate === 0 ? 0 : ((secondRate - firstRate) / firstRate) * 100;
      trend = {
        direction: change > 5 ? "improving" : change < -5 ? "declining" : "stable",
        change: change.toFixed(1),
        recentAccuracy: (secondRate * 100).toFixed(1),
        previousAvg: firstRate,
      };
    }

    // Problem words
    const wordFreq = {};
    attempts.forEach(a => { if (!a.wordCorrect) wordFreq[a.expected] = (wordFreq[a.expected] || 0) + 1; });
    const problemWords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([word, count]) => ({ word, errorCount: count, errorRate: ((count / total) * 100).toFixed(1) }));

    // Problem letters
    const letterFreq = {};
    attempts.forEach(a => (a.problemLetters || []).forEach(l => { letterFreq[l] = (letterFreq[l] || 0) + 1; }));
    const problemLetters = Object.entries(letterFreq)
      .sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([letter, count]) => ({ letter, errorCount: count, errorRate: ((count / total) * 100).toFixed(1) }));

    // Daily
    const groups = {};
    attempts.forEach(a => {
      const date = new Date(a.createdAt).toISOString().split("T")[0];
      if (!groups[date]) groups[date] = { attempts: 0, correct: 0 };
      groups[date].attempts++;
      if (a.wordCorrect) groups[date].correct++;
    });
    const daily = Object.entries(groups).map(([date, s]) => ({
      date,
      attempts: s.attempts,
      successRate: ((s.correct / s.attempts) * 100).toFixed(1),
    }));

    return res.json({
      success: true,
      metrics: {
        overview: {
          totalAttempts: total,
          correctAttempts: correct,
          successRate: ((correct / total) * 100).toFixed(1),
          avgResponseTime: Math.round(avgResponseTime),
        },
        trend,
        problemWords,
        problemLetters,
        daily,
        timeframe,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ===============================
   LETTER REPORT
================================ */
export const getLetterReport = async (req, res) => {
  try {
    const studentId = req.user._id;

    const letterStates = await LetterState.find({ studentId }).sort({ avgReward: 1 });

    if (!letterStates.length) return res.json({ success: true, metrics: null });

    const totalAttempts = letterStates.reduce((sum, ls) => sum + ls.pulls, 0);
    const avgStrength = letterStates.reduce((sum, ls) => sum + ls.avgReward, 0) / letterStates.length;

    return res.json({
      success: true,
      metrics: {
        overview: {
          totalLettersPracticed: letterStates.length,
          totalAttempts,
          avgStrength: (avgStrength * 100).toFixed(1)
        },
        letters: letterStates.map(ls => ({
          letter: ls.letter,
          strength: (ls.avgReward * 100).toFixed(1),
          attempts: ls.pulls
        }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ===============================
   SENTENCE REPORT
================================ */
// // ─── reportController.js  (getSentenceReport only — paste over old function) ───

// export const getSentenceReport = async (req, res) => {
//   try {
//     const studentId = req.user._id;
//     const timeframe = parseInt(req.query.timeframe) || 7;
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - timeframe);

//     const attempts = await SentenceAttempt.find({
//       studentId,
//       createdAt: { $gte: startDate }
//     }).sort({ createdAt: 1 });

//     if (!attempts.length) return res.json({ success: true, metrics: null });

//     const total        = attempts.length;
//     const correct      = attempts.filter(a => a.sentenceCorrect).length;
//     const avgAccuracy  = attempts.reduce((s, a) => s + (a.sentenceAccuracy  || 0), 0) / total;
//     const avgRT        = attempts.reduce((s, a) => s + (a.responseTimeMs    || 0), 0) / total;

//     // ── Eye-tracking aggregates ─────────────────────────────────
//     const eyeAttempts  = attempts.filter(a => a.visualScore > 0);
//     const avgVisual    = eyeAttempts.length
//       ? eyeAttempts.reduce((s, a) => s + (a.visualScore || 0), 0) / eyeAttempts.length
//       : 0;
//     const hardCount    = attempts.filter(a => a.visualIsHard).length;
//     const eyeTracked   = eyeAttempts.length;

//     // Visual hesitation level label
//     const hesitationLevel =
//       avgVisual < 0.3 ? "Low"
//       : avgVisual < 0.6 ? "Moderate"
//       : "High";

//     // ── Trend (>= 2 attempts) ───────────────────────────────────
//     let trend = { direction: "insufficient_data", change: 0, recentAccuracy: 0, previousAvg: 0 };
//     if (attempts.length >= 2) {
//       const half      = Math.floor(attempts.length / 2);
//       const firstAvg  = attempts.slice(0, half).reduce((s, a) => s + (a.sentenceAccuracy || 0), 0) / half;
//       const secondAvg = attempts.slice(half).reduce((s, a) => s + (a.sentenceAccuracy || 0), 0) / (attempts.length - half);
//       const change    = firstAvg === 0 ? 0 : ((secondAvg - firstAvg) / firstAvg) * 100;
//       trend = {
//         direction:      change > 5 ? "improving" : change < -5 ? "declining" : "stable",
//         change:         change.toFixed(1),
//         recentAccuracy: (secondAvg * 100).toFixed(1),
//         previousAvg:    firstAvg,
//       };
//     }

//     // ── Problem letters ─────────────────────────────────────────
//     const letterFreq = {};
//     attempts.forEach(a => (a.problemLetters || []).forEach(l => {
//       letterFreq[l] = (letterFreq[l] || 0) + 1;
//     }));
//     const problemLetters = Object.entries(letterFreq)
//       .sort(([, a], [, b]) => b - a).slice(0, 5)
//       .map(([letter, count]) => ({
//         letter,
//         errorCount: count,
//         errorRate: ((count / total) * 100).toFixed(1),
//       }));

//     // ── Difficult sentences ──────────────────────────────────────
//     const sentenceStats = {};
//     attempts.forEach(a => {
//       if (!sentenceStats[a.sentenceId])
//         sentenceStats[a.sentenceId] = { attempts: 0, correct: 0, totalTime: 0, totalVisual: 0, visualCount: 0 };
//       const s = sentenceStats[a.sentenceId];
//       s.attempts++;
//       if (a.sentenceCorrect) s.correct++;
//       s.totalTime   += (a.responseTimeMs || 0);
//       if (a.visualScore > 0) { s.totalVisual += a.visualScore; s.visualCount++; }
//     });
//     const difficultSentences = Object.entries(sentenceStats)
//       .map(([id, s]) => ({
//         sentence:     id,
//         attempts:     s.attempts,
//         successRate:  ((s.correct / s.attempts) * 100).toFixed(1),
//         avgTime:      Math.round(s.totalTime / s.attempts),
//         avgVisual:    s.visualCount ? (s.totalVisual / s.visualCount).toFixed(2) : "0.00",
//       }))
//       .sort((a, b) => parseFloat(a.successRate) - parseFloat(b.successRate))
//       .slice(0, 3);

//     // ── Daily ────────────────────────────────────────────────────
//     const groups = {};
//     attempts.forEach(a => {
//       const date = new Date(a.createdAt).toISOString().split("T")[0];
//       if (!groups[date]) groups[date] = { attempts: 0, correct: 0, totalAccuracy: 0, totalVisual: 0, visualCount: 0 };
//       const g = groups[date];
//       g.attempts++;
//       if (a.sentenceCorrect) g.correct++;
//       g.totalAccuracy += (a.sentenceAccuracy || 0);
//       if (a.visualScore > 0) { g.totalVisual += a.visualScore; g.visualCount++; }
//     });
//     const daily = Object.entries(groups).map(([date, g]) => ({
//       date,
//       attempts:    g.attempts,
//       accuracy:    ((g.totalAccuracy / g.attempts) * 100).toFixed(1),
//       successRate: ((g.correct / g.attempts) * 100).toFixed(1),
//       avgVisual:   g.visualCount ? (g.totalVisual / g.visualCount).toFixed(2) : "0.00",
//     }));

//     // ── Feedback ─────────────────────────────────────────────────
//     const feedback = genSentenceFeedback({
//       avgAccuracy, trend, problemLetters,
//       avgResponseTime: avgRT, correctAttempts: correct, total,
//       avgVisual, hardCount, eyeTracked,
//     });

//     return res.json({
//       success: true,
//       metrics: {
//         overview: {
//           totalAttempts:      total,
//           correctAttempts:    correct,
//           successRate:        ((correct / total) * 100).toFixed(1),
//           accuracyPercentage: (avgAccuracy * 100).toFixed(1),
//           avgResponseTime:    Math.round(avgRT),
//         },
//         eyeTracking: {
//           tracked:          eyeTracked,
//           avgVisualScore:   avgVisual.toFixed(3),
//           hesitationLevel,
//           hardSessions:     hardCount,
//           hardRate:         total > 0 ? ((hardCount / total) * 100).toFixed(1) : "0.0",
//         },
//         trend,
//         problemLetters,
//         difficultSentences,
//         daily,
//         feedback,
//         timeframe,
//       }
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

