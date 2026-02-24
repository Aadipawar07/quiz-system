import express from 'express';
import {
  adminLogin,
  addQuestion,
  getResults,
  exportResults,
  createRound,
  publishRound,
  getRounds,
  getLeaderboard,
  getParticipants,
  deleteQuestion,
  deleteRound,
  getQuestionsByRound,
  resetAttempt,
  importQuestions,
  getLiveStats,
} from '../controllers/adminController.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// POST /api/admin/login  ← public (no middleware)
router.post('/login', adminLogin);

// Protected routes — require valid JWT
router.post('/add-question',            adminAuth, addQuestion);
router.get('/results',                  adminAuth, getResults);
router.get('/export',                   adminAuth, exportResults);

// Round management
router.post('/create-round',            adminAuth, createRound);
router.post('/publish-round/:roundId',  adminAuth, publishRound);
router.get('/rounds',                   adminAuth, getRounds);

// Bulk question import via Excel
router.post('/import-questions/:roundId', adminAuth, upload.single('file'), importQuestions);

// Leaderboard per round
router.get('/leaderboard/:roundId',    adminAuth, getLeaderboard);

// Participants per round (all, including terminated)
router.get('/participants/:roundId',   adminAuth, getParticipants);

// Delete a question
router.delete('/question/:questionId', adminAuth, deleteQuestion);

// Delete a round (and all its questions + attempts)
router.delete('/round/:roundId',       adminAuth, deleteRound);

// Questions per round
router.get('/questions/:roundId',      adminAuth, getQuestionsByRound);

// Reset a student attempt
router.post('/reset-attempt',          adminAuth, resetAttempt);

// Live stats for the currently published round
router.get('/live-stats',              adminAuth, getLiveStats);

export default router;


