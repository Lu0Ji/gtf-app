// Shared badge visual, used everywhere a rozet renders (Rozetler.jsx's
// catalog grid + showcase editor, BadgeShowcase.jsx's profile-header
// vitrin) so earning a badge feels like the same real object wherever it
// shows up, not a different icon-in-a-box per screen.
//
// Locked and Başlangıç/İstikrar-earned badges stay deliberately plain — a
// flat tinted circle, same weight as everything else on the page. Ustalık
// and Efsane badges are the ones that actually take real effort (accuracy
// streaks, hundreds of predictions, months of daily use), so only those get
// the glossy gradient-medal treatment: those are the ones meant to land as
// "I actually earned this," not just another checklist item.
const SIZES = {
  sm: { box: 'h-9 w-9', text: 'text-lg', badge: 'h-4 w-4 text-[8px] -right-1 -top-1' },
  md: { box: 'h-12 w-12', text: 'text-2xl', badge: 'h-5 w-5 text-[9px] -right-1 -top-1' },
}

export default function BadgeMedallion({ icon, tier, earned, size = 'sm' }) {
  const s = SIZES[size] || SIZES.sm
  const isPremium = tier.key === 'ustalik' || tier.key === 'efsane'
  const isLegendary = tier.key === 'efsane'

  if (!earned) {
    return (
      <span
        className={`flex ${s.box} shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted ${s.text} text-muted-foreground`}
      >
        <iconify-icon icon={icon}></iconify-icon>
      </span>
    )
  }

  if (!isPremium) {
    return (
      <span
        className={`flex ${s.box} shrink-0 items-center justify-center rounded-full ${s.text}`}
        style={{ background: tier.tint, color: tier.ink }}
      >
        <iconify-icon icon={icon}></iconify-icon>
      </span>
    )
  }

  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={`flex ${s.box} items-center justify-center rounded-full text-white ${s.text}`}
        style={{
          backgroundImage: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.55), transparent 55%), linear-gradient(135deg, color-mix(in srgb, ${tier.ink}, white 30%), ${tier.ink})`,
          boxShadow: isLegendary
            ? `0 0 0 2px var(--color-card), 0 0 12px 1px color-mix(in srgb, ${tier.ink} 55%, transparent), 0 2px 5px rgba(0,0,0,0.18)`
            : `0 2px 5px rgba(0,0,0,0.15)`,
        }}
      >
        <iconify-icon icon={icon}></iconify-icon>
      </span>
      {isLegendary && (
        <span
          className={`absolute ${s.badge} flex items-center justify-center rounded-full bg-card shadow`}
          style={{ color: tier.ink }}
        >
          <iconify-icon icon="lucide:sparkles"></iconify-icon>
        </span>
      )}
    </span>
  )
}
