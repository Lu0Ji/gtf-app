import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'

const UnreadActivityContext = createContext({ unreadCount: 0, markActivitySeen: () => {} })

// Same shape as UnreadMessagesContext — one shared subscription set for the
// whole app, not one per nav component. "Activity" here means the same
// three received-from-others event kinds Hareketler.jsx already surfaces
// (likes, comments, new followers) — not predictions/saves/groups, which
// are things *you* did, not things to be notified about.
//
// No `read_at` column exists on prediction_likes/prediction_comments/
// follows (and this project currently has no DB migration access — see
// the pending-migration-backlog memory), so "unread" is a client-side
// last-seen timestamp in localStorage instead of a server-tracked flag.
// markActivitySeen() (called by Hareketler.jsx on mount) just bumps that
// timestamp forward; the three count queries below are re-run against it.
const SEEN_KEY = 'gtf-activity-seen-at'

function loadSeenAt() {
  try {
    return localStorage.getItem(SEEN_KEY) || new Date(0).toISOString()
  } catch {
    return new Date(0).toISOString()
  }
}

export function UnreadActivityProvider({ children }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const loadUnread = useCallback(async () => {
    if (!user) return
    const seenAt = loadSeenAt()
    const [{ count: likes }, { count: comments }, { count: follows }] = await Promise.all([
      supabase
        .from('prediction_likes')
        .select('*, predictions!inner(author_id)', { count: 'exact', head: true })
        .eq('predictions.author_id', user.id)
        .neq('user_id', user.id)
        .gt('created_at', seenAt),
      supabase
        .from('prediction_comments')
        .select('*, predictions!inner(author_id)', { count: 'exact', head: true })
        .eq('predictions.author_id', user.id)
        .neq('author_id', user.id)
        .gt('created_at', seenAt),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id)
        .eq('status', 'accepted')
        .gt('created_at', seenAt),
    ])
    setUnreadCount((likes || 0) + (comments || 0) + (follows || 0))
  }, [user])

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    loadUnread()

    const channel = supabase
      .channel('unread-activity-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prediction_likes' }, loadUnread)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prediction_comments' }, loadUnread)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` }, loadUnread)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loadUnread])

  const markActivitySeen = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, new Date().toISOString())
    } catch {
      // localStorage unavailable (private mode etc.) — badge just won't
      // clear, not worth surfacing an error for.
    }
    setUnreadCount(0)
  }, [])

  return (
    <UnreadActivityContext.Provider value={{ unreadCount, markActivitySeen }}>
      {children}
    </UnreadActivityContext.Provider>
  )
}

export function useUnreadActivity() {
  return useContext(UnreadActivityContext)
}
