import express from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = express.Router();

// GET /api/health
router.get('/', getHealth);

export default router;
