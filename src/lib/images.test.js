import { describe, expect, it } from 'vitest'
import { fallbackAvatarFor } from './images.js'

describe('fallbackAvatarFor', () => {
  it('is deterministic — the same key always maps to the same avatar', () => {
    const a = fallbackAvatarFor('user-123')
    const b = fallbackAvatarFor('user-123')
    expect(a).toBe(b)
  })

  it('returns a self-contained SVG data URI, not a real photo', () => {
    expect(fallbackAvatarFor('someone')).toMatch(/^data:image\/svg\+xml,/)
  })

  it('does not throw for a missing key', () => {
    expect(() => fallbackAvatarFor(undefined)).not.toThrow()
    expect(() => fallbackAvatarFor(null)).not.toThrow()
    expect(() => fallbackAvatarFor('')).not.toThrow()
    expect(fallbackAvatarFor(undefined)).toBe(fallbackAvatarFor(''))
  })

  it('spreads different keys across more than one palette color', () => {
    const urls = new Set()
    for (let i = 0; i < 50; i++) urls.add(fallbackAvatarFor(`profile-${i}`))
    // Not asserting an exact count (hash distribution isn't guaranteed
    // perfectly even) — just that it isn't collapsing everyone onto one
    // color, which was the whole bug the original pool replaced.
    expect(urls.size).toBeGreaterThan(1)
  })
})
