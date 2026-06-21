import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useCredits() {
  const { user } = useAuth()
  const [credits, setCredits] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchCredits = useCallback(async () => {
    if (!user) { setCredits(null); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // No credits row yet — seed with 5 free credits
      const { data: newCredits } = await supabase
        .from('credits')
        .insert({ user_id: user.id, credits_remaining: 5, credits_used: 0 })
        .select()
        .single()
      setCredits(newCredits)
      // Record free tier transaction (fire-and-forget — never block the UI)
      supabase.from('transactions').insert({
        user_id: user.id,
        transaction_type: 'free_tier',
        plan_id: 'free',
        credits_delta: 5,
        currency: 'INR',
        description: 'Welcome — 5 free credits on signup'
      }).then(() => {})
    } else {
      setCredits(data)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCredits() }, [fetchCredits])

  const deductCredit = async (description = 'Document generation') => {
    if (!user || !credits) return false
    if (credits.credits_remaining <= 0) return false
    const { data, error } = await supabase
      .from('credits')
      .update({
        credits_remaining: credits.credits_remaining - 1,
        credits_used: credits.credits_used + 1
      })
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) return false
    setCredits(data)
    supabase.from('transactions').insert({
      user_id: user.id,
      transaction_type: 'deduction',
      credits_delta: -1,
      currency: 'INR',
      description
    }).then(() => {})
    return true
  }

  const restoreCredit = async () => {
    if (!user || !credits) return
    const { data } = await supabase
      .from('credits')
      .update({
        credits_remaining: credits.credits_remaining + 1,
        credits_used: Math.max(0, credits.credits_used - 1)
      })
      .eq('user_id', user.id)
      .select()
      .single()
    if (data) {
      setCredits(data)
      supabase.from('transactions').insert({
        user_id: user.id,
        transaction_type: 'restoration',
        credits_delta: 1,
        currency: 'INR',
        description: 'Credit restored — generation failed'
      }).then(() => {})
    }
  }

  // paymentMeta: { amountPaise, paymentId, orderId, planName } — only provided for paid purchases
  const addCredits = async (amount, purchaseType, paymentMeta = null) => {
    if (!user || !credits) return
    const { data } = await supabase
      .from('credits')
      .update({
        credits_remaining: credits.credits_remaining + amount,
        last_purchase_at: new Date().toISOString(),
        last_purchase_type: purchaseType
      })
      .eq('user_id', user.id)
      .select()
      .single()
    if (data) {
      setCredits(data)
      if (paymentMeta) {
        supabase.from('transactions').insert({
          user_id: user.id,
          transaction_type: 'purchase',
          plan_id: purchaseType,
          credits_delta: amount,
          amount_paise: paymentMeta.amountPaise,
          currency: 'INR',
          razorpay_payment_id: paymentMeta.paymentId,
          razorpay_order_id: paymentMeta.orderId,
          description: `${paymentMeta.planName} purchased`
        }).then(() => {})
      }
    }
  }

  const redeemPromoCode = async (code) => {
    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .single()

    if (error || !promoCode) return { success: false, message: 'Invalid code' }

    if (new Date(promoCode.expires_at) < new Date()) return {
      success: false, message: 'This code has expired'
    }

    if (promoCode.uses_count >= promoCode.max_uses) return {
      success: false, message: 'This code has been fully redeemed'
    }

    const { data: existing } = await supabase
      .from('promo_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('code_id', promoCode.id)
      .single()

    if (existing) return { success: false, message: "You've already used this code" }

    const { error: redemptionError } = await supabase
      .from('promo_redemptions')
      .insert({ user_id: user.id, code_id: promoCode.id })

    if (redemptionError) return { success: false, message: 'Redemption failed. Try again.' }

    await supabase
      .from('promo_codes')
      .update({ uses_count: promoCode.uses_count + 1 })
      .eq('id', promoCode.id)

    await addCredits(promoCode.credits_granted, 'promo')

    // Record promo transaction after addCredits (addCredits skips it since no paymentMeta)
    supabase.from('transactions').insert({
      user_id: user.id,
      transaction_type: 'promo',
      plan_id: 'promo',
      credits_delta: promoCode.credits_granted,
      currency: 'INR',
      promo_code: code.toUpperCase().trim(),
      description: `Promo code redeemed: ${code.toUpperCase().trim()}`
    }).then(() => {})

    return {
      success: true,
      message: `${promoCode.credits_granted} credits added to your account!`,
      creditsGranted: promoCode.credits_granted
    }
  }

  return {
    credits, loading,
    fetchCredits, deductCredit,
    restoreCredit, addCredits,
    redeemPromoCode
  }
}
