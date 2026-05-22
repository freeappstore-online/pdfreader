const DB_NAME = 'pdfreader'
const DB_VERSION = 1
const STORE_NAME = 'pdfs'

export interface StoredPdf {
  id: string
  name: string
  data: ArrayBuffer
  addedAt: number
  lastOpenedAt: number
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('lastOpenedAt', 'lastOpenedAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(mode: IDBTransactionMode): Promise<{ store: IDBObjectStore; done: Promise<void> }> {
  return open().then(db => {
    const t = db.transaction(STORE_NAME, mode)
    const store = t.objectStore(STORE_NAME)
    const done = new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
    })
    return { store, done }
  })
}

export async function savePdf(name: string, data: ArrayBuffer): Promise<StoredPdf> {
  const { store, done } = await tx('readwrite')
  const now = Date.now()
  const pdf: StoredPdf = { id: crypto.randomUUID(), name, data, addedAt: now, lastOpenedAt: now }
  store.put(pdf)
  await done
  return pdf
}

export async function getPdf(id: string): Promise<StoredPdf | undefined> {
  const { store, done } = await tx('readonly')
  return new Promise((resolve, reject) => {
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result ?? undefined)
    req.onerror = () => reject(req.error)
    done.catch(reject)
  })
}

export async function touchPdf(id: string): Promise<void> {
  const { store, done } = await tx('readwrite')
  const req = store.get(id)
  req.onsuccess = () => {
    const pdf = req.result as StoredPdf | undefined
    if (pdf) {
      pdf.lastOpenedAt = Date.now()
      store.put(pdf)
    }
  }
  await done
}

export async function deletePdf(id: string): Promise<void> {
  const { store, done } = await tx('readwrite')
  store.delete(id)
  await done
}

export async function listPdfs(): Promise<Omit<StoredPdf, 'data'>[]> {
  const { store, done } = await tx('readonly')
  return new Promise((resolve, reject) => {
    const idx = store.index('lastOpenedAt')
    const req = idx.openCursor(null, 'prev')
    const results: Omit<StoredPdf, 'data'>[] = []
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        const { id, name, addedAt, lastOpenedAt } = cursor.value as StoredPdf
        results.push({ id, name, addedAt, lastOpenedAt })
        cursor.continue()
      } else {
        resolve(results)
      }
    }
    req.onerror = () => reject(req.error)
    done.catch(reject)
  })
}
