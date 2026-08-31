import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_META, GROUP_CATEGORIES } from './categories.js'

describe('categories', () => {
  it('excludes the groups-only "genel" catch-all from prediction categories', () => {
    expect(CATEGORIES).not.toContain('Genel')
    expect(CATEGORIES.length).toBe(Object.keys(CATEGORY_META).length - 1)
  })

  it('every CATEGORY_META entry has both an icon and a label', () => {
    for (const [key, meta] of Object.entries(CATEGORY_META)) {
      expect(meta.icon, `${key}.icon`).toBeTruthy()
      expect(meta.label, `${key}.label`).toBeTruthy()
    }
  })

  it('prefixes group categories with "Genel", then the real topics', () => {
    expect(GROUP_CATEGORIES[0]).toBe('Genel')
    expect(GROUP_CATEGORIES.slice(1)).toEqual(CATEGORIES)
  })

  it('has no duplicate labels', () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length)
  })
})
