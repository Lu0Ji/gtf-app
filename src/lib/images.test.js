import { describe, expect, it } from 'vitest'
import { fallbackAvatarFor, IMG } from './images.js'

describe('fallbackAvatarFor', () => {
  it('is deterministic — the same key always maps to the same avatar', () => {
    const a = fallbackAvatarFor('user-123')
    const b = fallbackAvatarFor('user-123')
    expect(a).toBe(b)
  })

  it('returns a real IMG() URL', () => {
    expect(fallbackAvatarFor('someone')).toMatch(/^https:\/\/.*\.png$/)
  })

  it('does not throw for a missing key', () => {
    expect(() => fallbackAvatarFor(undefined)).not.toThrow()
    expect(() => fallbackAvatarFor(null)).not.toThrow()
    expect(() => fallbackAvatarFor('')).not.toThrow()
    expect(fallbackAvatarFor(undefined)).toBe(fallbackAvatarFor(''))
  })

  it('spreads different keys across more than one pool entry', () => {
    const ids = new Set()
    for (let i = 0; i < 50; i++) ids.add(fallbackAvatarFor(`profile-${i}`))
    // Not asserting an exact count (hash distribution isn't guaranteed
    // perfectly even) — just that it isn't collapsing everyone onto one
    // face, which was the whole bug this replaced.
    expect(ids.size).toBeGreaterThan(1)
  })

  it('every returned URL is a valid IMG() URL', () => {
    for (let i = 0; i < 20; i++) {
      expect(fallbackAvatarFor(`profile-${i}`)).toBe(IMG(fallbackAvatarFor(`profile-${i}`).split('/').at(-1).replace('.png', '')))
    }
  })
})
