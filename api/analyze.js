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
const { guestGenerationLimit } = require('../backend/src/middleware/rateLimit');

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

const app = express();

app.post('*', guestGenerationLimit, upload.array('files', 10), async (req, res) => {
  const files = req.files || [];

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

  send('heartbeat', { status: 'received' });

  const userContext = (req.body?.context || '').trim();
  const mode = (req.body?.mode || 'auto').trim();

  try {
    const parsed = await Promise.all(
      files.map(f => parseFile(f.buffer, f.originalname))
    );

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

    send('heartbeat', { status: 'analysing' });
    const heartbeat = setInterval(() => send('heartbeat', { status: 'analysing' }), 4000);

    const dashboardData  = await analyzeDocument(combinedParsed, combinedName, { userContext, mode });
    const standaloneHtml = buildStandaloneHtml(dashboardData);

    const sessionId = crypto.randomUUID();
    await sessionStore.set(sessionId, {
      parsedFile:    combinedParsed,
      fileName:      combinedName,
      dashboardData,
    });

    clearInterval(heartbeat);
    send('result', { dashboardData, standaloneHtml, sessionId, truncated, mode });
    send('done', {});
    res.end();
  } catch (err) {
    console.error('Analysis error:', JSON.stringify({
      message: err.message,
      status:  err.status,
    }));

    const msg    = err.message || '';
    const status = err.status || err.statusCode || 0;

    let userMessage;
    if (status === 529 || msg.toLowerCase().includes('overloaded')) {
      userMessage = 'Claude AI is currently overloaded. Your credit was not charged — please try again in a moment.';
    } else if (status === 402 || msg.toLowerCase().includes('credit') || msg.toLowerCase().includes('billing') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exceeded')) {
      userMessage = 'Service temporarily unavailable due to a billing limit. Your credit was not charged — please try again later.';
    } else if (status === 429 || msg.toLowerCase().includes('rate limit')) {
      userMessage = 'Too many requests. Your credit was not charged — please wait a moment and try again.';
    } else if (status === 401 || msg.toLowerCase().includes('authentication')) {
      userMessage = 'API authentication error. Your credit was not charged — please contact support.';
    } else if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out')) {
      userMessage = 'Analysis timed out — the document may be too large or complex. Your credit was not charged — try a smaller document.';
    } else {
      userMessage = 'Analysis failed. Your credit was not charged — please try again.';
    }

    send('error', { message: userMessage });
    res.end();
  }
});

module.exports = app;
module.exports.config = {
  api: {
    bodyParser:    false,
    responseLimit: false,
  },
};
