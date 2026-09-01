import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { setTimeFormatPreference } from '../lib/format.js'

export const DEFAULT_SETTINGS = {
  notifications: {
    likes: true,
    comments: true,
    newFollowers: true,
    groupActivity: true,
    messages: true,
    sealOpenings: true,
    mentions: true,
  },
  content: {
    interests: [],
    mutedWords: [],
  },
  privacy: {
    showOnline: true,
  },
  // Bölge ve Tarih Biçimi — the one real region/format control (see
  // lib/format.js for why country/timezone/date-order aren't here too).
  region: {
    timeFormat: '24h',
  },
}

function mergeSettings(stored) {
  const s = stored || {}
  return {
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(s.notifications || {}) },
    content: { ...DEFAULT_SETTINGS.content, ...(s.content || {}) },
    privacy: { ...DEFAULT_SETTINGS.privacy, ...(s.privacy || {}) },
    region: { ...DEFAULT_SETTINGS.region, ...(s.region || {}) },
  }
}

const UserSettingsContext = createContext(null)

// Shared settings blob (Ayarlar screen: notification/content/privacy prefs).
// Loads once per user via one Supabase row, then fans out to every screen
// that reads it — Anasayfa, PresenceContext, Hareketler, UygulamaAyarlari —
// instead of each call site running its own duplicate fetch.
export function UserSettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    // Right after signup/signin, this can fire before the client's
    // auth-header context has fully caught up with the freshly-issued
    // session, which 401s once and then works fine on any later request.
    // Retry once before giving up and falling back to defaults, instead of
    // silently eating a real failure.
    function fetchSettings(retriesLeft) {
      supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (cancelled) return
          if (error && retriesLeft > 0) {
            setTimeout(() => !cancelled && fetchSettings(retriesLeft - 1), 500)
            return
          }
          if (error) console.error('user_settings fetch failed:', error.message)
          setSettings(mergeSettings(data?.settings))
          setLoading(false)
        })
    }
    fetchSettings(1)

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    setTimeFormatPreference(settings.region.timeFormat)
  }, [settings.region.timeFormat])

  const update = useCallback(
    async (section, patch) => {
      if (!user) return
      let next
      setSettings((prev) => {
        next = { ...prev, [section]: { ...prev[section], ...patch } }
        return next
      })
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, settings: next, updated_at: new Date().toISOString() })
    },
    [user]
  )

  const value = { settings, loading, update }

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext)
  if (!ctx) throw new Error('useUserSettings must be used within UserSettingsProvider')
  return ctx
}
