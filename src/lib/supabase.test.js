import { describe, expect, it, vi } from 'vitest'
import { queryWithGroupIdFallback } from './supabase.js'

// queryWithGroupIdFallback exists because .is('group_id', null) 400s with
// Postgres error 42703 (undefined_column) until the GROUP-SCOPED
// PREDICTIONS migration has run — see the comment in supabase.js. These
// tests cover the retry contract directly, without touching the network.
describe('queryWithGroupIdFallback', () => {
  it('returns the result as-is when the first attempt succeeds', async () => {
    const makeQuery = vi.fn(async (filterGroupId) => ({ data: [{ id: 1, filterGroupId }], error: null }))
    const result = await queryWithGroupIdFallback(makeQuery)
    expect(makeQuery).toHaveBeenCalledTimes(1)
    expect(makeQuery).toHaveBeenCalledWith(true)
    expect(result.error).toBeNull()
    expect(result.data).toEqual([{ id: 1, filterGroupId: true }])
  })

  it('retries once without the group_id filter on 42703', async () => {
    const makeQuery = vi.fn(async (filterGroupId) => {
      if (filterGroupId) return { data: null, error: { code: '42703', message: 'column does not exist' } }
      return { data: [{ id: 1 }], error: null }
    })
    const result = await queryWithGroupIdFallback(makeQuery)
    expect(makeQuery).toHaveBeenCalledTimes(2)
    expect(makeQuery).toHaveBeenNthCalledWith(1, true)
    expect(makeQuery).toHaveBeenNthCalledWith(2, false)
    expect(result.error).toBeNull()
    expect(result.data).toEqual([{ id: 1 }])
  })

  it('does not retry on an unrelated error code', async () => {
    const makeQuery = vi.fn(async () => ({ data: null, error: { code: 'PGRST301', message: 'jwt expired' } }))
    const result = await queryWithGroupIdFallback(makeQuery)
    expect(makeQuery).toHaveBeenCalledTimes(1)
    expect(result.error.code).toBe('PGRST301')
  })

  it('propagates a second failure instead of retrying again', async () => {
    const makeQuery = vi.fn(async () => ({ data: null, error: { code: '42703' } }))
    const result = await queryWithGroupIdFallback(makeQuery)
    expect(makeQuery).toHaveBeenCalledTimes(2)
    expect(result.error.code).toBe('42703')
  })
})
