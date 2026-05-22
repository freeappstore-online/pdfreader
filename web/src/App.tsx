import { useState, useRef, useCallback } from 'react'
import { Shell } from './components/Shell.tsx'
import PdfViewer from './components/PdfViewer'
import History from './components/History'
import { savePdf, getPdf, touchPdf } from './lib/db'

export default function App() {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
  const [pdfName, setPdfName] = useState('')
  const [invert, setInvert] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const openFile = useCallback(async (file: File) => {
    const buf = await file.arrayBuffer()
    const stored = await savePdf(file.name, buf)
    setPdfData(stored.data)
    setPdfName(stored.name)
    setRefreshKey(k => k + 1)
  }, [])

  const openFromHistory = useCallback(async (id: string) => {
    const pdf = await getPdf(id)
    if (pdf) {
      await touchPdf(id)
      setPdfData(pdf.data)
      setPdfName(pdf.name)
      setRefreshKey(k => k + 1)
    }
  }, [])

  const triggerImport = useCallback(() => fileRef.current?.click(), [])

  const goHome = useCallback(() => {
    setPdfData(null)
    setPdfName('')
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) openFile(file)
    e.target.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') openFile(file)
  }, [openFile])

  return (
    <Shell>
      <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" />

      <div
        className="flex flex-1 flex-col gap-3"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {pdfData ? (
          <>
            {/* Reader header */}
            <div className="flex items-center gap-3">
              <button
                onClick={goHome}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--glass-hover)]"
              >
                Back
              </button>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink)]">{pdfName}</span>
              <button
                onClick={() => setInvert(v => !v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  invert
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--ink)] hover:bg-[var(--glass-hover)]'
                }`}
              >
                {invert ? 'Dark Mode' : 'Light Mode'}
              </button>
            </div>
            <PdfViewer data={pdfData} invert={invert} />
          </>
        ) : (
          <History onOpen={openFromHistory} onImport={triggerImport} refreshKey={refreshKey} />
        )}
      </div>
    </Shell>
  )
}
