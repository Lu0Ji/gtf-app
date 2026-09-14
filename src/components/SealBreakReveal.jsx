import { findSealStyle } from '../lib/seal-styles.js'

// 'basic' has no medallionGradient/medallionIconColor of its own (see
// seal-styles.js — only the 3 decorated costumes carry those fields). Every
// equipped style still gets the same ceremonial break, just themed to
// whatever the viewer actually has on — a warm wax-red stand-in here so
// 'basic' doesn't fall back to a colorless/undefined gradient.
const BASIC_FALLBACK_GRADIENT = 'radial-gradient(circle at 35% 30%, #d97b56, #a8452c 65%, #7a2e1c 100%)'
const BASIC_FALLBACK_ICON_COLOR = '#fbe9d8'

// Zigzag "crack" boundary shared by both halves — the two clip-paths trace
// the exact same points in opposite winding order, so pre-shatter they tile
// the full circle with no gap or overlap, and the crack-line SVG draws
// along the same points so the drawn line always matches where it splits.
const CRACK_POINTS = [
  [52, 0],
  [44, 15],
  [58, 30],
  [40, 45],
  [56, 60],
  [42, 75],
  [54, 90],
  [46, 100],
]
const LEFT_CLIP = `polygon(0% 0%, ${CRACK_POINTS.map(([x, y]) => `${x}% ${y}%`).join(', ')}, 0% 100%)`
const RIGHT_CLIP = `polygon(100% 0%, ${[...CRACK_POINTS].reverse().map(([x, y]) => `${x}% ${y}%`).join(', ')}, 100% 100%)`
const CRACK_PATH = `M ${CRACK_POINTS.map(([x, y]) => `${x} ${y}`).join(' L ')}`

// DESIGN.md §7: "sealing/opening a prediction... are the app's ceremonial
// moments" — the one named exception to "no animation as the point of the
// interaction". This is that beat for opening: the equipped seal costume's
// own medallion (same gradients/icon as SealDecoration.jsx on the sealed
// card) physically cracks along a jagged line and falls away in two
// halves, instead of the content just appearing underneath.
//
// Mounted only for its own ~1.6s (the call site in TahminKaydi.jsx times
// the unmount to match every keyframe's duration below), and only for a
// LIVE transition someone actually watches happen — never replayed for a
// prediction that was already open when the page loaded.
export default function SealBreakReveal({ equippedStyle }) {
  const style = findSealStyle(equippedStyle)
  const gradient = style.medallionGradient || BASIC_FALLBACK_GRADIENT
  const iconColor = style.medallionIconColor || BASIC_FALLBACK_ICON_COLOR
  const icon = style.medallionIcon || style.lockIcon

  return (
    <div className="reveal-backdrop pointer-events-none fixed inset-0 z-[55] flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="relative h-40 w-40">
        <div className="reveal-flash absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,244,214,0.9),transparent_70%)]" />
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <path
            d={CRACK_PATH}
            fill="none"
            stroke="rgba(255,244,214,0.9)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="100"
            className="reveal-crack-line"
          />
        </svg>
        <div
          className="reveal-shard-left absolute inset-0 flex items-center justify-center rounded-full"
          style={{ background: gradient, color: iconColor, clipPath: LEFT_CLIP, boxShadow: '0 10px 24px rgba(0,0,0,0.4)' }}
        >
          <iconify-icon icon={icon} class="text-4xl"></iconify-icon>
        </div>
        <div
          className="reveal-shard-right absolute inset-0 flex items-center justify-center rounded-full"
          style={{ background: gradient, color: iconColor, clipPath: RIGHT_CLIP, boxShadow: '0 10px 24px rgba(0,0,0,0.4)' }}
        >
          <iconify-icon icon={icon} class="text-4xl"></iconify-icon>
        </div>
      </div>
    </div>
  )
}
