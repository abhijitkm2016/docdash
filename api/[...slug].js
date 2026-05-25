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

const analyzeRoute = require('../backend/src/routes/analyze');
const askRoute     = require('../backend/src/routes/ask');
const remixRoute   = require('../backend/src/routes/remix');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/analyze', analyzeRoute);
app.use('/api/ask',     askRoute);
app.use('/api/remix',   remixRoute);
app.get('/api/health',  (_req, res) => res.json({ status: 'ok' }));

// Tell Vercel: don't pre-parse the request body.
// multer needs the raw multipart stream for file uploads.
module.exports = app;
module.exports.config = {
  api: {
    bodyParser: false,
    sizeLimit: '50mb',
  },
};
