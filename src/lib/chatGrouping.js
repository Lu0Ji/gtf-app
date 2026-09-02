import { formatDateLong } from './format.js'

// Shared by Sohbet.jsx (1:1 DMs) and GrupSohbeti.jsx (group chat) — both
// render the same "consecutive messages from one sender collapse into a
// single visual run" pattern, just grouped by sender_id either way.

// Consecutive messages from the same sender, sent within this long a gap,
// render as one run (single avatar/name, tight spacing, one timestamp)
// instead of a full block per message.
export const GROUP_GAP_MS = 5 * 60 * 1000

export function dayKey(dateStr) {
  return new Date(dateStr).toDateString()
}

export function dayLabel(dateStr) {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (dayKey(dateStr) === dayKey(today)) return 'Bugün'
  if (dayKey(dateStr) === dayKey(yesterday)) return 'Dün'
  return formatDateLong(dateStr)
}

// `messages` must be sorted ascending by created_at. Returns per-message
// grouping flags for messages[i], comparing against its immediate
// neighbors only (cheap enough to call per-render, no memoization needed
// for a chat-length list).
export function groupInfo(messages, i) {
  const m = messages[i]
  const prev = messages[i - 1]
  const next = messages[i + 1]
  const newDay = !prev || dayKey(m.created_at) !== dayKey(prev.created_at)
  const isFirstInGroup =
    newDay || prev.sender_id !== m.sender_id || new Date(m.created_at) - new Date(prev.created_at) > GROUP_GAP_MS
  const isLastInGroup =
    !next ||
    dayKey(next.created_at) !== dayKey(m.created_at) ||
    next.sender_id !== m.sender_id ||
    new Date(next.created_at) - new Date(m.created_at) > GROUP_GAP_MS
  return { newDay, isFirstInGroup, isLastInGroup }
}
