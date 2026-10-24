const path = require('path');
if (!process.env.VERCEL) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env'), override: true });
}

const express        = require('express');
const cors           = require('cors');
// Import from backend/src/ so Node resolves razorpay from backend/node_modules/
const paymentsRouter = require('../../backend/src/routes/payments');
const { requireUser } = require('../../backend/src/middleware/requireUser');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Delegate to the /create-order handler inside the payments router
app.post('*', requireUser, (req, res, next) => {
  req.url = '/create-order';
  paymentsRouter(req, res, next);
});

module.exports = app;
