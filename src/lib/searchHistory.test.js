import { describe, expect, it, beforeEach } from 'vitest'
import {
  addSearchHistoryEntry,
  clearSearchHistory,
  getSearchHistory,
  removeSearchHistoryEntry,
} from './searchHistory.js'

describe('searchHistory', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty', () => {
    expect(getSearchHistory()).toEqual([])
  })

  it('adds an entry to the front', () => {
    addSearchHistoryEntry('fenerbahçe')
    addSearchHistoryEntry('galatasaray')
    const history = getSearchHistory()
    expect(history.map((e) => e.query)).toEqual(['galatasaray', 'fenerbahçe'])
  })

  it('ignores a blank/whitespace-only query', () => {
    addSearchHistoryEntry('   ')
    expect(getSearchHistory()).toEqual([])
  })

  it('de-duplicates case-insensitively, moving the repeat to the front', () => {
    addSearchHistoryEntry('Bitcoin')
    addSearchHistoryEntry('ethereum')
    addSearchHistoryEntry('bitcoin')
    const history = getSearchHistory()
    expect(history).toHaveLength(2)
    expect(history[0].query).toBe('bitcoin')
    expect(history[1].query).toBe('ethereum')
  })

  it('caps history at 50 entries, dropping the oldest', () => {
    for (let i = 0; i < 55; i++) addSearchHistoryEntry(`query-${i}`)
    const history = getSearchHistory()
    expect(history).toHaveLength(50)
    expect(history[0].query).toBe('query-54')
    expect(history.at(-1).query).toBe('query-5')
  })

  it('removes a single entry by exact query', () => {
    addSearchHistoryEntry('a')
    addSearchHistoryEntry('b')
    removeSearchHistoryEntry('a')
    expect(getSearchHistory().map((e) => e.query)).toEqual(['b'])
  })

  it('clears everything', () => {
    addSearchHistoryEntry('a')
    addSearchHistoryEntry('b')
    clearSearchHistory()
    expect(getSearchHistory()).toEqual([])
  })

  it('degrades to a no-op instead of throwing when storage is unavailable', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    try {
      expect(() => addSearchHistoryEntry('anything')).not.toThrow()
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
