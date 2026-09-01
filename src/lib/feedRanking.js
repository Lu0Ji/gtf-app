// Anasayfa's feed used to be pure reverse-chronological — no signal about
// what's actually worth seeing first beyond "posted most recently". This
// re-ranks each fetched page (not the whole historical corpus — see
// PredictionFeed in Anasayfa.jsx) by a real, explainable score instead of
// a black-box model, using only signals already fetched for other reasons:
//   - recency: still the base signal, just decayed instead of absolute —
//     a 30-min-old post outranks a 10-hour-old one, but not so hard that
//     genuine engagement can never catch up to something merely newer.
//   - engagement: likes + comments on the post itself.
//   - follow boost: predictions from people you actually follow.
//   - interest boost: matches a category from "İlgi alanların" (Uygulama
//     Ayarları) — same interest list Kesfet.jsx already ranks against.
//   - difficulty boost: a harder call (lib/difficulty.js tiers) is more
//     interesting to see resolved, so it's worth a small nudge.
const DIFFICULTY_BOOST = { baslangic: 0, istikrar: 5, ustalik: 10, efsane: 15 }

export function scoreFeedItem(prediction, social = {}, context = {}) {
  const { followingIds = new Set(), interests = [] } = context

  const hoursAgo = Math.max(0, (Date.now() - new Date(prediction.created_at).getTime()) / 3600000)
  const recencyScore = 100 / (1 + hoursAgo / 12)

  const engagementScore = (social.likeCount || 0) * 3 + (social.commentCount || 0) * 5
  const followBoost = followingIds.has(prediction.author_id) ? 40 : 0
  const interestBoost = interests.some((i) => i.toLowerCase() === prediction.category) ? 20 : 0
  const difficultyBoost = DIFFICULTY_BOOST[prediction.difficulty_tier] || 0

  return recencyScore + engagementScore + followBoost + interestBoost + difficultyBoost
}

// Stable sort (score ties keep their fetched — i.e. chronological — order)
// so two equally-scored posts don't visibly shuffle between renders.
export function rankFeed(predictions, socialById = {}, context = {}) {
  return predictions
    .map((p, index) => ({ p, index, score: scoreFeedItem(p, socialById[p.id], context) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.p)
}
