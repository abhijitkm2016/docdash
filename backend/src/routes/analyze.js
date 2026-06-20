const crypto    = require('crypto');
const express   = require('express');
const multer    = require('multer');
const { parseFile }           = require('../services/fileParser');
const { analyzeDocument }     = require('../services/claudeClient');
const { buildStandaloneHtml } = require('../utils/htmlExporter');
const sessionStore            = require('../services/sessionStore');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB per file
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

// Accept up to 10 files under the field name "files"
router.post('/', upload.array('files', 10), async (req, res) => {
  const files = req.files || [];

  // SSE headers must be set before any async work so Vercel sees activity
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disables Nginx/Vercel buffering
  // Flush headers to the client immediately — without this Vercel holds them
  // until the first res.write(), which may arrive too late to beat the timeout.
  res.flushHeaders();

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  if (!files.length) {
    send('error', { message: 'No file uploaded' });
    return res.end();
  }

  // Immediate heartbeat so Vercel registers activity on the connection
  send('heartbeat', { status: 'processing' });
  const heartbeat = setInterval(() => send('heartbeat', { status: 'processing' }), 5000);

  // Optional user-supplied focus context from the textarea
  const userContext = (req.body?.context || '').trim();

  try {
    // Parse every uploaded file
    const parsed = await Promise.all(
      files.map(f => parseFile(f.buffer, f.originalname))
    );

    // Combine into a single text block when multiple files are present
    let combinedText;
    let combinedName;

    if (parsed.length === 1) {
      combinedText = parsed[0].text;
      combinedName = files[0].originalname;
    } else {
      combinedText = parsed
        .map((p, i) => `\n\n=== FILE ${i + 1}: ${files[i].originalname} ===\n\n${p.text}`)
        .join('');
      combinedName = files.map(f => f.originalname).join(', ');
    }

    // Use the first file's type for metadata; combined type when multiple
    const combinedParsed = {
      ...parsed[0],
      text: combinedText,
      type: parsed.length === 1 ? parsed[0].type : 'multi',
    };

    const dashboardData  = await analyzeDocument(combinedParsed, combinedName, { userContext });
    const standaloneHtml = buildStandaloneHtml(dashboardData);

    // Store session BEFORE sending result so Ask Your Data is ready immediately
    const sessionId = crypto.randomUUID();
    sessionStore.set(sessionId, {
      parsedFile:    combinedParsed,
      fileName:      combinedName,
      dashboardData,
    });

    clearInterval(heartbeat);
    send('result', { dashboardData, standaloneHtml, sessionId });
    send('done', {});
    res.end();
  } catch (err) {
    clearInterval(heartbeat);
    console.error('Analysis error — full object:', JSON.stringify({
      message: err.message,
      name: err.name,
      status: err.status,
      stack: err.stack,
    }, null, 2));
    send('error', { message: err.message || 'Analysis failed' });
    res.end();
  }
});

module.exports = router;
