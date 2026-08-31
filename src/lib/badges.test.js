import { describe, expect, it } from 'vitest'
import { BADGES, computeBadgeStats, evaluateBadges } from './badges.js'

const baseProfile = { created_at: new Date(Date.now() - 10 * 86400000).toISOString(), streak_count: 3 }
const zeroCounts = {
  followers: 0,
  following: 0,
  likesGiven: 0,
  likesReceived: 0,
  commentsGiven: 0,
  commentsReceived: 0,
  savesCount: 0,
  groupsJoined: 0,
  groupsCreated: 0,
  disputesRaised: 0,
  referralsCount: 0,
  mentionsReceived: 0,
}

describe('badge catalog', () => {
  it('has exactly 120 badges, 30 per tier, no duplicate slugs', () => {
    expect(BADGES).toHaveLength(120)
    const bySlug = new Set(BADGES.map((b) => b.slug))
    expect(bySlug.size).toBe(120)
    for (const tier of ['baslangic', 'istikrar', 'ustalik', 'efsane']) {
      expect(BADGES.filter((b) => b.tier === tier)).toHaveLength(30)
    }
  })

  it('every badge references a metric computeBadgeStats actually produces', () => {
    const stats = computeBadgeStats({ predictions: [], profile: baseProfile, counts: zeroCounts })
    for (const badge of BADGES) {
      expect(stats, `${badge.slug} → ${badge.metric}`).toHaveProperty(badge.metric)
    }
  })
})

describe('computeBadgeStats', () => {
  it('returns all-zero stats for a brand new profile with no activity', () => {
    const stats = computeBadgeStats({
      predictions: [],
      profile: { created_at: new Date().toISOString(), streak_count: 0 },
      counts: zeroCounts,
    })
    expect(stats.predictionsCreated).toBe(0)
    expect(stats.accuracyPct).toBe(0)
    expect(stats.bestStreak).toBe(0)
  })

  it('computes accuracy and best streak from resolved predictions in order', () => {
    const predictions = [
      { category: 'spor', status: 'verified_correct', created_at: '2026-01-01', event_date: '2026-01-05', verified_at: '2026-01-05' },
      { category: 'spor', status: 'verified_correct', created_at: '2026-01-02', event_date: '2026-01-06', verified_at: '2026-01-06' },
      { category: 'ekonomi', status: 'verified_incorrect', created_at: '2026-01-03', event_date: '2026-01-07', verified_at: '2026-01-07' },
      { category: 'spor', status: 'verified_correct', created_at: '2026-01-04', event_date: '2026-01-08', verified_at: '2026-01-08' },
    ]
    const stats = computeBadgeStats({ predictions, profile: baseProfile, counts: zeroCounts })
    expect(stats.predictionsVerified).toBe(4)
    expect(stats.predictionsCorrect).toBe(3)
    expect(stats.accuracyPct).toBeCloseTo(75)
    // best consecutive-correct run: correct, correct, (reset), correct → 2
    expect(stats.bestStreak).toBe(2)
    expect(stats.maxCategoryCorrect).toBe(3) // 'spor' has 3 correct total (items 1, 2, 4)
  })

  it('counts distinct categories and per-category correct counts separately from totals', () => {
    const predictions = [
      { category: 'spor', status: 'verified_correct', created_at: '2026-01-01', event_date: '2026-01-02', verified_at: '2026-01-02' },
      { category: 'spor', status: 'sealed', created_at: '2026-01-01', event_date: '2027-01-01' },
      { category: 'ekonomi', status: 'sealed', created_at: '2026-01-01', event_date: '2027-01-01' },
    ]
    const stats = computeBadgeStats({ predictions, profile: baseProfile, counts: zeroCounts })
    expect(stats.predictionsCreated).toBe(3)
    expect(stats.distinctCategories).toBe(2)
    expect(stats.distinctCategoriesCorrect).toBe(1)
  })

  it('classifies horizon buckets (week/month/long-ahead, short-term) from event_date vs created_at', () => {
    const day = 86400000
    const now = new Date('2026-06-01T00:00:00Z')
    const predictions = [
      { category: 'spor', status: 'sealed', created_at: now.toISOString(), event_date: new Date(now.getTime() + 2 * day).toISOString() },
      { category: 'spor', status: 'sealed', created_at: now.toISOString(), event_date: new Date(now.getTime() + 10 * day).toISOString() },
      { category: 'spor', status: 'sealed', created_at: now.toISOString(), event_date: new Date(now.getTime() + 45 * day).toISOString() },
      { category: 'spor', status: 'sealed', created_at: now.toISOString(), event_date: new Date(now.getTime() + 120 * day).toISOString() },
    ]
    const stats = computeBadgeStats({ predictions, profile: baseProfile, counts: zeroCounts })
    expect(stats.shortTermCount).toBe(1)
    expect(stats.weekAheadCount).toBe(3) // 10, 45, 120 days are all >= 7
    expect(stats.monthAheadCount).toBe(2) // 45, 120 >= 30
    expect(stats.longAheadCount).toBe(1) // 120 >= 90
  })

  it('treats is_private and is_sensitive and media_url/evidence as independent flags', () => {
    const predictions = [
      { category: 'spor', status: 'verified_correct', created_at: '2026-01-01', event_date: '2026-01-02', verified_at: '2026-01-02', is_private: true },
      { category: 'spor', status: 'verified_correct', created_at: '2026-01-01', event_date: '2026-01-02', verified_at: '2026-01-02', is_sensitive: true, media_url: 'x' },
      { category: 'spor', status: 'verified_correct', created_at: '2026-01-01', event_date: '2026-01-02', verified_at: '2026-01-02', evidence_note: 'kaynak' },
    ]
    const stats = computeBadgeStats({ predictions, profile: baseProfile, counts: zeroCounts })
    expect(stats.capsulesCreated).toBe(1)
    expect(stats.sensitiveMarked).toBe(1)
    expect(stats.mediaUsedCount).toBe(1)
    expect(stats.evidenceUsedCount).toBe(1)
  })
})

