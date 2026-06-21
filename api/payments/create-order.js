const path = require('path');
if (!process.env.VERCEL) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env'), override: true });
}

const express  = require('express');
const cors     = require('cors');
const Razorpay = require('razorpay');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PLANS = {
  per_gen: { amount: 5900,  credits: 1,  name: 'Per Generation' },
  starter: { amount: 19900, credits: 5,  name: 'Starter Pack'   },
  value:   { amount: 49900, credits: 15, name: 'Value Pack'      },
  pro:     { amount: 99900, credits: 40, name: 'Pro Pack'        },
};

app.post('*', async (req, res) => {
  const razorpayKey    = process.env.RAZORPAY_KEY_ID;
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!razorpayKey || !razorpaySecret) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  try {
    const { planId } = req.body;
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    const razorpay = new Razorpay({ key_id: razorpayKey, key_secret: razorpaySecret });
    const order = await razorpay.orders.create({
      amount:   plan.amount,
      currency: 'INR',
      receipt:  `docdash_${Date.now()}`,
      notes:    { planId, credits: plan.credits, planName: plan.name },
    });

    res.json({
      orderId:  order.id,
      amount:   plan.amount,
      currency: 'INR',
      planId,
      credits:  plan.credits,
      planName: plan.name,
    });
  } catch (error) {
    console.error('Order creation failed:', error);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

module.exports = app;
