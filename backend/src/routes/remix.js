const express = require('express');
const { analyzeDocument }     = require('../services/claudeClient');
const { buildStandaloneHtml } = require('../utils/htmlExporter');
const sessionStore            = require('../services/sessionStore');
const ledger                  = require('../services/ledger');

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

  // Remix is signed-in only (guestRemixBlock sets req.user). Charge atomically
  // before the model call; refund exactly once if anything after it fails.
  const requestId = ledger.newRequestId('remix');
  try {
    await ledger.consumeCredits({
      userId:    req.user.id,
      amount:    ledger.COST.remix,
      reason:    options.guidedInstruction ? 'Guided Remix' : 'Auto Remix',
      requestId,
    });
  } catch (err) {
    if (err instanceof ledger.InsufficientCreditsError) {
      return res.status(402).json({
        error: 'insufficient_credits',
        message: 'Not enough credits to remix. Please top up and try again.',
      });
    }
    console.error('Remix charge failed:', err.message);
    return res.status(500).json({ error: 'Could not charge credits. Please try again.' });
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
    try {
      await ledger.refundCredits({ requestId });
    } catch (refundErr) {
      console.error('Credit refund failed:', refundErr.message, 'requestId=' + requestId);
    }
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
module.exports.runRemix = runRemix;
