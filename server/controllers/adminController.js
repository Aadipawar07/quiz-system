import Question from '../models/Question.js';
import StudentAttempt from '../models/StudentAttempt.js';
import Round from '../models/Round.js';
import XLSX from 'xlsx';
import jwt from 'jsonwebtoken';

// POST /api/admin/login  (public — no auth middleware)
export const adminLogin = (req, res) => {
  const { username, password } = req.body;

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  const token = jwt.sign(
    { role: 'admin', username },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  return res.status(200).json({ token });
};

// POST /api/admin/add-question
export const addQuestion = async (req, res) => {
  try {
    const { roundId, questionText, options, correctAnswer, marks } = req.body;

    // --- Validation ---
    if (!roundId) {
      return res.status(400).json({ message: 'roundId is required' });
    }

    if (!questionText || questionText.trim() === '') {
      return res.status(400).json({ message: 'questionText is required' });
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ message: 'options must be an array of exactly 4 strings' });
    }

    if (!correctAnswer || typeof correctAnswer !== 'string' || correctAnswer.trim() === '') {
      return res.status(400).json({ message: 'correctAnswer is required and must be a string' });
    }

    const normalize = (str) => str.trim().toLowerCase().replace(/\s+/g, ' ');
    const isValid = options.some((opt) => normalize(String(opt)) === normalize(correctAnswer));
    if (!isValid) {
      return res.status(400).json({ message: 'correctAnswer does not match any option' });
    }

    // --- Save to DB ---
    const question = new Question({
      roundId,
      questionText: questionText.trim(),
      options,
      correctAnswer: correctAnswer.trim(),
      ...(marks !== undefined && { marks })
    });

    const saved = await question.save();

    return res.status(201).json({
      message: 'Question added successfully',
      questionId: saved._id
    });
  } catch (error) {
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('addQuestion error:', error);
    return res.status(500).json({ message: 'Server error while adding question' });
  }
};

// GET /api/admin/results
export const getResults = async (req, res) => {
  try {
    const results = await StudentAttempt.find({})
      .sort({ score: -1 })
      .lean();

    return res.status(200).json(results);
  } catch (error) {
    console.error('getResults error:', error);
    return res.status(500).json({ message: 'Server error while fetching results' });
  }
};

// GET /api/admin/export
export const exportResults = async (req, res) => {
  try {
    const attempts = await StudentAttempt.find({})
      .sort({ score: -1 })
      .lean();

    if (attempts.length === 0) {
      return res.status(404).json({ message: 'No submissions found to export' });
    }

    // Extract only the required fields
    const data = attempts.map((a, index) => ({
      'S.No':       index + 1,
      'Name':       a.name,
      'Token No':   a.tokenNo,
      'Attempted':  a.attempted,
      'Correct':    a.correct,
      'Score':      a.score,
      'Terminated': a.terminated ? 'Yes' : 'No',
      'Violations': a.violationCount,
      'Start Time': a.startTime ? new Date(a.startTime).toLocaleString() : 'N/A',
      'Submit Time': a.submitTime ? new Date(a.submitTime).toLocaleString() : 'N/A'
    }));

    // Build workbook in memory — no disk write
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.max(key.length, ...data.map((row) => String(row[key]).length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=quiz-results.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);

    return res.status(200).end(buffer);
  } catch (error) {
    console.error('exportResults error:', error);
    return res.status(500).json({ message: 'Server error while exporting results' });
  }
};

// POST /api/admin/create-round
export const createRound = async (req, res) => {
  try {
    const { name, duration, totalQuestions } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ message: 'Round name is required' });
    }
    if (!duration || isNaN(Number(duration)) || Number(duration) < 1) {
      return res.status(400).json({ message: 'Duration must be a positive number (in minutes)' });
    }
    if (!totalQuestions || isNaN(Number(totalQuestions)) || Number(totalQuestions) < 1) {
      return res.status(400).json({ message: 'totalQuestions must be a positive number' });
    }

    const round = new Round({
      name: String(name).trim(),
      duration: Number(duration),
      totalQuestions: Number(totalQuestions),
      isPublished: false
    });

    const saved = await round.save();
    return res.status(201).json({ message: 'Round created successfully', round: saved });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('createRound error:', error);
    return res.status(500).json({ message: 'Server error while creating round' });
  }
};

