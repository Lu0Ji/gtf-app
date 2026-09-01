import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'

const UnreadMessagesContext = createContext(0)

// One realtime subscription for the whole app, not one per nav component.
// Desktop now renders SidebarNav *and* keeps BottomNav mounted (just
// CSS-hidden per breakpoint, see BottomNav's md:hidden) — without this
// shared context each would open its own `messages` channel and duplicate
// the same query, the exact per-instance-subscription duplication
// [[useUserSettings-shared-fetch]] already got bitten by once for settings.
export function UnreadMessagesProvider({ children }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    async function loadUnread() {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null)
      setUnreadCount(count || 0)
    }

    loadUnread()

    const channel = supabase
      .channel('unread-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        loadUnread
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return <UnreadMessagesContext.Provider value={unreadCount}>{children}</UnreadMessagesContext.Provider>
}

export function useUnreadMessages() {
  return useContext(UnreadMessagesContext)
}
