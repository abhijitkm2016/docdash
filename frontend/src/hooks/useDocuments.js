import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const fetchDocuments = useCallback(async () => {
    if (!user) { setDocuments([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('documents')
      .select('id, file_name, title, created_at, mode')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) setError(error.message)
    else setDocuments(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  const saveDocument = async ({ fileName, title, dashboardData, mode = 'auto' }) => {
    if (!user) return null
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id:        user.id,
        file_name:      fileName,
        title:          title || fileName,
        dashboard_data: dashboardData,
        mode,
      })
      .select()
      .single()
    if (error) { console.error('Save error:', error); return null }
    await fetchDocuments()
    return data
  }

  const deleteDocument = async (documentId) => {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
    if (!error) await fetchDocuments()
  }

  const loadDocument = async (documentId) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()
    if (error) return null
    return data
  }

  return { documents, loading, error, saveDocument, deleteDocument, loadDocument, refetch: fetchDocuments }
}
