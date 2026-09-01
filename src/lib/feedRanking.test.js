import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { scoreFeedItem, rankFeed } from './feedRanking.js'

const basePrediction = (overrides = {}) => ({
  id: 'p1',
  author_id: 'author-1',
  category: 'spor',
  created_at: new Date().toISOString(),
  difficulty_tier: null,
  ...overrides,
})

describe('scoreFeedItem', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('scores a just-posted prediction higher than an old one, all else equal', () => {
    const fresh = basePrediction({ created_at: new Date('2026-09-01T11:55:00Z').toISOString() })
    const old = basePrediction({ created_at: new Date('2026-08-30T12:00:00Z').toISOString() })
    expect(scoreFeedItem(fresh, {}, {})).toBeGreaterThan(scoreFeedItem(old, {}, {}))
  })

  it('lets strong engagement outrank a merely-newer, unengaged post', () => {
    const newQuiet = basePrediction({ id: 'a', created_at: new Date('2026-09-01T11:00:00Z').toISOString() })
    const olderPopular = basePrediction({ id: 'b', created_at: new Date('2026-09-01T02:00:00Z').toISOString() })
    const quietScore = scoreFeedItem(newQuiet, { likeCount: 0, commentCount: 0 }, {})
    const popularScore = scoreFeedItem(olderPopular, { likeCount: 20, commentCount: 5 }, {})
    expect(popularScore).toBeGreaterThan(quietScore)
  })

  it('boosts a prediction from someone the viewer follows', () => {
    const p = basePrediction({ author_id: 'followed-author' })
    const withoutFollow = scoreFeedItem(p, {}, { followingIds: new Set() })
    const withFollow = scoreFeedItem(p, {}, { followingIds: new Set(['followed-author']) })
    expect(withFollow).toBeGreaterThan(withoutFollow)
  })

  it('boosts a prediction matching a declared interest', () => {
    const p = basePrediction({ category: 'ekonomi' })
    const withoutInterest = scoreFeedItem(p, {}, { interests: [] })
    const withInterest = scoreFeedItem(p, {}, { interests: ['Ekonomi'] })
    expect(withInterest).toBeGreaterThan(withoutInterest)
  })

  it('boosts harder difficulty tiers', () => {
    const easy = basePrediction({ difficulty_tier: 'baslangic' })
    const hard = basePrediction({ difficulty_tier: 'efsane' })
    expect(scoreFeedItem(hard, {}, {})).toBeGreaterThan(scoreFeedItem(easy, {}, {}))
  })
})

describe('rankFeed', () => {
  it('sorts highest score first', () => {
    const quiet = basePrediction({ id: 'quiet' })
    const popular = basePrediction({ id: 'popular' })
    const ranked = rankFeed(
      [quiet, popular],
      { quiet: { likeCount: 0, commentCount: 0 }, popular: { likeCount: 50, commentCount: 10 } },
      {}
    )
    expect(ranked.map((p) => p.id)).toEqual(['popular', 'quiet'])
  })

  it('keeps original order for equal scores instead of shuffling', () => {
    const a = basePrediction({ id: 'a', created_at: '2026-09-01T10:00:00Z' })
    const b = basePrediction({ id: 'b', created_at: '2026-09-01T10:00:00Z' })
    const ranked = rankFeed([a, b], {}, {})
    expect(ranked.map((p) => p.id)).toEqual(['a', 'b'])
  })
})
