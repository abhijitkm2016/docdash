const express = require('express');
const { answerQuestion } = require('../services/claudeClient');
const sessionStore       = require('../services/sessionStore');

const router = express.Router();

router.post('/', async (req, res) => {
  const { sessionId, question } = req.body;

  if (!sessionId || !question?.trim()) {
    return res.status(400).json({ error: 'sessionId and question are required' });
  }

  const session = await sessionStore.get(sessionId);
  if (!session) {
    return res.status(404).json({
      error: 'Session not found or expired. Please re-upload your file.',
    });
  }

  try {
    const answer = await answerQuestion(session.dashboardData, question.trim());
    res.json({ answer });
  } catch (err) {
    console.error('Ask error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to answer question' });
  }
});

module.exports = router;
