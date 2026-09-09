import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { IMG } from '../lib/images.js'

// FireVibe-generated hero, swapped 2026-09-02: the previous asset was a
// recognizable Istanbul mosque skyline, which read as a Turkey-only app;
// GTF is going after a global audience, so this is a deliberately
// generic international night skyline instead (no landmark, no flag,
// nothing that ties it to one country). Downloaded and inspected before
// use, per this screen's usual practice.
const LOGIN_HERO = IMG('2485f89f-ddd3-4c79-ba33-e9df27be46ef')

// 2026-09-06, beta-readiness pass: confirmed live (via /browse, hitting
// Supabase's own /auth/v1/authorize endpoint directly) that neither
// provider was actually enabled on this project — both returned
// `{"error_code":"validation_failed","msg":"Unsupported provider: provider
// is not enabled"}`. The buttons/handlers below are fully wired and were
// never fake, they just had nothing configured to talk to yet. Split into
// two flags (not one) because the two providers get enabled on separate
// timelines: Google only needs a Cloud Console OAuth client (self-serve,
// ~10 minutes), Apple needs a paid Developer Program membership — flip
// each independently once its Supabase Dashboard provider is actually on.
const GOOGLE_OAUTH_ENABLED = true
const APPLE_OAUTH_ENABLED = false

// Shared shell for every state this screen can be in (the sign-in/up form,
// the forgot-password flow, MFA entry, "check your email") — desktop and
// mobile are deliberately two different layouts, not one layout squeezed
// to fit both. Below `lg`: the original phone pattern (a hero banner on
// top, a centered card below — this is a single-column screen someone
// scrolls, so the hero can't compete with the form for space). At `lg`+:
// a fixed-height split screen, hero as a full-height brand panel on one
// side and the form vertically centered in generous whitespace on the
// other — the layout real SaaS login pages use once there's enough width
// that a phone-shaped card floating alone in the middle of a monitor would
// look unfinished. `flex`'s row direction reverses automatically under the
// app's `dir="rtl"` (see i18n/index.js) for Arabic, so no mirrored classes
// needed here.
function AuthShell({ children }) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen w-full bg-background font-body text-foreground lg:flex">
      <div className="relative h-[190px] w-full overflow-hidden lg:hidden">
        <img src={LOGIN_HERO} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/45 to-background" />
      </div>

      <div className="relative hidden w-[42%] shrink-0 overflow-hidden lg:block">
        <img src={LOGIN_HERO} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/55 to-background/25" />
        <div className="absolute inset-0 flex flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-theme bg-white/15 font-heading text-base font-extrabold text-white backdrop-blur-sm">
              GTF
            </div>
            <span className="font-heading text-lg font-extrabold tracking-[-0.03em] text-white">
              Guess the Future
            </span>
          </div>
          <div>
            <h2 className="max-w-md font-heading text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
              {t('auth.heroHeadline')}
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-6 text-white/80">{t('auth.heroSubheadline')}</p>
          </div>
          <p className="text-xs text-white/50">© 2026 Guess the Future</p>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-10 w-full max-w-[360px] px-6 pb-10 lg:mx-0 lg:mt-0 lg:flex lg:min-h-screen lg:max-w-none lg:flex-1 lg:items-center lg:justify-center lg:px-10 lg:pb-0">
        <div className="lg:w-full lg:max-w-[400px]">{children}</div>
      </div>
    </div>
  )
}

