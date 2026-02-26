import mongoose from 'mongoose';
import Question from '../models/Question.js';
import StudentAttempt from '../models/StudentAttempt.js';
import Round from '../models/Round.js';

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Fisher-Yates in-place shuffle.
 * Returns the same array (mutated) for convenience.
 * @param {Array} array
 * @returns {Array}
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ─── GET /api/quiz/questions ──────────────────────────────────────────────────

export const getQuestions = async (req, res) => {
  try {
    // 1️⃣ Find the currently published round
    const round = await Round.findOne({ isPublished: true }).lean();
    if (!round) {
      return res.status(400).json({ message: 'No active round available. Please wait for the admin to publish a round.' });
    }

    // 2️⃣ Fetch all questions belonging to this round
    const allQuestions = await Question.find({ roundId: round._id }).lean();

    if (allQuestions.length < round.totalQuestions) {
      return res.status(400).json({
        message: `Not enough questions in this round. Required: ${round.totalQuestions}, available: ${allQuestions.length}`
      });
    }

    // 3️⃣ Fisher-Yates shuffle on full pool, then slice to totalQuestions
    const selectedQuestions = shuffleArray([...allQuestions]).slice(0, round.totalQuestions);

    // 4️⃣ Return questions (options already shuffled at import time)
    const questionsForClient = selectedQuestions.map((q) => ({
      _id:          q._id,
      questionText: q.questionText,
      options:      q.options
      // correctAnswer intentionally omitted — never sent to client
    }));

    // 5️⃣ Return round metadata + questions
    return res.status(200).json({
      roundName:      round.name,
      duration:       round.duration,
      totalQuestions: round.totalQuestions,
      questions:      questionsForClient
    });
  } catch (error) {
    console.error('getQuestions error:', error);
    return res.status(500).json({ message: 'Server error while fetching questions' });
  }
};

// POST /api/quiz/start
export const startQuiz = async (req, res) => {
  try {
    const { name, tokenNo } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Student name is required' });
    }
    if (!tokenNo || tokenNo.trim() === '') {
      return res.status(400).json({ message: 'Token number is required' });
    }

    // Attach the currently published round to this attempt
    const activeRound = await Round.findOne({ isPublished: true }).lean();

    // Block re-entry only if an active (non-reset) attempt exists for this round
    if (activeRound) {
      const existingForRound = await StudentAttempt.findOne({
        tokenNo: tokenNo.trim(),
        roundId: activeRound._id,
        isReset: false,
      });
      if (existingForRound) {
        return res.status(400).json({ message: 'Attempt already exists for this round.' });
      }
    }

    const attempt = new StudentAttempt({
      name: name.trim(),
      tokenNo: tokenNo.trim(),
      roundId: activeRound ? activeRound._id : undefined,
      answers: [],
      attempted: 0,
      correct: 0,
      score: 0,
      violationCount: 0,
      terminated: false,
      startTime: new Date()
    });

    const saved = await attempt.save();

    return res.status(201).json({ attemptId: saved._id });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('startQuiz error:', error);
    return res.status(500).json({ message: 'Server error while starting quiz' });
  }
};

// POST /api/quiz/submit
export const submitQuiz = async (req, res) => {
  try {
    const {
      name,
      tokenNo,
      answers,
      terminated    = false,
      violationCount = 0
    } = req.body;

    // --- Basic validation ---
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Student name is required' });
    }
    if (!tokenNo || tokenNo.trim() === '') {
      return res.status(400).json({ message: 'Token number is required' });
    }
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers must be an array' });
    }

    // --- Find the existing attempt created by startQuiz ---
    const existingAttempt = await StudentAttempt.findOne({ tokenNo: tokenNo.trim(), isReset: false });
    if (!existingAttempt) {
      return res.status(404).json({ message: 'No active quiz session found for this token number' });
    }
    if (existingAttempt.submitTime) {
      return res.status(400).json({ message: 'This quiz has already been submitted' });
    }

    // --- Score calculation (server-side only) ---
    let attempted = 0;
    let correct   = 0;
    let score     = 0;
    const selectedOptions = [];

    const normalize = (str) => String(str).trim().toLowerCase().replace(/\s+/g, ' ');

    if (answers.length > 0) {
      // Validate answer entries
      const invalidEntry = answers.find(
        (a) =>
          !a.questionId ||
          !mongoose.Types.ObjectId.isValid(a.questionId) ||
          a.selectedOption === undefined ||
          a.selectedOption === null ||
          String(a.selectedOption).trim() === ''
      );

      if (invalidEntry) {
        return res.status(400).json({
          message: 'Each answer must have a valid questionId and a non-empty selectedOption string'
        });
      }

      const questionIds = answers.map((a) => a.questionId);

      const dbQuestions = await Question.find(
        { _id: { $in: questionIds } },
        { correctAnswer: 1, marks: 1 }
      );

      const questionMap = new Map(
        dbQuestions.map((q) => [q._id.toString(), { correctAnswer: q.correctAnswer, marks: q.marks }])
      );

      for (const answer of answers) {
        const qData = questionMap.get(answer.questionId.toString());
        if (!qData) continue;

        attempted++;
        selectedOptions.push(answer.selectedOption);

        if (normalize(answer.selectedOption) === normalize(qData.correctAnswer)) {
          correct++;
          score += qData.marks;
        }
      }
    }

    // --- Update the existing StudentAttempt ---
    const submitTime = new Date();
    const timeTaken  = existingAttempt.startTime
      ? Math.floor((submitTime - existingAttempt.startTime) / 1000)
      : null;

    existingAttempt.answers        = selectedOptions;
    existingAttempt.attempted      = attempted;
    existingAttempt.correct        = correct;
    existingAttempt.score          = score;
    existingAttempt.violationCount = typeof violationCount === 'number' ? Math.floor(violationCount) : 0;
    existingAttempt.terminated     = Boolean(terminated);
    existingAttempt.submitTime     = submitTime;
    existingAttempt.timeTaken      = timeTaken;

    await existingAttempt.save();

    // --- Fetch round metadata for response ---
    let roundName      = null;
    let totalQuestions = attempted; // fallback
    if (existingAttempt.roundId) {
      const round = await Round.findById(existingAttempt.roundId, { name: 1, totalQuestions: 1 }).lean();
      if (round) {
        roundName      = round.name;
        totalQuestions = round.totalQuestions;
      }
    }

    // percentage based on max possible score (1 mark × totalQuestions), rounded to 2dp
    const percentage = totalQuestions > 0
      ? Math.round((score / totalQuestions) * 100 * 100) / 100
      : 0;

    return res.status(200).json({
      roundName,
      score,
      correct,
      attempted,
      totalQuestions,
      percentage,
      timeTaken,
      terminated: Boolean(terminated),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('submitQuiz error:', error);
    return res.status(500).json({ message: 'Server error while submitting quiz' });
  }
};
