// Display helpers for predictions.difficulty_tier — the score itself is
// computed server-side (see supabase/schema.sql's
// compute_prediction_difficulty trigger); this just maps the stored tier
// to what a card/badge needs to render. Reuses Rozetler's own tier
// palette/labels (lib/badges.js TIERS) so difficulty reads as the same
// vocabulary as badge tiers, not a second competing scale.
import { TIERS } from './badges.js'

const TIER_ICONS = {
  baslangic: 'lucide:gauge',
  istikrar: 'lucide:flame',
  ustalik: 'lucide:swords',
  efsane: 'lucide:crown',
}

const TIER_MULTIPLIERS = {
  baslangic: 1,
  istikrar: 1.25,
  ustalik: 1.75,
  efsane: 2.5,
}

export function difficultyMeta(tier) {
  const t = TIERS.find((t) => t.key === tier)
  if (!t) return null
  return { ...t, icon: TIER_ICONS[tier], multiplier: TIER_MULTIPLIERS[tier] }
}
