// FireVibe-generated project imagery for GTF (project id 9fceca91-95c2-49a9-805b-297fd498bdfb).
export const IMG = (id) =>
  `https://fwtngjyirchhhysukjxi.supabase.co/storage/v1/object/public/project-images/9fceca91-95c2-49a9-805b-297fd498bdfb/${id}.png`

// 2026-09-07: the fallback used to be one of ~12 FireVibe-generated
// portrait *photos* of real-looking (but fake) faces, picked deterministically
// by hashing the profile id — flagged during a beta pass as a real bug, not
// cosmetic: a brand-new user who never uploaded anything got handed what
// looks like an actual photo of a stranger, which reads as deceptive
// ("is this a real person's picture?") rather than as an obvious
// placeholder. Replaced with a generated identicon-style mark instead — a
// solid color (from the app's own real theme palette, not an invented one)
// plus a simple keyhole glyph, the same shape this app's own icon uses
// (see public/favicon.svg) so an unset avatar reads as "this app's mark",
// never as a face. Self-contained SVG data URI: no network request, no
// external avatar service dependency, works offline, same instant
// determinism as before (same id -> same color, every render).
const AVATAR_COLORS = [
  '#356a8a', // primary
  '#183b5b', // chart1
  '#167c80', // chart2
  '#a76522', // chart3
  '#6b5a97', // chart4
  '#9d3b51', // chart5
  '#267050', // success
  '#6f9fba', // accent
]

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return hash
}

// Same keyhole silhouette as the app icon, scaled into a 100x100 viewBox.
function avatarSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${color}"/><circle cx="50" cy="40" r="13" fill="#fff" fill-opacity="0.92"/><path d="M38 49 L62 49 L53 82 L47 82 Z" fill="#fff" fill-opacity="0.92"/></svg>`
}

// Deterministic, not random: the same profile always gets the same
// fallback avatar across renders/reloads instead of flickering between
// different marks. `key` should be the profile's id (or any other stable,
// reasonably-unique string — username works too); undefined/empty just
// lands on the first palette entry rather than throwing.
export function fallbackAvatarFor(key) {
  const hash = hashString(key || '')
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length]
  return `data:image/svg+xml,${encodeURIComponent(avatarSvg(color))}`
}