// POST /api/admin/publish-round/:roundId
export const publishRound = async (req, res) => {
  try {
    const { roundId } = req.params;

    const target = await Round.findById(roundId);
    if (!target) {
      return res.status(404).json({ message: 'Round not found' });
    }

    // Unpublish all rounds first, then publish only the selected one
    await Round.updateMany({}, { isPublished: false });
    target.isPublished = true;
    await target.save();

    return res.status(200).json({ message: `Round "${target.name}" is now live`, round: target });
  } catch (error) {
    console.error('publishRound error:', error);
    return res.status(500).json({ message: 'Server error while publishing round' });
  }
};

// GET /api/admin/rounds
export const getRounds = async (req, res) => {
  try {
    const rounds = await Round.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json(rounds);
  } catch (error) {
    console.error('getRounds error:', error);
    return res.status(500).json({ message: 'Server error while fetching rounds' });
  }
};

// GET /api/admin/leaderboard/:roundId
export const getLeaderboard = async (req, res) => {
  try {
    const { roundId } = req.params;

    const round = await Round.findById(roundId).lean();
    if (!round) {
      return res.status(404).json({ message: `Round not found: ${roundId}` });
    }

    const attempts = await StudentAttempt.find(
      { roundId, terminated: false, isReset: false },
      { name: 1, tokenNo: 1, score: 1, correct: 1, attempted: 1, timeTaken: 1, submitTime: 1 }
    )
      .sort({ score: -1, timeTaken: 1, submitTime: 1 })
      .lean();

    return res.status(200).json(attempts);
  } catch (error) {
    console.error('getLeaderboard error:', error);
    return res.status(500).json({ message: 'Server error while fetching leaderboard' });
  }
};

// GET /api/admin/participants/:roundId
export const getParticipants = async (req, res) => {
  try {
    const { roundId } = req.params;

    const round = await Round.findById(roundId).lean();
    if (!round) {
      return res.status(404).json({ message: `Round not found: ${roundId}` });
    }

    const participants = await StudentAttempt.find(
      { roundId, isReset: false },
      {
        name: 1, tokenNo: 1, attempted: 1, correct: 1, score: 1,
        violationCount: 1, terminated: 1, startTime: 1, submitTime: 1
      }
    )
      .sort({ startTime: 1 })
      .lean();

    return res.status(200).json(participants);
  } catch (error) {
    console.error('getParticipants error:', error);
    return res.status(500).json({ message: 'Server error while fetching participants' });
  }
};

// DELETE /api/admin/question/:questionId
export const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: `Question not found: ${questionId}` });
    }

    await question.deleteOne();

    return res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('deleteQuestion error:', error);
    return res.status(500).json({ message: 'Server error while deleting question' });
  }
};

// GET /api/admin/questions/:roundId
export const getQuestionsByRound = async (req, res) => {
  try {
    const { roundId } = req.params;

    const round = await Round.findById(roundId).lean();
    if (!round) {
      return res.status(404).json({ message: `Round not found: ${roundId}` });
    }

    const questions = await Question.find(
      { roundId },
      { questionText: 1, options: 1, correctAnswer: 1, marks: 1 }
    )
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json(questions);
  } catch (error) {
    console.error('getQuestionsByRound error:', error);
    return res.status(500).json({ message: 'Server error while fetching questions' });
  }
};

// DELETE /api/admin/round/:roundId
export const deleteRound = async (req, res) => {
  try {
    const { roundId } = req.params;

    const round = await Round.findById(roundId);
    if (!round) {
      return res.status(404).json({ message: `Round not found: ${roundId}` });
    }

    if (round.isPublished) {
      return res.status(400).json({
        message: 'Cannot delete a published (live) round. Publish a different round first, then delete this one.',
      });
    }

    // Cascade-delete all related data
    await Question.deleteMany({ roundId });
    await StudentAttempt.deleteMany({ roundId });
    await round.deleteOne();

    return res.status(200).json({ message: 'Round and related data deleted successfully' });
  } catch (error) {
    console.error('deleteRound error:', error);
    return res.status(500).json({ message: 'Server error while deleting round' });
  }
};

