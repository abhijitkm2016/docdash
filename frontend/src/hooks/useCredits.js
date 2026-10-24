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
      // No credits row. New accounts are seeded server-side (signup trigger),
      // so the browser never writes balances; just show no balance.
      setCredits(null)
    } else {
      setCredits(data)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCredits() }, [fetchCredits])

  // TODO(DD-104): addCredits (used only by redeemPromoCode below) and
  // redeemPromoCode still write to `credits` / `transactions` from the browser.
  // They WILL FAIL once the 20261024000000_server_ledger migration is applied
  // (writes are revoked) and are replaced by server-side promo redemption
  // (DD-104). Paid purchases no longer use this: the server grants them (DD-103).
  //
  // paymentMeta: { amountPaise, paymentId, orderId, planName } — only provided for paid purchases
  const addCredits = async (amount, purchaseType, paymentMeta = null) => {
    if (!user || !credits) return false
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
      return true
    }
    return false
  }

  const redeemPromoCode = async (code) => {
    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .single()

    if (!user) return { success: false, message: 'Please sign in to redeem a code.' }
    if (!credits) return { success: false, message: 'Your account is still loading — please try again in a moment.' }

    // PGRST116 = no row matched. Anything else is a network/server problem, not a bad code.
    if (error && error.code !== 'PGRST116') {
      console.error('Promo lookup failed:', error)
      return { success: false, message: "Couldn't check that code right now. Please try again." }
    }
    if (error || !promoCode) return { success: false, message: 'Invalid code' }

    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) return {
      success: false, message: 'This code has expired'
    }

    if (promoCode.uses_count >= promoCode.max_uses) return {
      success: false, message: 'This code has been fully redeemed'
    }

    const { data: existing, error: redemptionCheckError } = await supabase
      .from('promo_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('code_id', promoCode.id)
      .maybeSingle()

    if (existing) return { success: false, message: "You've already used this code" }

    const { error: redemptionError } = await supabase
      .from('promo_redemptions')
      .insert({ user_id: user.id, code_id: promoCode.id })

    if (redemptionError) {
      console.error('Promo redemption insert failed:', redemptionError)
      return { success: false, message: 'Redemption failed. Try again.' }
    }

    const { error: countError } = await supabase
      .from('promo_codes')
      .update({ uses_count: promoCode.uses_count + 1 })
      .eq('id', promoCode.id)
    if (countError) console.error('Promo use-count update failed:', countError)

    const granted = await addCredits(promoCode.credits_granted, 'promo')
    if (!granted) {
      return { success: false, message: 'Code accepted but credits could not be added. Please contact support with code ' + code.toUpperCase().trim() + '.' }
    }

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
    fetchCredits, addCredits,
    redeemPromoCode
  }
}