export default function Giris() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, signUp, signInWithGoogle, signInWithApple, requestPasswordReset } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [forgotMode, setForgotMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  // Prefilled from an invite link's ?ref=<username>, but still a plain
  // editable field — someone can also type a friend's username by hand.
  const [referredByUsername, setReferredByUsername] = useState(
    () => new URLSearchParams(location.search).get('ref') || ''
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [signupDone, setSignupDone] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [appleBusy, setAppleBusy] = useState(false)
  // Set once a password sign-in succeeds but the account has TOTP enrolled
  // (Ayarlar > İki aşamalı doğrulama) — without this second step, 2FA would
  // be enrollable but never actually checked at login.
  const [mfaFactorId, setMfaFactorId] = useState(null)
  const [mfaCode, setMfaCode] = useState('')

  async function handleVerifyMfa(e) {
    e.preventDefault()
    if (mfaCode.trim().length !== 6 || busy) return
    setBusy(true)
    setError('')
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: mfaFactorId,
    })
    if (challengeError) {
      setError(challengeError.message || t('auth.mfaChallengeFailed'))
      setBusy(false)
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.id,
      code: mfaCode.trim(),
    })
    setBusy(false)
    if (verifyError) {
      setError(t('auth.mfaCodeInvalid'))
      return
    }
    navigate('/', { replace: true })
  }

  async function handleGoogleSignIn() {
    setError('')
    setGoogleBusy(true)
    try {
      await signInWithGoogle()
      // Browser is about to navigate away to Google; nothing else to do here.
    } catch (err) {
      setError(err.message || t('auth.googleError'))
      setGoogleBusy(false)
    }
  }

  async function handleAppleSignIn() {
    setError('')
    setAppleBusy(true)
    try {
      await signInWithApple()
      // Browser is about to navigate away to Apple; nothing else to do here.
    } catch (err) {
      setError(err.message || t('auth.appleError'))
      setAppleBusy(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn({ email, password })
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
          const { data: factors } = await supabase.auth.mfa.listFactors()
          const totp = (factors?.totp || []).find((f) => f.status === 'verified')
          if (totp) {
            setMfaFactorId(totp.id)
            setBusy(false)
            return
          }
        }
        navigate('/', { replace: true })
      } else {
        const result = await signUp({ email, password, username, displayName, referredByUsername })
        if (result.session) {
          // Email confirmation is disabled on the backend — we're already
          // logged in, so a brand-new account goes through İlk Kullanım
          // Rehberi once before landing on the real feed.
          navigate('/rehber', { replace: true })
        } else {
          setSignupDone(true)
        }
      }
    } catch (err) {
      setError(err.message || t('auth.genericError'))
    } finally {
      setBusy(false)
    }
  }

  async function handleRequestReset(e) {
    e.preventDefault()
    if (resetBusy || !resetEmail.trim()) return
    setResetBusy(true)
    setError('')
    try {
      await requestPasswordReset(resetEmail.trim())
      // Always show the same "sent" state whether or not that email is
      // actually registered — Supabase itself doesn't reveal that either,
      // and neither should this screen (an attacker probing which emails
      // have accounts is exactly the info a differing response would leak).
      setResetSent(true)
    } catch (err) {
      setError(err.message || t('auth.genericError'))
    } finally {
      setResetBusy(false)
    }
  }

  if (forgotMode) {
    return (
      <AuthShell>
        {resetSent ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-success text-success-foreground">
              <iconify-icon icon="lucide:mail-check" class="text-2xl"></iconify-icon>
            </div>
            <h1 className="mt-5 font-heading text-xl font-extrabold tracking-tight">{t('auth.resetSentTitle')}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              <Trans
                i18nKey="auth.resetSentBody"
                values={{ email: resetEmail.trim() }}
                components={{ b: <span className="font-semibold text-foreground" /> }}
              />
            </p>
            <button
              onClick={() => {
                setForgotMode(false)
                setResetSent(false)
              }}
              className="mt-6 rounded-theme bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              {t('auth.backToSignIn')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center lg:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-secondary text-primary">
                <iconify-icon icon="lucide:key-round" class="text-2xl"></iconify-icon>
              </div>
              <h1 className="mt-4 font-heading text-xl font-extrabold tracking-tight lg:text-2xl">
                {t('auth.forgotPasswordTitle')}
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground lg:text-left">
                {t('auth.forgotPasswordSubtitle')}
              </p>
            </div>
            <form onSubmit={handleRequestReset} className="mt-6 space-y-4">
              <input
                autoFocus
                required
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary"
              />
              {error && (
                <p className="rounded-theme bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={resetBusy}
                className="flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground shadow-sm disabled:opacity-60"
              >
                {resetBusy ? t('auth.resetSending') : t('auth.resetSendCta')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false)
                  setError('')
                }}
                className="w-full text-center text-xs font-bold text-muted-foreground"
              >
                {t('auth.backToSignIn')}
              </button>
            </form>
          </>
        )}
      </AuthShell>
    )
  }

  if (mfaFactorId) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center lg:items-start">
          <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-secondary text-primary">
            <iconify-icon icon="lucide:shield-check" class="text-2xl"></iconify-icon>
          </div>
          <h1 className="mt-4 font-heading text-xl font-extrabold tracking-tight lg:text-2xl">{t('auth.mfaTitle')}</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground lg:text-left">{t('auth.mfaSubtitle')}</p>
        </div>
        <form onSubmit={handleVerifyMfa} className="mt-6 space-y-4">
          <input
            autoFocus
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            className="w-full rounded-theme border border-border bg-input px-4 py-3 text-center font-heading text-lg font-extrabold tracking-[0.3em] text-foreground shadow-sm outline-none transition-colors focus:border-primary"
          />
          {error && (
            <p className="rounded-theme bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || mfaCode.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground shadow-sm disabled:opacity-60"
          >
            {busy ? t('auth.mfaVerifying') : t('auth.mfaVerify')}
          </button>
        </form>
      </AuthShell>
    )
  }

  if (signupDone) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-success text-success-foreground">
            <iconify-icon icon="lucide:mail-check" class="text-2xl"></iconify-icon>
          </div>
          <h1 className="mt-5 font-heading text-xl font-extrabold tracking-tight">{t('auth.verifyEmailTitle')}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            <Trans i18nKey="auth.verifyEmailBody" values={{ email }} components={{ b: <span className="font-semibold text-foreground" /> }} />
          </p>
          <button
            onClick={() => {
              setSignupDone(false)
              setMode('signin')
            }}
            className="mt-6 rounded-theme bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            {t('auth.backToSignIn')}
          </button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="flex flex-col items-center lg:items-start">
        <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-primary font-heading text-lg font-extrabold tracking-[-0.08em] text-primary-foreground shadow-lg lg:hidden">
          GTF
        </div>
        <h1 className="mt-4 font-heading text-2xl font-extrabold tracking-[-0.05em] text-primary lg:mt-0">
          Guess the Future
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === 'signin' ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
        </p>
      </div>

      <div className="mt-7 flex rounded-theme bg-secondary p-1">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 rounded-[10px] py-2.5 text-sm font-bold transition-colors ${
            mode === 'signin' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-secondary-foreground'
          }`}
        >
          {t('auth.signInTab')}
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-[10px] py-2.5 text-sm font-bold transition-colors ${
            mode === 'signup' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-secondary-foreground'
          }`}
        >
          {t('auth.signUpTab')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === 'signup' && (
          <>
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">{t('auth.displayNameLabel')}</label>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('auth.displayNamePlaceholder')}
                className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">{t('auth.usernameLabel')}</label>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                placeholder={t('auth.usernamePlaceholder')}
                className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">{t('auth.inviteCodeLabel')}</label>
              <input
                value={referredByUsername}
                onChange={(e) => setReferredByUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                placeholder={t('auth.inviteCodePlaceholder')}
                className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary"
              />
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{t('auth.inviteCodeHint')}</p>
            </div>
          </>
        )}
        <div>
          <label className="mb-2 block text-sm font-bold text-foreground">{t('auth.emailLabel')}</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary"
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-bold text-foreground">{t('auth.passwordLabel')}</label>
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email)
                  setForgotMode(true)
                  setError('')
                }}
                className="text-xs font-bold text-primary"
              >
                {t('auth.forgotPasswordLink')}
              </button>
            )}
          </div>
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary"
          />
        </div>

        {error && (
          <p className="rounded-theme bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
        >
          {busy ? t('auth.submitBusy') : mode === 'signin' ? t('auth.submitSignIn') : t('auth.submitSignUp')}
        </button>

        {(GOOGLE_OAUTH_ENABLED || APPLE_OAUTH_ENABLED) && (
          <>
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium text-muted-foreground">{t('common.or')}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-3">
              {GOOGLE_OAUTH_ENABLED && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleBusy || appleBusy || busy}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-theme border border-border bg-card text-sm font-bold text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
                >
                  <iconify-icon icon="simple-icons:google" class="text-[18px]"></iconify-icon>
                  {googleBusy ? t('auth.redirecting') : t('auth.googleContinue')}
                </button>
              )}
              {APPLE_OAUTH_ENABLED && (
                <button
                  type="button"
                  onClick={handleAppleSignIn}
                  disabled={googleBusy || appleBusy || busy}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-theme border border-border bg-card text-sm font-bold text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
                >
                  <iconify-icon icon="simple-icons:apple" class="text-[19px]"></iconify-icon>
                  {appleBusy ? t('auth.redirecting') : t('auth.appleContinue')}
                </button>
              )}
            </div>
          </>
        )}
      </form>
    </AuthShell>
  )
}
