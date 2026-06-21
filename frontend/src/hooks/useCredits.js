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
    } else {
      setCredits(data)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCredits() }, [fetchCredits])

  const deductCredit = async () => {
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
    if (data) setCredits(data)
  }

  const addCredits = async (amount, purchaseType) => {
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
    if (data) setCredits(data)
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
