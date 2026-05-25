const express = require('express');
const { analyzeDocument }     = require('../services/claudeClient');
const { buildStandaloneHtml } = require('../utils/htmlExporter');
const sessionStore            = require('../services/sessionStore');

const router = express.Router();

router.post('/', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const session = sessionStore.get(sessionId);
  if (!session) {
    return res.status(404).json({
      error: 'Session not found or expired. Please re-upload your file.',
    });
  }

  try {
    const dashboardData = await analyzeDocument(
      session.parsedFile,
      session.fileName,
      { remixMode: true }
    );
    const standaloneHtml = buildStandaloneHtml(dashboardData);

    // Update stored dashboardData so Ask Your Data uses the latest remix
    sessionStore.set(sessionId, {
      ...session,
      dashboardData,
    });

    res.json({ dashboardData, standaloneHtml, sessionId });
  } catch (err) {
    console.error('Remix error:', err.message);
    res.status(500).json({ error: err.message || 'Remix failed' });
  }
});

module.exports = router;
