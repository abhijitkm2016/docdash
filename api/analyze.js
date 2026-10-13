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
const { describeError }       = require('../backend/src/utils/errorInfo');

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

const NETWORK_CODES = new Set([
  'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT',
  'EHOSTUNREACH', 'ENETUNREACH', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET',
]);

function isNetworkError(err) {
  for (let e = err, depth = 0; e && depth < 5; e = e.cause, depth++) {
    if (NETWORK_CODES.has(e.code)) return true;
  }
  return (err?.message || '') === 'fetch failed';
}

function userMessageFor(err, step) {
  if (step === 'parse') {
    return 'Could not read the uploaded file. Please check it is not corrupted or password-protected. Your credit was not charged.';
  }

  const msg    = (err?.message || '').toLowerCase();
  const status = err?.status || err?.statusCode || 0;

  if (status === 529 || msg.includes('overloaded')) {
    return 'Claude AI is currently overloaded. Your credit was not charged — please try again in a moment.';
  }
  if (status === 402 || msg.includes('credit') || msg.includes('billing') || msg.includes('quota') || msg.includes('exceeded')) {
    return 'Service temporarily unavailable due to a billing limit. Your credit was not charged — please try again later.';
  }
  if (status === 429 || msg.includes('rate limit')) {
    return 'Too many requests. Your credit was not charged — please wait a moment and try again.';
  }
  if (status === 401 || msg.includes('authentication')) {
    return 'API authentication error. Your credit was not charged — please contact support.';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Analysis timed out — the document may be too large or complex. Your credit was not charged — try a smaller document.';
  }
  if (isNetworkError(err)) {
    return 'A backend service could not be reached. Your credit was not charged — please try again shortly.';
  }
  return 'Analysis failed. Your credit was not charged — please try again.';
}

const app = express();

app.post('*', guestGenerationLimit, upload.array('files', 10), async (req, res) => {
  const files = req.files || [];

  if (!files.length) {
    return res.status(400).json({ error: 'No file uploaded', step: 'validate' });
  }

  const userContext = (req.body?.context || '').trim();
  const mode = (req.body?.mode || 'auto').trim();
  const deep = req.body?.deep === 'true';

  // `step` names the stage that is running so a failure can say where it broke.
  // Until the SSE headers are flushed we can still answer with a real HTTP
  // status; afterwards the 200 is committed and errors travel as `event: error`.
  let step      = 'parse';
  let streaming = false;
  let heartbeat = null;

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const parsed = await Promise.all(
      files.map(f => parseFile(f.buffer, f.originalname))
    );

    const condensedParsed = parsed.map(p => ({
      ...p,
      text: condenseText(p, deep),
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

    // Parsing succeeded — switch to SSE so the connection stays alive while
    // Claude works (Vercel timeout workaround, see header comment).
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    streaming = true;

    send('heartbeat', { status: 'received' });
    send('heartbeat', { status: 'analysing' });
    heartbeat = setInterval(() => send('heartbeat', { status: 'analysing' }), 4000);

    step = 'claude';
    const dashboardData = await analyzeDocument(combinedParsed, combinedName, { userContext, mode, deep });

    step = 'render';
    const standaloneHtml = buildStandaloneHtml(dashboardData);

    // The analysis is already paid for. If the session store (Upstash) is down
    // we still deliver the result; only Ask / Remix, which need the session, lose out.
    step = 'session';
    let sessionId = crypto.randomUUID();
    try {
      await sessionStore.set(sessionId, {
        parsedFile: combinedParsed,
        fileName:   combinedName,
        dashboardData,
      });
    } catch (sessionErr) {
      console.error('Session save failed (result still delivered):', JSON.stringify(describeError(sessionErr, step)));
      sessionId = null;
    }

    send('result', { dashboardData, standaloneHtml, sessionId, truncated, mode, deep });
    send('done', {});
    res.end();
  } catch (err) {
    console.error('Analysis error:', JSON.stringify(describeError(err, step)));

    const userMessage = userMessageFor(err, step);
    if (streaming) {
      send('error', { message: userMessage, step });
      res.end();
    } else {
      res.status(step === 'parse' ? 422 : 500).json({ error: userMessage, step });
    }
  } finally {
    clearInterval(heartbeat);
  }
});

// multer errors (file too large, unsupported type, too many files) and any
// other error raised outside the handler above.
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('Analyze request error:', JSON.stringify(describeError(err, 'upload')));
  const isUpload = err?.name === 'MulterError' || err?.message === 'Unsupported file type';
  res.status(isUpload ? 400 : 500).json({
    error: isUpload ? err.message : 'Analysis failed. Your credit was not charged — please try again.',
    step: 'upload',
  });
});

module.exports = app;
module.exports.config = {
  api: {
    bodyParser:    false,
    responseLimit: false,
  },
};
