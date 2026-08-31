// Arama geçmişi: per-device only (localStorage), matching the settings
// screen's own copy ("bu cihazdan kaldırılacak") — never synced, never
// sent to Supabase. Real searches only; nothing here is fabricated.
const KEY = 'gtf-search-history'
const MAX_ENTRIES = 50

function readAll() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeAll(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // Storage unavailable (private mode, quota) — history just won't persist.
  }
}

export function getSearchHistory() {
  return readAll()
}

export function addSearchHistoryEntry(query) {
  const trimmed = query.trim()
  if (!trimmed) return
  const entries = readAll().filter((e) => e.query.toLowerCase() !== trimmed.toLowerCase())
  entries.unshift({ query: trimmed, created_at: new Date().toISOString() })
  writeAll(entries.slice(0, MAX_ENTRIES))
}

export function removeSearchHistoryEntry(query) {
  writeAll(readAll().filter((e) => e.query !== query))
}

export function clearSearchHistory() {
  writeAll([])
}
