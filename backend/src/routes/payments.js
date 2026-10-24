const express = require('express')
const Razorpay = require('razorpay')
const crypto = require('crypto')
const ledger = require('../services/ledger')
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
      // userId binds the order to this account; /verify refuses anyone else's order
      notes: { planId, userId: req.user.id, planName: plan.name }
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
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planId
  } = req.body || {}

  try {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment details' })
    }
    const plan = PLANS[planId]
    if (!plan) return res.status(400).json({ success: false, error: 'Invalid plan' })

    // 1. The signature proves Razorpay confirmed this payment for this order.
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')
    const given = Buffer.from(String(razorpay_signature))
    const expected = Buffer.from(expectedSignature)
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
      return res.status(400).json({ success: false, error: 'Payment verification failed' })
    }

    // 2. Look the order up server-side: the amount paid, the plan and the owner
    //    come from Razorpay, never from the request body.
    const order = await getRazorpay().orders.fetch(razorpay_order_id)
    if (order.notes?.userId !== req.user.id) {
      console.error('Payment verify: order belongs to another user', razorpay_order_id)
      return res.status(403).json({ success: false, error: 'This order belongs to a different account' })
    }
    if (order.notes?.planId !== planId || order.amount !== plan.amount || order.currency !== 'INR') {
      console.error('Payment verify: order does not match plan', razorpay_order_id)
      return res.status(400).json({ success: false, error: 'Payment does not match the selected plan' })
    }

    // 3. Grant. Credits come from the server's PLANS table. Idempotent on the
    //    payment id, so a retry or double-click can never grant twice.
    const { balance, alreadyGranted } = await ledger.grantCredits({
      userId: req.user.id,
      amount: plan.credits,
      reason: `${plan.name} purchased`,
      requestId: `payment:${razorpay_payment_id}`,
      meta: {
        planId,
        amountPaise: plan.amount,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      },
    })

    res.json({
      success: true,
      credits: plan.credits,
      balance,
      alreadyGranted,
      planName: plan.name,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id
    })
  } catch (error) {
    // Money may have moved but credits not granted: make that findable in logs.
    console.error('Verification failed:', error.message, 'order=' + razorpay_order_id, 'payment=' + razorpay_payment_id)
    res.status(500).json({ success: false, error: 'Verification failed. If you were charged, your credits will be added — contact support with your payment ID.' })
  }
})

module.exports = router
