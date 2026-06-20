/**
 * Dedicated Vercel function for POST /api/analyze.
 *
 * Separated from api/[...slug].js so it gets its own maxDuration config
 * and Vercel routes it independently from the catch-all Express wrapper.
 * SSE streaming keeps the connection alive while Claude analyses the document.
 */

const path = require('path');
if (!process.env.VERCEL) {
  require('dotenv').config({
    path: path.resolve(__dirname, '../backend/.env'),
    override: true,
  });
}

const crypto   = require('crypto');
const express  = require('express');
const multer   = require('multer');

const { parseFile }           = require('../backend/src/services/fileParser');
const { analyzeDocument }     = require('../backend/src/services/claudeClient');
const { buildStandaloneHtml } = require('../backend/src/utils/htmlExporter');
const { condenseText }        = require('../backend/src/utils/condenseText');
const sessionStore            = require('../backend/src/services/sessionStore');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ];
    if (
      allowed.includes(file.mimetype) ||
      file.originalname.match(/\.(pdf|xlsx|xls|csv|docx|doc|pptx|ppt)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

// Minimal Express app — no global body-parser middleware so multer gets
// the raw multipart stream without interference.
const app = express();

app.post('*', upload.array('files', 10), async (req, res) => {
  const files = req.files || [];

  // Set SSE headers and flush immediately — Vercel must see the 200 +
  // content-type before any async work begins, or it will buffer the entire
  // response and release it only after the function completes (or times out).
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  if (!files.length) {
    send('error', { message: 'No file uploaded' });
    return res.end();
  }

  // Phase 1 heartbeat — file received, about to parse.
  // Sent before any async work so Vercel sees activity immediately.
  send('heartbeat', { status: 'received' });

  const userContext = (req.body?.context || '').trim();

  try {
    const parsed = await Promise.all(
      files.map(f => parseFile(f.buffer, f.originalname))
    );

    // Condense each file individually so Excel/CSV files get tabular stats
    // even in a multi-file upload (type 'multi' would bypass tabular logic).
    const condensedParsed = parsed.map(p => ({
      ...p,
      text: condenseText(p),
    }));
    const truncated = parsed.some((p, i) => condensedParsed[i].text.length < p.text.length);

    let combinedText, combinedName;
    if (condensedParsed.length === 1) {
      combinedText = condensedParsed[0].text;
      combinedName = files[0].originalname;
    } else {
      combinedText = condensedParsed
        .map((p, i) => `\n\n=== FILE ${i + 1}: ${files[i].originalname} ===\n\n${p.text}`)
        .join('');
      combinedName = files.map(f => f.originalname).join(', ');
    }

    const combinedParsed = {
      ...condensedParsed[0],
      text: combinedText,
      type: parsed.length === 1 ? parsed[0].type : 'multi',
    };

    // Phase 2 heartbeat — parsing done, Claude is now working.
    // Subsequent interval heartbeats keep the edge connection alive.
    send('heartbeat', { status: 'analysing' });
    const heartbeat = setInterval(() => send('heartbeat', { status: 'analysing' }), 4000);

    const dashboardData  = await analyzeDocument(combinedParsed, combinedName, { userContext });
    const standaloneHtml = buildStandaloneHtml(dashboardData);

    // Store session BEFORE sending result so Ask Your Data is ready immediately
    const sessionId = crypto.randomUUID();
    await sessionStore.set(sessionId, {
      parsedFile:    combinedParsed,
      fileName:      combinedName,
      dashboardData,
    });

    clearInterval(heartbeat);
    send('result', { dashboardData, standaloneHtml, sessionId, truncated });
    send('done', {});
    res.end();
  } catch (err) {
    console.error('Analysis error:', JSON.stringify({
      message: err.message,
      name:    err.name,
      status:  err.status,
      stack:   err.stack,
    }, null, 2));
    send('error', { message: err.message || 'Analysis failed' });
    res.end();
  }
});

module.exports = app;
module.exports.config = {
  api: {
    bodyParser:    false,  // multer needs the raw multipart stream
    responseLimit: false,  // no buffering — stream chunks as they arrive
  },
};
