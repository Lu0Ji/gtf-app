import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export const DEFAULT_SETTINGS = {
  notifications: {
    likes: true,
    comments: true,
    newFollowers: true,
    groupActivity: true,
    messages: true,
    sealOpenings: true,
  },
  content: {
    interests: [],
    mutedWords: [],
  },
  privacy: {
    showOnline: true,
  },
}

function mergeSettings(stored) {
  const s = stored || {}
  return {
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(s.notifications || {}) },
    content: { ...DEFAULT_SETTINGS.content, ...(s.content || {}) },
    privacy: { ...DEFAULT_SETTINGS.privacy, ...(s.privacy || {}) },
  }
}

// Shared settings blob (Ayarlar screen: notification/content/privacy prefs).
// Loads once per user, writes-through on every update() call.
export function useUserSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setSettings(mergeSettings(data?.settings))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

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

  return { settings, loading, update }
}
