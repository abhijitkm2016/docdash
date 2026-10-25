import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getAuthHeaders } from '../lib/authHeaders'

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

  // Promo redemption is server-side (DD-104): one atomic call, then refresh the balance.
  const redeemPromoCode = async (code) => {
    if (!user) return { success: false, message: 'Please sign in to redeem a code.' }
    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) return { success: false, message: 'Please sign in again to redeem a code.' }
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || "Couldn't redeem that code. Please try again." }
      }
      await fetchCredits()
      return { success: true, message: data.message, creditsGranted: data.creditsGranted }
    } catch (err) {
      console.error('Promo redeem failed:', err)
      return { success: false, message: "Couldn't reach the server. Please try again." }
    }
  }

  return {
    credits, loading,
    fetchCredits,
    redeemPromoCode
  }
}
