import StudentTherapist from "../models/StudentTherapist.js";
import User from "../models/User.js";
import SentenceAttempt from "../models/SentenceAttempt.js";
import TwoLetterWordAttempt from "../models/Twoletterattempt.js";
import LetterState from "../models/LetterState.js";

/* ================================
   GET LIST OF STUDENTS FOR THERAPIST
================================ */
export const getTherapistStudents = async (req, res) => {
  try {
    const therapistId = req.user._id;

    const students = await StudentTherapist.find({ therapistId })
      .populate({
        path: "studentId",
        select: "name email age lastActive createdAt _id"
      })
      .lean();

    const studentList = students.map(rel => ({
      ...rel.studentId,
      assignedDate: rel.createdAt
    }));

    return res.json({
      success: true,
      students: studentList
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   GET STUDENT DETAILS
================================ */
export const getStudentDetail = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { studentId } = req.params;

    // Verify therapist has access to this student
    const relationship = await StudentTherapist.findOne({
      therapistId,
      studentId
    });

    if (!relationship) {
      return res.status(403).json({ error: "Access denied" });
    }

    const student = await User.findById(studentId).select("name email role age lastActive createdAt _id");

    return res.json({
      success: true,
      student
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   GET STUDENT DASHBOARD SUMMARY
================================ */
export const getStudentDashboardSummary = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { studentId } = req.params;
    const timeframe = parseInt(req.query.timeframe) || 7;

    // Verify therapist has access to this student
    const relationship = await StudentTherapist.findOne({
      therapistId,
      studentId
    });

    if (!relationship) {
      return res.status(403).json({ error: "Access denied" });
    }

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

/* ================================
   GET STUDENT WORD REPORT
================================ */
export const getStudentWordReport = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { studentId } = req.params;

    // Verify therapist has access to this student
    const relationship = await StudentTherapist.findOne({
      therapistId,
      studentId
    });

    if (!relationship) {
      return res.status(403).json({ error: "Access denied" });
    }

    const attempts = await TwoLetterWordAttempt.find({ studentId });

    if (!attempts.length) {
      return res.json({
        success: true,
        data: {
          total: 0,
          correct: 0,
          successRate: 0,
          avgAccuracy: 0,
          attempts: []
        }
      });
    }

    const total = attempts.length;
    const correct = attempts.filter(a => a.wordCorrect).length;
    const avgAccuracy =
      attempts.reduce((sum, a) => sum + (a.wordAccuracy || 0), 0) / total;

    return res.json({
      success: true,
      data: {
        total,
        correct,
        successRate: ((correct / total) * 100).toFixed(1),
        avgAccuracy: (avgAccuracy * 100).toFixed(1),
        attempts: attempts.map(a => ({
          word: a.expected || "",
          spoken: a.transcript || "",
          correct: a.wordCorrect,
          accuracy: ((a.wordAccuracy || 0) * 100).toFixed(1),
          date: a.createdAt
        }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   GET STUDENT SENTENCE REPORT
================================ */
export const getStudentSentenceReport = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { studentId } = req.params;

    // Verify therapist has access to this student
    const relationship = await StudentTherapist.findOne({
      therapistId,
      studentId
    });

    if (!relationship) {
      return res.status(403).json({ error: "Access denied" });
    }

    const attempts = await SentenceAttempt.find({ studentId });

    if (!attempts.length) {
      return res.json({
        success: true,
        data: {
          total: 0,
          correct: 0,
          successRate: 0,
          avgAccuracy: 0,
          attempts: []
        }
      });
    }

    const total = attempts.length;
    const correct = attempts.filter(a => a.sentenceCorrect).length;
    const avgAccuracy =
      attempts.reduce((sum, a) => sum + (a.sentenceAccuracy || 0), 0) / total;

    return res.json({
      success: true,
      data: {
        total,
        correct,
        successRate: ((correct / total) * 100).toFixed(1),
        avgAccuracy: (avgAccuracy * 100).toFixed(1),
        attempts: attempts.map(a => ({
          sentence: a.expected || "",
          spoken: a.spoken || "",
          correct: a.sentenceCorrect,
          accuracy: ((a.sentenceAccuracy || 0) * 100).toFixed(1),
          responseTime: a.responseTimeMs,
          date: a.createdAt
        }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   GET STUDENT LETTER REPORT
================================ */
export const getStudentLetterReport = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { studentId } = req.params;

    // Verify therapist has access to this student
    const relationship = await StudentTherapist.findOne({
      therapistId,
      studentId
    });

    if (!relationship) {
      return res.status(403).json({ error: "Access denied" });
    }

    const letterStates = await LetterState.find({ studentId });

    if (!letterStates.length) {
      return res.json({
        success: true,
        data: {
          letters: []
        }
      });
    }

    const letterData = letterStates.map(l => ({
      letter: l.letter,
      strength: (l.avgReward * 100).toFixed(1),
      attempts: l.pulls,
      successes: l.successes
    }));

    return res.json({
      success: true,
      data: {
        letters: letterData
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   ASSIGN STUDENT TO THERAPIST
================================ */
export const assignStudentToTherapist = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { studentId } = req.body;

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(400).json({ error: "Invalid student" });
    }

    // Check if already assigned
    const existing = await StudentTherapist.findOne({
      therapistId,
      studentId
    });

    if (existing) {
      return res.status(400).json({ error: "Student already assigned" });
    }

    const assignment = await StudentTherapist.create({
      therapistId,
      studentId
    });

    return res.json({
      success: true,
      message: "Student assigned successfully",
      assignment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   REMOVE STUDENT FROM THERAPIST
================================ */
export const removeStudentFromTherapist = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { studentId } = req.params;

    const result = await StudentTherapist.findOneAndDelete({
      therapistId,
      studentId
    });

    if (!result) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    return res.json({
      success: true,
      message: "Student removed successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
