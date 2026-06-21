import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchTransactions = useCallback(async () => {
    if (!user) { setTransactions([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error) setTransactions(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const recordTransaction = async ({
    transactionType,
    planId = null,
    creditsDelta,
    amountPaise = null,
    razorpayPaymentId = null,
    razorpayOrderId = null,
    promoCode = null,
    description = null
  }) => {
    if (!user) return null
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        transaction_type: transactionType,
        plan_id: planId,
        credits_delta: creditsDelta,
        amount_paise: amountPaise,
        currency: 'INR',
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        promo_code: promoCode,
        description: description
      })
      .select()
      .single()
    if (error) {
      console.error('Transaction record failed:', error)
      return null
    }
    await fetchTransactions()
    return data
  }

  return { transactions, loading, recordTransaction, fetchTransactions }
}
