const crypto    = require('crypto');
const express   = require('express');
const multer    = require('multer');
const { parseFile }        = require('../services/fileParser');
const { analyzeDocument }  = require('../services/claudeClient');
const { buildStandaloneHtml } = require('../utils/htmlExporter');
const sessionStore         = require('../services/sessionStore');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
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

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const parsed       = await parseFile(req.file.buffer, req.file.originalname);
    const dashboardData = await analyzeDocument(parsed, req.file.originalname);
    const standaloneHtml = buildStandaloneHtml(dashboardData);

    // Store session for Ask Your Data + Remix
    const sessionId = crypto.randomUUID();
    sessionStore.set(sessionId, {
      parsedFile:    parsed,
      fileName:      req.file.originalname,
      dashboardData,
    });

    res.json({ dashboardData, standaloneHtml, sessionId });
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

module.exports = router;