// POST /api/admin/reset-attempt
export const resetAttempt = async (req, res) => {
  try {
    const { tokenNo, roundId } = req.body;

    if (!tokenNo || !roundId) {
      return res.status(400).json({ message: 'tokenNo and roundId are required' });
    }

    const attempt = await StudentAttempt.findOne({
      tokenNo: tokenNo.trim(),
      roundId,
      isReset: false,
    });

    if (!attempt) {
      return res.status(404).json({
        message: 'No active attempt found for this student in the specified round',
      });
    }

    attempt.isReset = true;
    await attempt.save();

    return res.status(200).json({ message: 'Attempt reset successfully' });
  } catch (error) {
    console.error('resetAttempt error:', error);
    return res.status(500).json({ message: 'Server error while resetting attempt' });
  }
};

// POST /api/admin/import-questions/:roundId
export const importQuestions = async (req, res) => {
  try {
    const { roundId } = req.params;

    // 1. Validate the round exists
    const round = await Round.findById(roundId).lean();
    if (!round) {
      return res.status(404).json({ message: `Round not found: ${roundId}` });
    }

    // 2. Ensure a file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded. Attach a .xlsx file as multipart field "file".' });
    }

    // 3. Parse the xlsx buffer — never touches disk
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return res.status(400).json({ message: 'The uploaded Excel file has no sheets.' });
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rows.length) {
      return res.status(400).json({ message: 'The Excel sheet is empty. No questions to import.' });
    }

    // 4. Validate every row before inserting anything
    const errors = [];
    const questions = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2; // row 1 is the header
      const rowErrors = [];

      const questionText = String(row.questionText || '').trim();
      const option1      = String(row.option1 || '').trim();
      const option2      = String(row.option2 || '').trim();
      const option3      = String(row.option3 || '').trim();
      const option4      = String(row.option4 || '').trim();
      const correctRaw   = row.correctAnswer;
      const marksRaw     = row.marks;

      if (!questionText)      rowErrors.push('questionText is required');
      if (!option1)           rowErrors.push('option1 is required');
      if (!option2)           rowErrors.push('option2 is required');
      if (!option3)           rowErrors.push('option3 is required');
      if (!option4)           rowErrors.push('option4 is required');

      const correctAnswer = String(correctRaw ?? '').trim();
      if (!correctAnswer) {
        rowErrors.push('correctAnswer is required');
      } else {
        const normalize = (str) => str.trim().toLowerCase().replace(/\s+/g, ' ');
        const options = [option1, option2, option3, option4];
        const isValid = options.some((opt) => normalize(opt) === normalize(correctAnswer));
        if (!isValid) {
          rowErrors.push('correctAnswer does not match any option');
        }
      }

      const marks = marksRaw !== '' && marksRaw !== undefined ? Number(marksRaw) : 1;
      if (isNaN(marks) || marks < 1) {
        rowErrors.push(`marks must be a positive number (got: ${JSON.stringify(marksRaw)})`);
      }

      if (rowErrors.length) {
        errors.push({ row: rowNum, errors: rowErrors });
      } else {
        const options = [option1, option2, option3, option4];
        options.sort(() => Math.random() - 0.5);

        questions.push({
          roundId,
          questionText,
          options,
          correctAnswer,
          marks,
        });
      }
    });

    // 5. Reject everything if any row is invalid
    if (errors.length) {
      return res.status(400).json({
        message: `Import failed: ${errors.length} row(s) have validation errors. Nothing was inserted.`,
        errors,
      });
    }

    // 6. Bulk insert
    await Question.insertMany(questions);

    return res.status(201).json({
      message: 'Questions imported successfully',
      count: questions.length,
    });
  } catch (error) {
    console.error('importQuestions error:', error);
    return res.status(500).json({ message: 'Server error during import', detail: error.message });
  }
};

// GET /api/admin/live-stats
export const getLiveStats = async (req, res) => {
  try {
    const round = await Round.findOne({ isPublished: true }).lean();
    if (!round) {
      return res.json({ message: 'No active round' });
    }

    const filter = { roundId: round._id, isReset: false };

    const [totalParticipants, completed, inProgress, terminated] = await Promise.all([
      StudentAttempt.countDocuments(filter),
      StudentAttempt.countDocuments({ ...filter, submitTime: { $ne: null } }),
      StudentAttempt.countDocuments({ ...filter, submitTime: null }),
      StudentAttempt.countDocuments({ ...filter, terminated: true }),
    ]);

    return res.json({
      roundName: round.name,
      totalParticipants,
      completed,
      inProgress,
      terminated,
    });
  } catch (error) {
    console.error('getLiveStats error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
