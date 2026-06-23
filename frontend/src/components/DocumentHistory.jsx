import { useState } from 'react'
import { useDocuments } from '../hooks/useDocuments'

export default function DocumentHistory({ onLoadDocument, currentDocumentId }) {
  const { documents, loading, deleteDocument } = useDocuments()
  const [confirmId, setConfirmId] = useState(null)

  if (loading) return (
    <div style={{ padding: '20px', color: '#94A3B8', fontSize: '13px' }}>
      Loading history...
    </div>
  )

  if (documents.length === 0) return (
    <div style={{ padding: '20px' }}>
      <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
        No documents yet. Upload your first document to get started.
      </p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px' }}>
      {documents.map(doc => (
        <div
          key={doc.id}
          className="doc-row"
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            background: currentDocumentId === doc.id ? '#EFF6FF' : 'transparent',
            border: currentDocumentId === doc.id ? '1px solid #BFDBFE' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
            position: 'relative',
          }}
          onClick={() => onLoadDocument(doc.id)}
          onMouseEnter={e => {
            if (currentDocumentId !== doc.id) e.currentTarget.style.background = '#F8FAFC'
          }}
          onMouseLeave={e => {
            if (currentDocumentId !== doc.id) e.currentTarget.style.background = 'transparent'
          }}
        >
          <div style={{ minWidth: 0, paddingRight: '28px' }}>
            <div style={{
              fontSize: '12px', fontWeight: 500, color: '#1E293B',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginBottom: '2px',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.title || doc.file_name}
              </span>
              {doc.mode && doc.mode !== 'auto' && (
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                  background: '#EFF6FF', color: '#2563EB', fontWeight: '600',
                  flexShrink: 0, textTransform: 'capitalize',
                }}>
                  {doc.mode}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              {new Date(doc.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </div>
          </div>

          {confirmId === doc.id ? (
            <div
              style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}
              onClick={e => e.stopPropagation()}
            >
              <span style={{ fontSize: '11px', color: '#DC2626' }}>Delete?</span>
              <button
                onClick={async () => { await deleteDocument(doc.id); setConfirmId(null); }}
                style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                  border: 'none', background: '#DC2626', color: '#fff',
                  cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit',
                }}
              >Yes</button>
              <button
                onClick={() => setConfirmId(null)}
                style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                  border: '1px solid #E2E8F0', background: 'transparent',
                  color: '#64748B', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >No</button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setConfirmId(doc.id); }}
              title="Delete document"
              className="doc-delete-btn"
              style={{
                opacity: 0,
                position: 'absolute', top: '8px', right: '8px',
                width: '24px', height: '24px', borderRadius: '4px',
                border: '1px solid #E2E8F0', background: '#fff',
                cursor: 'pointer', fontSize: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'opacity 0.15s ease',
              }}
            >🗑️</button>
          )}
        </div>
      ))}
    </div>
  )
}
