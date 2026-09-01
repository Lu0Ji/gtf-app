import { difficultyMeta } from '../lib/difficulty.js'

// Small tier chip for prediction cards (feed/group/profile lists) — the
// full version with the multiplier lives on Tahmin Kaydı; this is just
// enough to signal at a glance which cards are the harder calls. Renders
// nothing for predictions created before the difficulty migration (no
// tier stored) instead of showing a misleading default.
export default function DifficultyChip({ tier, className = '' }) {
  const meta = difficultyMeta(tier)
  if (!meta) return null
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${className}`}
      style={{ background: meta.tint, color: meta.ink }}
    >
      <iconify-icon icon={meta.icon} class="text-[10px]"></iconify-icon>
      {meta.label}
    </span>
  )
}
