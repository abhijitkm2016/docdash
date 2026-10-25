const express = require('express');
const ledger  = require('../services/ledger');
const { describeError } = require('../utils/errorInfo');

const MAX_FAILED_ATTEMPTS = 10;   // per user per hour; codes like NAME10 are guessable
const WINDOW_SECONDS      = 3600;

/**
 * POST /api/promo/redeem  { code }   (requireUser is applied by the mounter)
 * The server does the whole redemption in one SQL transaction (redeem_promo).
 * `redis` is a function returning a client (injectable for tests).
 */
function createPromoRouter({ redis } = {}) {
  const router = express.Router();

  router.post('/redeem', async (req, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code || code.length > 64) {
      return res.status(400).json({ success: false, message: 'Enter a promo code.' });
    }

    const key = `docdash:promo:fail:${req.user.id}`;
    let client = null;
    try {
      client = redis ? redis() : null;
      const failed = client ? parseInt(await client.get(key)) || 0 : 0;
      if (failed >= MAX_FAILED_ATTEMPTS) {
        return res.status(429).json({ success: false, message: 'Too many invalid attempts. Please try again later.' });
      }
    } catch (err) {
      console.error('Promo attempt check failed:', JSON.stringify(describeError(err, 'promo-limit'))); // fail open
    }

    try {
      const result = await ledger.redeemPromo({ userId: req.user.id, code });
      return res.json({
        success: true,
        creditsGranted: result.creditsGranted,
        balance: result.balance,
        message: `${result.creditsGranted} credits added to your account!`,
      });
    } catch (err) {
      if (err instanceof ledger.PromoError) {
        if (err.code === 'invalid_code' && client) {
          try { await client.incr(key); await client.expire(key, WINDOW_SECONDS); } catch { /* ignore */ }
        }
        return res.status(err.status).json({ success: false, message: err.message });
      }
      console.error('Promo redeem failed:', JSON.stringify(describeError(err, 'promo')));
      return res.status(500).json({ success: false, message: "Couldn't redeem that code right now. Please try again." });
    }
  });

  return router;
}

module.exports = createPromoRouter;
