import { useEffect, useState } from 'react'
import { listPdfs, deletePdf, type StoredPdf } from '../lib/db'

type PdfMeta = Omit<StoredPdf, 'data'>

interface Props {
  onOpen: (id: string) => void
  onImport: () => void
  refreshKey: number
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function History({ onOpen, onImport, refreshKey }: Props) {
  const [pdfs, setPdfs] = useState<PdfMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listPdfs().then(list => { setPdfs(list); setLoading(false) })
  }, [refreshKey])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deletePdf(id)
    setPdfs(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="display-font text-3xl font-bold text-[var(--ink)]">PDF Reader</h1>
        <p className="mt-2 text-[var(--muted)]">Dark mode reading with inverted colors</p>
      </div>

      <button
        onClick={onImport}
        className="rounded-2xl bg-[var(--accent)] px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:brightness-110"
      >
        Open PDF
      </button>

      {loading ? null : pdfs.length > 0 && (
        <div className="w-full max-w-md">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            History
          </h2>
          <div className="flex flex-col gap-2">
            {pdfs.map(pdf => (
              <div
                key={pdf.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(pdf.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(pdf.id) }}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--glass)] px-4 py-3 text-left backdrop-blur-md transition hover:bg-[var(--glass-hover)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                  PDF
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--ink)]">{pdf.name}</div>
                  <div className="text-xs text-[var(--muted)]">{timeAgo(pdf.lastOpenedAt)}</div>
                </div>
                <button
                  onClick={(e) => handleDelete(pdf.id, e)}
                  className="rounded-lg px-2 py-1 text-xs text-[var(--muted)] opacity-0 transition hover:bg-[var(--line)] hover:text-[var(--error)] group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
