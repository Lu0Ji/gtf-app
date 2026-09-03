// Tiers by streak length — each one burns brighter and flickers faster than
// the last, so a longer streak visibly reads as "worth more" at a glance,
// not just a bigger number next to the same static icon.
const TIERS = [
  { max: 0, color: null, glow: null, speed: null },
  { max: 2, color: '#d9743a', glow: 'rgba(217,116,58,0.55)', speed: '2.6s' },
  { max: 6, color: '#e0602a', glow: 'rgba(224,96,42,0.6)', speed: '2.2s' },
  { max: 29, color: '#e04a1e', glow: 'rgba(224,74,30,0.7)', speed: '1.8s' },
  { max: Infinity, color: '#f2a01d', glow: 'rgba(242,160,29,0.85)', speed: '1.3s' },
]

function tierFor(count) {
  return TIERS.find((t) => count <= t.max) ?? TIERS[TIERS.length - 1]
}

// Exported so a call site can tint the streak NUMBER to match the flame
// (see SidebarNav.jsx) without duplicating these thresholds.
export function streakTierColor(count) {
  return tierFor(count).color
}

const SIZE_CLASS = { sm: 'text-sm', base: 'text-base', lg: 'text-2xl' }

// A streak of 0 renders a plain unlit outline. Past that it visibly
// "catches" — see the .streak-flame-lit keyframes in index.css. One earned
// exception to DESIGN.md §7's "no gratuitous motion" rule: this is exactly
// the kind of detail meant to feel satisfying every single time, not once.
export default function StreakFlame({ count = 0, size = 'base', className = '' }) {
  const tier = tierFor(count)
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.base

  if (!tier.color) {
    return <iconify-icon icon="lucide:flame" class={`${sizeClass} text-muted-foreground/45 ${className}`}></iconify-icon>
  }

  return (
    <iconify-icon
      icon="lucide:flame"
      class={`streak-flame-lit ${sizeClass} ${className}`}
      style={{ '--flame-color': tier.color, '--flame-glow': tier.glow, '--flame-speed': tier.speed }}
    ></iconify-icon>
  )
}
