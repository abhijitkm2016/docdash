const path = require('path');
if (!process.env.VERCEL) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env'), override: true });
}

const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PLANS = {
  per_gen: { credits: 1,  name: 'Per Generation' },
  starter: { credits: 5,  name: 'Starter Pack'   },
  value:   { credits: 15, name: 'Value Pack'      },
  pro:     { credits: 40, name: 'Pro Pack'        },
};

app.post('*', async (req, res) => {
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!razorpaySecret) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ success: false, error: 'Invalid plan' });

    res.json({
      success:   true,
      credits:   plan.credits,
      planName:  plan.name,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error('Verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = app;
