const KEY = 'pdfreader-prefs'

export interface Prefs {
  invert: boolean
  scale: number
}

const DEFAULTS: Prefs = { invert: true, scale: 1.5 }

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function savePrefs(prefs: Prefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}
