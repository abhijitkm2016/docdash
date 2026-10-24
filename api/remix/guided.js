const path = require('path');
if (!process.env.VERCEL) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env'), override: true });
}

const express      = require('express');
const cors         = require('cors');
const { guestRemixBlock } = require('../../backend/src/middleware/rateLimit');
const { runRemix }        = require('../../backend/src/routes/remix');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Same handler (auth, charge, refund) as the router in backend/src/routes/remix.js
app.post('*', guestRemixBlock, (req, res) =>
  runRemix(req, res, { guidedInstruction: req.body?.instructions || '' })
);

module.exports = app;
