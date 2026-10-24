const express = require('express');
const { answerQuestion } = require('../services/claudeClient');
const sessionStore       = require('../services/sessionStore');

const router = express.Router();

router.post('/', async (req, res) => {
  const { sessionId, question, dashboardData: bodyDashboardData } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  let dashboardData = null;

  if (sessionId) {
    try {
      const session = await sessionStore.get(sessionId);
      if (session) dashboardData = session.dashboardData;
    } catch (err) {
      // Session store down: fall back to the dashboard the client sent, if any.
      console.error('Ask session lookup failed:', err.message);
    }
  }

  if (!dashboardData && bodyDashboardData) {
    dashboardData = bodyDashboardData;
  }

  if (!dashboardData) {
    return res.status(404).json({
      error: 'Session expired. Please regenerate the dashboard to ask questions.',
    });
  }

  try {
    const answer = await answerQuestion(dashboardData, question.trim());
    res.json({ answer });
  } catch (err) {
    console.error('Ask error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to answer question' });
  }
});

module.exports = router;
