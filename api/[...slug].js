/**
 * Vercel Serverless Entry Point — handles all /api/* routes.
 *
 * In local dev, the backend runs as a standalone Express server (port 3001).
 * On Vercel, this file is the single serverless function that receives every
 * /api/… request and routes it through the same Express app.
 *
 * The catch-all filename ([...slug].js) makes Vercel match:
 *   /api/analyze  →  this file
 *   /api/ask      →  this file
 *   /api/remix    →  this file
 *   /api/health   →  this file
 */

const path = require('path');

// In local dev (when this file is invoked directly, not via the backend server),
// load .env.  On Vercel, env vars are injected from the dashboard — no file needed.
if (!process.env.VERCEL) {
  require('dotenv').config({
    path: path.resolve(__dirname, '../backend/.env'),
    override: true,
  });
}

const express = require('express');
const cors    = require('cors');

const askRoute   = require('../backend/src/routes/ask');
const remixRoute = require('../backend/src/routes/remix');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// /api/analyze is handled by api/analyze.js (its own Vercel function with
// a dedicated maxDuration and SSE streaming config — not this catch-all).
app.use('/api/ask',    askRoute);
app.use('/api/remix',  remixRoute);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Tell Vercel: don't pre-parse the body (multer needs raw multipart stream)
// and don't buffer the response (required for SSE streaming to reach the client).
module.exports = app;
module.exports.config = {
  api: {
    bodyParser:    false,
    sizeLimit:     '50mb',
    responseLimit: false, // disables Vercel's response buffering — critical for SSE
  },
};
