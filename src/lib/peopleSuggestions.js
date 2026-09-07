import { supabase } from './supabase.js'

// "People you may know": ranked by how many people the viewer already
// follows also follow them — the classic mutual-connection signal, and
// what the user actually asked for ("insanlara takipleşmeye göre kişileri
// gösteriririz"). A cold-start account (following nobody yet, or with too
// thin a follow graph to fill `limit`) has no such signal, so newest-
// joined profiles fill any remaining slots — that newest-joiner query was
// the ENTIRE algorithm before (Anasayfa.jsx/RightRail.jsx's old
// SuggestedPeople), kept here as a graceful fallback rather than dropped.
// Self, already-followed, and blocked accounts are excluded from both.
//
// `mutualCount` on each result is 0 for a fallback (newest-joiner) pick —
// callers use that to label the card correctly ("N ortak takip" vs "Yeni
// katıldı") instead of guessing from position.
export async function fetchPeopleSuggestions(userId, { limit = 5 } = {}) {
  const [{ data: following }, { data: blockedRows }] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', userId),
    supabase.rpc('blocked_user_ids'),
  ])
  const followingIds = (following || []).map((f) => f.following_id)
  const excludeSet = new Set(followingIds)
  excludeSet.add(userId)
  for (const row of blockedRows || []) excludeSet.add(row.blocked_user_ids ?? row)

  const mutualCounts = new Map()
  if (followingIds.length > 0) {
    const { data: secondDegree } = await supabase
      .from('follows')
      .select('following_id')
      .in('follower_id', followingIds)
    for (const row of secondDegree || []) {
      if (excludeSet.has(row.following_id)) continue
      mutualCounts.set(row.following_id, (mutualCounts.get(row.following_id) || 0) + 1)
    }
  }

  const mutualIds = [...mutualCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
  const mutualIdSet = new Set(mutualIds)

  let mutualProfiles = []
  if (mutualIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', mutualIds)
    const profileMap = new Map((data || []).map((p) => [p.id, p]))
    mutualProfiles = mutualIds.map((id) => profileMap.get(id)).filter(Boolean)
  }

  const stillNeeded = limit - mutualProfiles.length
  let fallbackProfiles = []
  if (stillNeeded > 0) {
    // Same static-limit-then-client-filter shape the old newest-joiner
    // query already used — plenty of headroom for `stillNeeded` to survive
    // filtering out follows/blocks/mutuals on any realistic account.
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .order('created_at', { ascending: false })
      .limit(30)
    fallbackProfiles = (data || [])
      .filter((p) => !excludeSet.has(p.id) && !mutualIdSet.has(p.id))
      .slice(0, stillNeeded)
  }

  return [
    ...mutualProfiles.map((p) => ({ ...p, mutualCount: mutualCounts.get(p.id) })),
    ...fallbackProfiles.map((p) => ({ ...p, mutualCount: 0 })),
  ]
}
