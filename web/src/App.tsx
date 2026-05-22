import { useState, useRef, useCallback, useEffect } from 'react'
import { Shell } from './components/Shell.tsx'
import PdfViewer from './components/PdfViewer'
import History from './components/History'
import { savePdf, getPdf, touchPdf } from './lib/db'
import { loadPrefs, savePrefs } from './lib/prefs'

export default function App() {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
  const [pdfName, setPdfName] = useState('')
  const [prefs, setPrefs] = useState(loadPrefs)
  const [refreshKey, setRefreshKey] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { savePrefs(prefs) }, [prefs])

  const setInvert = (v: boolean) => setPrefs(p => ({ ...p, invert: v }))
  const setScale = (s: number) => setPrefs(p => ({ ...p, scale: s }))

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

  const reading = !!pdfData

  return (
    <Shell hideChrome={reading}>
      <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" />

      <div
        className="flex flex-1 flex-col gap-3"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {reading ? (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={goHome}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--glass-hover)]"
              >
                Back
              </button>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink)]">{pdfName}</span>
              <button
                onClick={() => setInvert(!prefs.invert)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  prefs.invert
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--ink)] hover:bg-[var(--glass-hover)]'
                }`}
              >
                {prefs.invert ? 'Dark Mode' : 'Light Mode'}
              </button>
            </div>
            <PdfViewer data={pdfData} invert={prefs.invert} scale={prefs.scale} onScaleChange={setScale} />
          </>
        ) : (
          <History onOpen={openFromHistory} onImport={triggerImport} refreshKey={refreshKey} />
        )}
      </div>
    </Shell>
  )
}
