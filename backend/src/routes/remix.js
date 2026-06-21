const express = require('express');
const { analyzeDocument }     = require('../services/claudeClient');
const { buildStandaloneHtml } = require('../utils/htmlExporter');
const sessionStore            = require('../services/sessionStore');

const router = express.Router();

async function runRemix(req, res, options = {}) {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  const session = await sessionStore.get(sessionId);
  if (!session) {
    return res.status(404).json({
      error: 'Session not found or expired. Please re-upload your file.',
    });
  }

  try {
    const dashboardData = await analyzeDocument(session.parsedFile, session.fileName, {
      remixMode: true,
      ...options,
    });
    const standaloneHtml = buildStandaloneHtml(dashboardData);
    await sessionStore.set(sessionId, { ...session, dashboardData });
    res.json({ dashboardData, standaloneHtml, sessionId });
  } catch (err) {
    console.error('Remix error:', err.message);
    res.status(500).json({ error: err.message || 'Remix failed' });
  }
}

// Legacy route — kept for backward compat
router.post('/', (req, res) => runRemix(req, res));

// Auto remix — fresh angle, no user instruction
router.post('/auto', (req, res) => runRemix(req, res));

// Guided remix — user supplies a focus instruction
router.post('/guided', (req, res) => {
  const { instructions = '' } = req.body;
  return runRemix(req, res, { guidedInstruction: instructions });
});

module.exports = router;
