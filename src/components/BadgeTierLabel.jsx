import { useTranslation } from 'react-i18next'
import { TIERS } from '../lib/badges.js'

// Compact, always-readable difficulty cue for a badge's tier — a text
// label plus a 1-4 dot meter (the tier's rank in TIERS, Başlangıç→Efsane)
// so difficulty scans at a glance across a grid of many badges. Shown
// regardless of earned/locked — difficulty is a property of the badge
// itself, not of whether the viewer has it yet. Complements (doesn't
// replace) BadgeMedallion's own earned-state distinction (flat tint vs.
// glossy medal for Ustalık/Efsane) — that's a nice detail once you notice
// it, this is the explicit version for a quick scan.
export default function BadgeTierLabel({ tier, className = '' }) {
  const { t } = useTranslation()
  const rank = TIERS.findIndex((tr) => tr.key === tier.key) + 1
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {TIERS.map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: i < rank ? tier.ink : 'var(--color-muted)' }}
          />
        ))}
      </span>
      <span className="text-[10px] font-bold" style={{ color: tier.ink }}>
        {t(tier.labelKey)}
      </span>
    </span>
  )
}
