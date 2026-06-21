const path = require('path');
if (!process.env.VERCEL) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env'), override: true });
}

const express      = require('express');
const cors         = require('cors');
const { guestRemixBlock }  = require('../../backend/src/middleware/rateLimit');
const { analyzeDocument }  = require('../../backend/src/services/claudeClient');
const { buildStandaloneHtml } = require('../../backend/src/utils/htmlExporter');
const sessionStore = require('../../backend/src/services/sessionStore');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('*', guestRemixBlock, async (req, res) => {
  const { sessionId, instructions = '' } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  const session = await sessionStore.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired. Please re-upload your file.' });
  }

  try {
    const dashboardData  = await analyzeDocument(session.parsedFile, session.fileName, {
      remixMode: true,
      guidedInstruction: instructions,
    });
    const standaloneHtml = buildStandaloneHtml(dashboardData);
    await sessionStore.set(sessionId, { ...session, dashboardData });
    res.json({ dashboardData, standaloneHtml, sessionId });
  } catch (err) {
    console.error('Guided remix error:', err.message);
    res.status(500).json({ error: err.message || 'Guided remix failed' });
  }
});

module.exports = app;
