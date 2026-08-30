import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Daily streak: bump once per calendar day (UTC) a session loads a
  // profile. Idempotent (checks last_active_date first) so calling it from
  // every loadProfile — including refreshProfile() after unrelated updates
  // — is harmless. Fails silently if the streak columns haven't been
  // migrated yet (see supabase/schema.sql) — this is a motivational
  // nice-to-have, not something that should ever block loading a profile.
  const bumpStreak = useCallback(async (currentProfile) => {
    if (!currentProfile) return currentProfile
    const today = new Date().toISOString().slice(0, 10)
    if (currentProfile.last_active_date === today) return currentProfile

    const last = currentProfile.last_active_date ? new Date(currentProfile.last_active_date) : null
    const isConsecutiveDay = last && (new Date(today) - last) / 86400000 === 1
    const nextStreak = isConsecutiveDay ? (currentProfile.streak_count || 0) + 1 : 1

    const { data, error } = await supabase
      .from('profiles')
      .update({ last_active_date: today, streak_count: nextStreak })
      .eq('id', currentProfile.id)
      .select()
      .single()
    return error ? currentProfile : data
  }, [])

  const loadProfile = useCallback(
    async (userId) => {
      if (!userId) {
        setProfile(null)
        return
      }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error) {
        console.error('loadProfile failed:', error.message, error)
        return
      }
      setProfile(await bumpStreak(data))
    },
    [bumpStreak]
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadProfile(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      loadProfile(session?.user?.id)
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  async function signUp({ email, password, username, displayName, referredByUsername }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName,
          // Resolved to a real profile id server-side (handle_new_user
          // trigger) — see supabase/schema.sql. An unknown/empty username
          // just resolves to no referrer, never blocks signup.
          referred_by_username: referredByUsername?.trim() || null,
        },
      },
    })
    if (error) throw error
    return data
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function refreshProfile() {
    await loadProfile(session?.user?.id)
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
