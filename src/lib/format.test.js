import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import i18n from '../i18n/index.js'
import { formatDateLong, formatTime, formatTimeUntil, setTimeFormatPreference, timeAgo } from './format.js'

// format.js's phrasing/date locale now follows the app's active language
// (see i18n/index.js) instead of a hardcoded 'tr-TR' — these assertions are
// all in Turkish, so pin the language regardless of the test runner's own
// navigator.language (jsdom defaults to 'en-US', which would otherwise
// silently flip every string below to English).
beforeAll(async () => {
  await i18n.changeLanguage('tr')
})

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

// Regression: ISSUE — extracted from Kesfet.jsx's inline "Yakında
// açılacaklar" countdown so Gruplar/GrupDetayi's group-opening teaser reuses
// the exact same wording instead of drifting into a second implementation.
// Found by /qa-adjacent feature work on 2026-09-01.
describe('formatTimeUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-31T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows hours under a day', () => {
    expect(formatTimeUntil(new Date('2026-08-31T15:00:00Z').toISOString())).toBe('3 saat sonra')
  })

  it('shows days at 24h+', () => {
    expect(formatTimeUntil(new Date('2026-09-03T12:00:00Z').toISOString())).toBe('3 gün sonra')
  })

  it('floors at "1 saat sonra" instead of going to 0/negative for something opening any moment now', () => {
    expect(formatTimeUntil(new Date('2026-08-31T12:00:10Z').toISOString())).toBe('1 saat sonra')
  })

  it('returns empty string for a missing date', () => {
    expect(formatTimeUntil(null)).toBe('')
  })
})
