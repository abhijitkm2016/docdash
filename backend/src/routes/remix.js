const express = require('express');
const { analyzeDocument } = require('../services/claudeClient');
const sessionStore        = require('../services/sessionStore');

const router = express.Router();

router.post('/', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const session = await sessionStore.get(sessionId);
  if (!session) {
    return res.status(404).json({
      error: 'Session not found or expired. Please re-upload your file.',
    });
  }

  try {
    const html = await analyzeDocument(
      session.parsedFile,
      session.fileName,
      { remixMode: true }
    );

    // Update stored html so Ask Your Data context stays fresh
    await sessionStore.set(sessionId, {
      ...session,
      html,
    });

    res.json({ html, sessionId });
  } catch (err) {
    console.error('Remix error:', err.message);
    res.status(500).json({ error: err.message || 'Remix failed' });
  }
});

module.exports = router;