describe('evaluateBadges', () => {
  it('marks a badge earned once its metric reaches the target', () => {
    const stats = computeBadgeStats({ predictions: [{ category: 'spor', status: 'sealed', created_at: '2026-01-01', event_date: '2026-02-01' }], profile: baseProfile, counts: zeroCounts })
    const evaluated = evaluateBadges(stats)
    const ilkKayit = evaluated.find((b) => b.slug === 'ilk-kayit')
    expect(ilkKayit.earned).toBe(true)
    expect(ilkKayit.progressCurrent).toBe(1)
  })

  it('respects a minAccuracy gate even when the raw count target is met', () => {
    // keskin-goz needs predictionsCorrect >= 20 AND accuracyPct >= 70 —
    // hold correct count fixed at exactly 20 and only vary total verified,
    // so the raw-count target is satisfied in both cases and only the
    // accuracy gate differs.
    const makeVerified = (correct, incorrect) => [
      ...Array.from({ length: correct }, () => ({
        category: 'spor',
        status: 'verified_correct',
        created_at: '2026-01-01',
        event_date: '2026-01-02',
        verified_at: '2026-01-02',
      })),
      ...Array.from({ length: incorrect }, () => ({
        category: 'spor',
        status: 'verified_incorrect',
        created_at: '2026-01-01',
        event_date: '2026-01-02',
        verified_at: '2026-01-02',
      })),
    ]

    const belowThreshold = computeBadgeStats({ predictions: makeVerified(20, 20), profile: baseProfile, counts: zeroCounts }) // 50%
    const atThreshold = computeBadgeStats({ predictions: makeVerified(20, 0), profile: baseProfile, counts: zeroCounts }) // 100%

    const keskinGozBelow = evaluateBadges(belowThreshold).find((b) => b.slug === 'keskin-goz')
    const keskinGozAt = evaluateBadges(atThreshold).find((b) => b.slug === 'keskin-goz')
    expect(keskinGozBelow.progressCurrent).toBe(20) // raw target met either way
    expect(keskinGozBelow.earned).toBe(false) // ...but accuracy gate fails
    expect(keskinGozAt.earned).toBe(true)
  })

  it('caps progressCurrent at the target instead of overshooting', () => {
    const predictions = Array.from({ length: 500 }, () => ({
      category: 'spor',
      status: 'sealed',
      created_at: '2026-01-01',
      event_date: '2026-02-01',
    }))
    const stats = computeBadgeStats({ predictions, profile: baseProfile, counts: zeroCounts })
    const evaluated = evaluateBadges(stats)
    const ilkKayit = evaluated.find((b) => b.slug === 'ilk-kayit')
    expect(ilkKayit.progressCurrent).toBe(1) // target is 1, not 500
    expect(ilkKayit.earned).toBe(true)
  })
})
