import Round from '../models/Round.js';
import StudentAttempt from '../models/StudentAttempt.js';

// GET /api/public/leaderboard  — no authentication required
export const getPublicLeaderboard = async (req, res) => {
  try {
    const round = await Round.findOne({ isPublished: true }).lean();

    if (!round) {
      return res.json({ message: 'No active round' });
    }

    const leaderboard = await StudentAttempt.find(
      {
        roundId:    round._id,
        isReset:    false,
        terminated: false,
        submitTime: { $ne: null },
      },
      { name: 1, tokenNo: 1, score: 1, timeTaken: 1, _id: 0 }
    )
      .sort({ score: -1, timeTaken: 1 })
      .lean();

    return res.json({ roundName: round.name, leaderboard });
  } catch (error) {
    console.error('getPublicLeaderboard error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
