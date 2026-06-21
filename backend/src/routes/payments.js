const express = require('express')
const Razorpay = require('razorpay')
const crypto = require('crypto')
const router = express.Router()

let _razorpay = null
function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return _razorpay
}

const PLANS = {
  per_gen: { amount: 5900, credits: 1, name: 'Per Generation' },
  starter: { amount: 19900, credits: 5, name: 'Starter Pack' },
  value:   { amount: 49900, credits: 15, name: 'Value Pack' },
  pro:     { amount: 99900, credits: 40, name: 'Pro Pack' }
}

router.post('/create-order', async (req, res) => {
  try {
    const { planId } = req.body
    const plan = PLANS[planId]
    if (!plan) return res.status(400).json({ error: 'Invalid plan' })

    const order = await getRazorpay().orders.create({
      amount: plan.amount,
      currency: 'INR',
      receipt: `docdash_${Date.now()}`,
      notes: { planId, credits: plan.credits, planName: plan.name }
    })

    res.json({
      orderId: order.id,
      amount: plan.amount,
      currency: 'INR',
      planId,
      credits: plan.credits,
      planName: plan.name
    })
  } catch (error) {
    console.error('Order creation failed:', error)
    res.status(500).json({ error: 'Order creation failed' })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId
    } = req.body

    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Payment verification failed' })
    }

    const plan = PLANS[planId]
    res.json({
      success: true,
      credits: plan.credits,
      planName: plan.name,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id
    })
  } catch (error) {
    console.error('Verification failed:', error)
    res.status(500).json({ error: 'Verification failed' })
  }
})

module.exports = router
