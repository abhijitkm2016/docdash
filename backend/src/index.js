const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const express    = require('express');
const cors       = require('cors');
const analyzeRoute = require('./routes/analyze');
const askRoute     = require('./routes/ask');
const remixRoute   = require('./routes/remix');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '50mb' }));

app.use('/api/analyze', analyzeRoute);
app.use('/api/ask',     askRoute);
app.use('/api/remix',   remixRoute);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`DocDash backend running on port ${PORT}`));

module.exports = app;
