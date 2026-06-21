import { supabase } from '../lib/supabase'

export function useShares() {
  const createShare = async (documentId) => {
    const { data, error } = await supabase
      .from('shares')
      .insert({ document_id: documentId })
      .select()
      .single()
    if (error) { console.error('Share error:', error); return null }
    return data
  }

  const getSharedDocument = async (shareToken) => {
    const { data: share, error: shareError } = await supabase
      .from('shares')
      .select('document_id, expires_at')
      .eq('share_token', shareToken)
      .single()
    if (shareError || !share) return null
    if (share.expires_at && new Date(share.expires_at) < new Date()) return null

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', share.document_id)
      .single()
    if (docError) return null
    return doc
  }

  const deleteShare = async (shareToken) => {
    await supabase.from('shares').delete().eq('share_token', shareToken)
  }

  return { createShare, getSharedDocument, deleteShare }
}
