// FireVibe-generated project imagery for GTF (project id 9fceca91-95c2-49a9-805b-297fd498bdfb).
export const IMG = (id) =>
  `https://fwtngjyirchhhysukjxi.supabase.co/storage/v1/object/public/project-images/9fceca91-95c2-49a9-805b-297fd498bdfb/${id}.png`

// Fallback avatar pool: every screen used to fall back to a single fixed
// DEFAULT_AVATAR photo, so any two profiles without their own avatar_url
// showed up as the exact same face — a feed of "different" people that all
// look identical reads as fake/empty rather than like an active community.
// FireVibe's design had ~20 distinct portrait photos generated for exactly
// this kind of variety, but only 2 were ever wired in; the rest were never
// checked before this pass — downloaded and inspected every one, and half
// turned out to be broken (a person's photo boxed in by an unrelated tiled
// collage of robot illustrations, a recurring artifact of this project's
// image generation). Only the ones that render as one coherent photo are
// listed here.
const AVATAR_POOL_IDS = [
  'fc4eb4df-87ce-4cd9-bdd3-80a434cd8ddd',
  'a97f3f05-c665-4b5c-94c7-c83149118bc9',
  '2ebd8673-cdb6-436f-8c55-6f6cb7489059',
  '86e36643-3023-4f68-ba1c-4d2addba5617',
  '3494e856-c763-439f-b959-54faed7982c2',
  'd0ba0d80-c26c-40af-bdd9-875561dc4ae5',
  '373eb324-cbb6-4578-b81a-266c3459b694',
  'f344a36f-c08a-43ed-9fdd-515f4a0dd025',
  'eb6705b4-d387-49ff-8ebc-1f69976d9a8e',
  '37ea8988-d2bb-4bc4-8a11-d69241776152',
  '019082da-d2f3-4096-8312-568469ae8714',
  'd017d967-cf31-4c33-bd50-b42767685f5c',
]

// Deterministic, not random: the same profile always gets the same
// fallback avatar across renders/reloads instead of flickering between
// different faces. `key` should be the profile's id (or any other stable,
// reasonably-unique string — username works too); undefined/empty just
// lands on the first pool entry rather than throwing.
export function fallbackAvatarFor(key) {
  const str = key || ''
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return IMG(AVATAR_POOL_IDS[hash % AVATAR_POOL_IDS.length])
}
