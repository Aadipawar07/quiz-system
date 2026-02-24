import express from 'express';
import { startQuiz, getQuestions, submitQuiz } from '../controllers/quizController.js';

const router = express.Router();

// POST /api/quiz/start
router.post('/start', startQuiz);

// GET /api/quiz/questions
router.get('/questions', getQuestions);

// POST /api/quiz/submit
router.post('/submit', submitQuiz);

export default router;
