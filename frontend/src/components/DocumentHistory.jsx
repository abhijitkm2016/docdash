import { useDocuments } from '../hooks/useDocuments'

export default function DocumentHistory({ onLoadDocument, currentDocumentId }) {
  const { documents, loading, deleteDocument } = useDocuments()

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
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            background: currentDocumentId === doc.id ? '#EFF6FF' : 'transparent',
            border: currentDocumentId === doc.id ? '1px solid #BFDBFE' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
          }}
          onClick={() => onLoadDocument(doc.id)}
          onMouseEnter={e => {
            if (currentDocumentId !== doc.id) e.currentTarget.style.background = '#F8FAFC'
          }}
          onMouseLeave={e => {
            if (currentDocumentId !== doc.id) e.currentTarget.style.background = 'transparent'
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: '12px', fontWeight: 500, color: '#1E293B',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginBottom: '2px',
            }}>
              {doc.title || doc.file_name}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              {new Date(doc.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </div>
          </div>
          <button
            onClick={e => {
              e.stopPropagation()
              if (window.confirm('Delete this document?')) deleteDocument(doc.id)
            }}
            style={{
              background: 'none', border: 'none',
              color: '#CBD5E1', cursor: 'pointer',
              fontSize: '14px', padding: '0 2px',
              flexShrink: 0, lineHeight: 1,
            }}
            title="Delete"
          >×</button>
        </div>
      ))}
    </div>
  )
}
