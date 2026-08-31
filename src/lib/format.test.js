import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { formatDateLong, formatTime, setTimeFormatPreference, timeAgo } from './format.js'

describe('formatDateLong', () => {
  it('renders a full Turkish date', () => {
    expect(formatDateLong('2026-08-31T00:00:00Z')).toBe('31 Ağustos 2026')
  })

  it('returns empty string for a missing date', () => {
    expect(formatDateLong(null)).toBe('')
    expect(formatDateLong(undefined)).toBe('')
    expect(formatDateLong('')).toBe('')
  })
})

describe('formatTime', () => {
  afterEach(() => {
    setTimeFormatPreference('24h')
  })

  it('defaults to 24h format', () => {
    // 14:05 UTC — assert on structure rather than a hardcoded local hour
    // since this runs in whatever timezone the CI/dev machine is in.
    const result = formatTime('2026-08-31T14:05:00Z')
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('switches to 12h format when the region preference is set', () => {
    setTimeFormatPreference('12h')
    const result = formatTime('2026-08-31T14:05:00Z')
    expect(result.toLowerCase()).toMatch(/(öö|ös|am|pm)/)
  })

  it('falls back to 24h for an unrecognized value', () => {
    setTimeFormatPreference('nonsense')
    const result = formatTime('2026-08-31T14:05:00Z')
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('returns empty string for a missing date', () => {
    expect(formatTime(null)).toBe('')
  })
})

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-31T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "az önce" for anything under a minute old', () => {
    expect(timeAgo(new Date('2026-08-31T11:59:30Z').toISOString())).toBe('az önce')
  })

  it('shows minutes under an hour', () => {
    expect(timeAgo(new Date('2026-08-31T11:45:00Z').toISOString())).toBe('15 dk')
  })

  it('shows hours under a day', () => {
    expect(timeAgo(new Date('2026-08-31T09:00:00Z').toISOString())).toBe('3 sa')
  })

  it('shows days under a month', () => {
    expect(timeAgo(new Date('2026-08-29T12:00:00Z').toISOString())).toBe('2 gün')
  })

  it('falls back to a full date at 30+ days', () => {
    expect(timeAgo(new Date('2026-01-01T12:00:00Z').toISOString())).toBe('1 Ocak 2026')
  })

  it('returns empty string for a missing date', () => {
    expect(timeAgo(null)).toBe('')
  })
})
