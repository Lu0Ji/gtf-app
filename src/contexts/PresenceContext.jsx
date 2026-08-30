import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { useUserSettings } from '../hooks/useUserSettings.js'

const PresenceContext = createContext(new Set())

// One shared Realtime presence channel for the whole app. Everyone who has
// "Çevrimiçi durumunu göster" on tracks themselves in it; everyone (on or
// off) reads from it, so you can always see who else is online right now.
export function PresenceProvider({ children }) {
  const { user } = useAuth()
  const { settings, loading } = useUserSettings()
  const [onlineIds, setOnlineIds] = useState(new Set())

  useEffect(() => {
    if (!user || loading) return

    const channel = supabase.channel('presence:online', {
      config: { presence: { key: user.id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && settings.privacy.showOnline) {
          channel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loading, settings.privacy.showOnline])

  return <PresenceContext.Provider value={onlineIds}>{children}</PresenceContext.Provider>
}

export function useOnlineUsers() {
  return useContext(PresenceContext)
}
