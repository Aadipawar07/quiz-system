import express from 'express';
import { getPublicLeaderboard } from '../controllers/publicController.js';

const router = express.Router();

// No auth required
router.get('/leaderboard', getPublicLeaderboard);

export default router;
