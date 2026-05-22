import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface Props {
  data: ArrayBuffer
  invert: boolean
  scale: number
  onScaleChange: (s: number) => void
}

export default function PdfViewer({ data, invert, scale, onScaleChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [rendering, setRendering] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const doc = await pdfjsLib.getDocument({ data: data.slice(0) }).promise
      if (!cancelled) {
        setPdf(doc)
        setTotalPages(doc.numPages)
        setCurrentPage(1)
      }
    }
    load()
    return () => { cancelled = true }
  }, [data])

  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current) return
    setRendering(true)
    const page = await pdf.getPage(currentPage)
    const viewport = page.getViewport({ scale })
    const canvas = canvasRef.current
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvas, viewport }).promise
    setRendering(false)
  }, [pdf, currentPage, scale])

  useEffect(() => { renderPage() }, [renderPage])

  const prev = () => setCurrentPage(p => Math.max(1, p - 1))
  const next = () => setCurrentPage(p => Math.min(totalPages, p + 1))
  const zoomIn = () => onScaleChange(Math.min(4, scale + 0.25))
  const zoomOut = () => onScaleChange(Math.max(0.5, scale - 0.25))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev() }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); next() }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn() }
      if (e.key === '-') { e.preventDefault(); zoomOut() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--glass)] px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button onClick={prev} disabled={currentPage <= 1} className="rounded-lg px-2 py-1 text-sm font-medium text-[var(--ink)] hover:bg-[var(--glass-hover)] disabled:opacity-30">
            Prev
          </button>
          <span className="text-sm text-[var(--muted)]">
            {currentPage} / {totalPages}
          </span>
          <button onClick={next} disabled={currentPage >= totalPages} className="rounded-lg px-2 py-1 text-sm font-medium text-[var(--ink)] hover:bg-[var(--glass-hover)] disabled:opacity-30">
            Next
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={zoomOut} className="rounded-lg px-2 py-1 text-sm font-medium text-[var(--ink)] hover:bg-[var(--glass-hover)]">
            A-
          </button>
          <span className="text-sm text-[var(--muted)]">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="rounded-lg px-2 py-1 text-sm font-medium text-[var(--ink)] hover:bg-[var(--glass-hover)]">
            A+
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded-xl border border-[var(--line)] bg-[var(--paper-deep)]"
      >
        <div className="flex justify-center p-4">
          <canvas
            ref={canvasRef}
            className="max-w-full"
            style={{
              filter: invert ? 'invert(1) hue-rotate(180deg)' : 'none',
              opacity: rendering ? 0.5 : 1,
              transition: 'opacity 150ms ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}
