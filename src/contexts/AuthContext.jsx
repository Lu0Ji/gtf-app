import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapacitorApp } from '@capacitor/app'
import { supabase } from '../lib/supabase.js'
import { appUrl } from '../lib/appUrl.js'

const AuthContext = createContext(null)

// Where Supabase sends the user back after Google/Apple sign-in inside the
// native apps. A custom URL scheme (registered in AndroidManifest.xml and
// Info.plist, allow-listed in Supabase's Auth → URL Configuration) rather
// than the WebView's own origin, because the sign-in itself can't happen in
// the WebView at all: Google refuses OAuth from embedded web views
// ("disallowed_useragent"). So on native the flow is: open Supabase's
// provider URL in the system browser (Chrome Custom Tab / SFSafariViewController),
// let the provider redirect to this scheme, and catch it with appUrlOpen below.
const NATIVE_AUTH_REDIRECT = 'com.gtf.app://auth-callback'

// Turns the URL the OS hands us back into a session. Supabase's default
// (implicit) flow puts the tokens in the fragment; the PKCE flow puts a
// `code` in the query — handle both so a future flowType switch can't
// silently break native sign-in.
async function completeNativeSignIn(url) {
  const parsed = new URL(url)
  const code = parsed.searchParams.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return
  }
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  const access_token = fragment.get('access_token')
  const refresh_token = fragment.get('refresh_token')
  if (!access_token || !refresh_token) return
  const { error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) throw error
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // Set when Supabase's own client-side redirect handling detects a
  // password-recovery link's token in the URL (see requestPasswordReset
  // below) and fires this event — not something we trigger ourselves. App.jsx
  // gates on this to show the "set a new password" screen regardless of
  // whatever route the URL's hash happens to carry: HashRouter and
  // Supabase's own auth redirect both want to own the URL fragment, so
  // routing to a specific screen for this is unreliable — a top-level gate
  // sidesteps that entirely instead of fighting it.
  const [passwordRecovery, setPasswordRecovery] = useState(false)

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

  // Hesabı Dondur: logging back in is the reactivation action (per its own
  // copy — "giriş yaparak hesabını yeniden etkinleştirebilirsin"), so any
  // successful session load clears a pending freeze rather than waiting for
  // frozen_until to lapse on its own.
  const unfreezeIfNeeded = useCallback(async (currentProfile) => {
    if (!currentProfile?.frozen_until) return currentProfile
    const { data, error } = await supabase
      .from('profiles')
      .update({ frozen_until: null, freeze_reason: null })
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
      setProfile(await bumpStreak(await unfreezeIfNeeded(data)))
    },
    [bumpStreak, unfreezeIfNeeded]
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadProfile(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      loadProfile(session?.user?.id)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  // Native only — see NATIVE_AUTH_REDIRECT. Any other deep link (none exist
  // yet) falls through untouched.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const listenerPromise = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      if (!url?.startsWith(NATIVE_AUTH_REDIRECT)) return
      // iOS leaves the SFSafariViewController open on top of the app
      // otherwise; Android's Custom Tab is already gone by the time we're
      // here (singleTask launch mode clears it) and close() is a no-op there.
      Browser.close().catch(() => {})
      completeNativeSignIn(url).catch(() => {
        // Expired/invalid callback — the user simply stays on the sign-in
        // screen and can try again; nothing to surface from here.
      })
    })
    return () => {
      listenerPromise.then((handle) => handle.remove())
    }
  }, [])

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

  // Redirects out to the provider and back — there's no local session to
  // return here, onAuthStateChange picks up the resulting session once the
  // redirect completes (web) or the appUrlOpen listener above finishes
  // (native, where the provider opens in the system browser instead of
  // navigating the WebView away — see NATIVE_AUTH_REDIRECT). Requires the
  // provider to be enabled in the Supabase project's Auth settings: Google
  // needs a Google Cloud OAuth client id/secret, Apple a Services ID, Team
  // ID, Key ID and private key from an Apple Developer account.
  async function signInWithProvider(provider) {
    if (!Capacitor.isNativePlatform()) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
      return
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true },
    })
    if (error) throw error
    await Browser.open({ url: data.url })
  }

  const signInWithGoogle = () => signInWithProvider('google')
  const signInWithApple = () => signInWithProvider('apple')

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // No hash route in redirectTo on purpose — see the passwordRecovery
  // comment above. Supabase appends its own token/code to whatever URL we
  // give it; leaving ours bare (just the site, no "#/...") means there's
  // nothing for its fragment/query to collide with. appUrl() rather than
  // window.location: the link lands in an email and gets opened in a phone's
  // browser, where the native shell's `localhost` origin would go nowhere.
  async function requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl(),
    })
    if (error) throw error
  }

  async function updatePasswordAfterRecovery(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    setPasswordRecovery(false)
  }

  async function refreshProfile() {
    await loadProfile(session?.user?.id)
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    passwordRecovery,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
    refreshProfile,
    requestPasswordReset,
    updatePasswordAfterRecovery,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
