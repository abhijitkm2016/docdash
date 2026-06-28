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

  const updateDocument = async (id, { title }) => {
    if (!user || !id) return false;

    // First fetch current dashboard_data so we can patch the title inside it
    const { data: existing, error: fetchError } = await supabase
      .from('documents')
      .select('dashboard_data')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) { console.error('updateDocument fetch error:', fetchError); return false; }

    const updatedDashboardData = {
      ...(existing.dashboard_data || {}),
      title,
    };

    const { error } = await supabase
      .from('documents')
      .update({ title, dashboard_data: updatedDashboardData })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { console.error('updateDocument error:', error); return false; }
    return true;
  };

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

  return { documents, loading, error, saveDocument, updateDocument, deleteDocument, loadDocument, refetch: fetchDocuments }
}
