import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { CRITERIA } from '../lib/passwordStrength.js'
import AuthAurora from '../components/AuthAurora.jsx'
import { usePointerParallax } from '../hooks/usePointerParallax.js'

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

// This screen runs its own fixed dark "portal" surface — see
// .auth-hero-canvas/.auth-aurora-blob-*/.auth-grid in index.css — on
// purpose, regardless of the user's light/dark app theme toggle: it's the
// one deliberate departure DESIGN.md's "earned ceremonial moment" clause
// (§7) allows. Every value below is still built from the same role tokens
// (primary/accent/success/destructive), just recombined with white/black
// for a surface the rest of the app doesn't use — centralized here once so
// the ~10 repeated form fields can't drift out of sync with each other.
const FIELD_CLASS =
  'w-full rounded-theme border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/35 shadow-sm outline-none backdrop-blur-sm transition-colors focus:border-[var(--color-accent)] focus:bg-white/10'
const LABEL_CLASS = 'mb-2 block text-sm font-bold text-white'
const MUTED_CLASS = 'text-white/55'
const ICON_BADGE_CLASS = 'flex h-14 w-14 items-center justify-center rounded-theme border border-white/15 bg-white/10 text-[var(--color-accent)]'

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
// Adım adım "nasıl çalışır" şeridi — sadece mobilde (bkz. AuthShell'in
// altındaki not). 2026-09-13 kullanıcı isteği: "daha açıklayıcı" — masaüstü
// panelinde zaten bir başlık/alt başlık vardı ama bu tamamen `lg:` altında
// gizliydi, telefonda (asıl kullanım şekli) hiç açıklama yoktu, sadece bir
// resim + form. Rozet/mühür ikonografisiyle aynı dil (lucide, tek renk).
function HowItWorksStrip() {
  const { t } = useTranslation()
  const steps = [
    { icon: 'lucide:scroll-text', label: t('auth.stepSealLabel') },
    { icon: 'lucide:hourglass', label: t('auth.stepWaitLabel') },
    { icon: 'lucide:badge-check', label: t('auth.stepProveLabel') },
  ]
  return (
    <div className="flex items-center px-1 lg:hidden">
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[var(--color-accent)]">
              <iconify-icon icon={step.icon} class="text-lg"></iconify-icon>
            </span>
            <span className={`text-[10px] font-bold ${MUTED_CLASS}`}>{step.label}</span>
          </div>
          {i < steps.length - 1 && <div className="mb-5 h-px flex-1 bg-white/15" />}
        </div>
      ))}
    </div>
  )
}

// The rotating seal badge — see .auth-badge-ring in index.css. Borrowed
// directly from ilabsolutions.it's circular rotating contact badge (the
// reference the user pointed at), re-themed around GTF's own sealing
// metaphor (DESIGN.md's "memorable thing") instead of a literal copy of
// theirs. Pure SVG + CSS rotation, no JS. The label repeats so the text
// reads continuously as it spins; not run through i18n — same precedent
// as the hardcoded "Guess the Future" wordmark elsewhere on this screen.
function AuthSealBadge() {
  const label = 'MÜHÜRLE · BEKLE · KANITLA · '
  return (
    <div className="relative hidden h-32 w-32 items-center justify-center lg:flex">
      <svg viewBox="0 0 100 100" className="auth-badge-ring absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <path id="auth-seal-path" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
        </defs>
        <text fill="rgba(255,255,255,0.8)" fontSize="8.2" fontFamily="Inter, sans-serif" fontWeight="700">
          {/* textLength stretches glyph spacing to exactly the path's own
              circumference (2πr, r=38 → ~238.8) so the loop closes with no
              gap and no overlap — a guess-and-check letterSpacing value
              left a visible empty arc instead of a full ring. */}
          <textPath href="#auth-seal-path" textLength="238.8" lengthAdjust="spacingAndGlyphs">
            {label}
          </textPath>
        </text>
      </svg>
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25">
        <iconify-icon icon="lucide:scroll-text" class="text-lg text-white/90"></iconify-icon>
      </span>
    </div>
  )
}

// The form's card shell — see .auth-glow-border/.auth-tilt in index.css.
// Its own pointer-tracking instance (not the hero's): --px/--py here are
// local to the card's own box, so the glow border and tilt line up with
// the cursor even when the cursor is over the hero half of the screen.
// Wraps every AuthShell child state (sign-in/up form, forgot-password,
// MFA, "check your email") — one real card container instead of form
// fields floating directly on the page background.
function GlowCard({ children }) {
  const ref = usePointerParallax()
  return (
    <div ref={ref} className="auth-glow-border rounded-theme">
      <div className="auth-tilt rounded-theme border border-white/12 bg-black/35 p-6 shadow-2xl backdrop-blur-md lg:p-8">
        {children}
      </div>
    </div>
  )
}

function AuthShell({ children }) {
  const { t } = useTranslation()
  const heroRef = usePointerParallax()
  return (
    <div className="auth-hero-canvas relative min-h-screen w-full font-body text-white lg:flex">
      {/* No photo, no light surface anywhere on this screen — fully
          generative, built only from existing color tokens (primary/accent
          via color-mix, same technique BadgeMedallion.jsx uses) so it
          recolors automatically with the user's custom accent. The whole
          page is this canvas (set on the root above); the two panels below
          just add local motion (grid/blobs/particles/spotlight) on top of
          it within their own clipped bounds. */}
      <div className="relative h-[260px] w-full overflow-hidden lg:hidden">
        <div className="auth-aurora-blob auth-aurora-blob-a" />
        <div className="auth-aurora-blob auth-aurora-blob-b" />
        <div className="auth-grid absolute inset-0" />
        <AuthAurora particleCount={4} />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
          <div className="mb-3 h-px w-8 bg-white/30" />
          <h1
            style={{ fontFamily: 'var(--font-auth-display)' }}
            className="text-[30px] font-semibold leading-[1.05] tracking-[-0.01em] text-white"
          >
            {t('auth.heroHeadline')}
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-white/70">{t('auth.heroSubheadline')}</p>
        </div>
      </div>

      <div className="mt-6 px-6 lg:hidden">
        <HowItWorksStrip />
      </div>

      {/* heroRef drives .auth-grid/.auth-particle-field/.auth-spotlight/
          .auth-content-parallax below via --px/--py (see
          usePointerParallax.js) — move the mouse over this panel. */}
      <div ref={heroRef} className="relative hidden w-[42%] shrink-0 overflow-hidden lg:block">
        <div className="auth-aurora-blob auth-aurora-blob-a" />
        <div className="auth-aurora-blob auth-aurora-blob-b" />
        <div className="auth-grid absolute inset-0" />
        <AuthAurora />
        <div className="auth-spotlight pointer-events-none absolute inset-0" />
        <div className="auth-content-parallax absolute inset-0 flex flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center">
                <div className="auth-emblem-glow absolute inset-0 rounded-theme bg-white/40 blur-md" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-theme bg-white/15 font-heading text-base font-extrabold text-white backdrop-blur-sm">
                  GTF
                </div>
              </div>
              <span className="font-heading text-lg font-extrabold tracking-[-0.03em] text-white">
                Guess the Future
              </span>
            </div>
            <AuthSealBadge />
          </div>
          <div>
            {/* The hairline rule + oversized display-serif headline is the
                direct borrow from ilabsolutions.it (the reference the user
                pointed at): type as the hero visual, not a photo or a
                color gradient — plain white, no glow, a bold editorial
                serif (see --font-auth-display in index.css) standing in
                for their paid "Grumpy 24". */}
            <div className="mb-5 h-px w-10 bg-white/30" />
            <h2
              style={{ fontFamily: 'var(--font-auth-display)' }}
              className="max-w-lg text-[48px] font-semibold leading-[1.0] tracking-[-0.01em] text-white xl:text-[64px]"
            >
              {t('auth.heroHeadline')}
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-6 text-white/70">{t('auth.heroSubheadline')}</p>
          </div>
          <p className="text-xs text-white/50">© 2026 Guess the Future</p>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-6 w-full max-w-[360px] px-6 pb-10 lg:mx-0 lg:mt-0 lg:flex lg:min-h-screen lg:max-w-none lg:flex-1 lg:items-center lg:justify-center lg:px-10 lg:pb-0">
        <div className="animate-[auth-shell-in_0.5s_ease-out_both] lg:w-full lg:max-w-[400px]">
          <GlowCard>{children}</GlowCard>
        </div>
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
  const passwordScore = CRITERIA.filter((c) => c.test(password)).length

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
    // Sadece kayıtta — giriş yapan biri var olan (belki daha eski, daha
    // gevşek kuralla oluşturulmuş) şifresiyle engellenmemeli.
    if (mode === 'signup' && passwordScore < CRITERIA.length) {
      setError(t('auth.passwordTooWeak'))
      return
    }
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
            <p className={`mt-2 text-sm leading-6 ${MUTED_CLASS}`}>
              <Trans
                i18nKey="auth.resetSentBody"
                values={{ email: resetEmail.trim() }}
                components={{ b: <span className="font-semibold text-white" /> }}
              />
            </p>
            <button
              onClick={() => {
                setForgotMode(false)
                setResetSent(false)
              }}
              className="auth-btn-glow mt-6 rounded-theme bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              {t('auth.backToSignIn')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center lg:items-start">
              <div className={ICON_BADGE_CLASS}>
                <iconify-icon icon="lucide:key-round" class="text-2xl"></iconify-icon>
              </div>
              <h1 className="mt-4 font-heading text-xl font-extrabold tracking-tight lg:text-2xl">
                {t('auth.forgotPasswordTitle')}
              </h1>
              <p className={`mt-2 text-center text-sm lg:text-left ${MUTED_CLASS}`}>
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
                className={FIELD_CLASS}
              />
              {error && (
                <p className="rounded-theme bg-destructive/15 px-3 py-2.5 text-xs font-semibold text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={resetBusy}
                className="auth-btn-glow flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
              >
                {resetBusy ? t('auth.resetSending') : t('auth.resetSendCta')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false)
                  setError('')
                }}
                className={`w-full text-center text-xs font-bold ${MUTED_CLASS}`}
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
          <div className={ICON_BADGE_CLASS}>
            <iconify-icon icon="lucide:shield-check" class="text-2xl"></iconify-icon>
          </div>
          <h1 className="mt-4 font-heading text-xl font-extrabold tracking-tight lg:text-2xl">{t('auth.mfaTitle')}</h1>
          <p className={`mt-2 text-center text-sm lg:text-left ${MUTED_CLASS}`}>{t('auth.mfaSubtitle')}</p>
        </div>
        <form onSubmit={handleVerifyMfa} className="mt-6 space-y-4">
          <input
            autoFocus
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            className={`${FIELD_CLASS} text-center font-heading text-lg font-extrabold tracking-[0.3em]`}
          />
          {error && (
            <p className="rounded-theme bg-destructive/15 px-3 py-2.5 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || mfaCode.length !== 6}
            className="auth-btn-glow flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
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
          <p className={`mt-2 text-sm leading-6 ${MUTED_CLASS}`}>
            <Trans i18nKey="auth.verifyEmailBody" values={{ email }} components={{ b: <span className="font-semibold text-white" /> }} />
          </p>
          <button
            onClick={() => {
              setSignupDone(false)
              setMode('signin')
            }}
            className="auth-btn-glow mt-6 rounded-theme bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
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
        <h1 className="mt-4 font-heading text-2xl font-extrabold tracking-[-0.05em] text-white lg:mt-0">
          Guess the Future
        </h1>
        <p className={`mt-1 text-sm ${MUTED_CLASS}`}>
          {mode === 'signin' ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
        </p>
      </div>

      <div className="relative mt-7 flex rounded-theme border border-white/10 bg-white/[0.06] p-1">
        <div
          aria-hidden="true"
          className="auth-btn-glow absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[10px] bg-primary transition-transform duration-300 ease-out"
          style={{ transform: mode === 'signup' ? 'translateX(calc(100% + 8px))' : 'translateX(0)' }}
        />
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`relative z-10 flex-1 rounded-[10px] py-2.5 text-sm font-bold transition-colors ${
            mode === 'signin' ? 'text-primary-foreground' : 'text-white/60'
          }`}
        >
          {t('auth.signInTab')}
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`relative z-10 flex-1 rounded-[10px] py-2.5 text-sm font-bold transition-colors ${
            mode === 'signup' ? 'text-primary-foreground' : 'text-white/60'
          }`}
        >
          {t('auth.signUpTab')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === 'signup' && (
          <>
            <div className="auth-field-in" style={{ animationDelay: '0ms' }}>
              <label className={LABEL_CLASS}>{t('auth.displayNameLabel')}</label>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('auth.displayNamePlaceholder')}
                className={FIELD_CLASS}
              />
            </div>
            <div className="auth-field-in" style={{ animationDelay: '60ms' }}>
              <label className={LABEL_CLASS}>{t('auth.usernameLabel')}</label>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                placeholder={t('auth.usernamePlaceholder')}
                className={FIELD_CLASS}
              />
            </div>
            <div className="auth-field-in" style={{ animationDelay: '120ms' }}>
              <label className={LABEL_CLASS}>{t('auth.inviteCodeLabel')}</label>
              <input
                value={referredByUsername}
                onChange={(e) => setReferredByUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                placeholder={t('auth.inviteCodePlaceholder')}
                className={FIELD_CLASS}
              />
              <p className={`mt-2 text-[11px] leading-4 ${MUTED_CLASS}`}>{t('auth.inviteCodeHint')}</p>
            </div>
          </>
        )}
        <div>
          <label className={LABEL_CLASS}>{t('auth.emailLabel')}</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-bold text-white">{t('auth.passwordLabel')}</label>
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email)
                  setForgotMode(true)
                  setError('')
                }}
                className="text-xs font-bold text-[var(--color-accent)]"
              >
                {t('auth.forgotPasswordLink')}
              </button>
            )}
          </div>
          <input
            required
            type="password"
            // Var olan hesaplar eski (daha gevşek) kuralla kayıt oldu — giriş
            // formunda bu şartı sıkılaştırmak onları hesaplarından kilitler.
            // Sadece kayıt tarafı yeni minimumu görüyor.
            minLength={mode === 'signup' ? 10 : 6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(mode === 'signup' ? 'auth.passwordPlaceholderSignup' : 'auth.passwordPlaceholder')}
            className={FIELD_CLASS}
          />
          {mode === 'signup' && password.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <p className={`text-[11px] font-medium ${MUTED_CLASS}`}>{t('settings.changePassword.strengthTitle')}</p>
                <p className={`text-[11px] font-bold ${passwordScore === CRITERIA.length ? 'text-success' : MUTED_CLASS}`}>
                  {t('settings.changePassword.strengthLevels', { returnObjects: true })[passwordScore]}
                </p>
              </div>
              <div className="mt-2 flex gap-1.5">
                {CRITERIA.map((c) => (
                  <div key={c.key} className={`h-1.5 flex-1 rounded-full ${c.test(password) ? 'bg-success' : 'bg-white/15'}`} />
                ))}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {CRITERIA.map((c) => {
                  const met = c.test(password)
                  return (
                    <div
                      key={c.key}
                      className={`flex items-center gap-1.5 text-[10px] font-medium ${met ? 'text-success' : MUTED_CLASS}`}
                    >
                      <iconify-icon icon={met ? 'lucide:check-circle-2' : 'lucide:circle'} class="text-[13px]"></iconify-icon>
                      {t(c.labelKey)}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-theme bg-destructive/15 px-3 py-2.5 text-xs font-semibold text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="auth-btn-glow flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
        >
          {busy ? t('auth.submitBusy') : mode === 'signin' ? t('auth.submitSignIn') : t('auth.submitSignUp')}
        </button>

        {(GOOGLE_OAUTH_ENABLED || APPLE_OAUTH_ENABLED) && (
          <>
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-white/15" />
              <span className={`text-[11px] font-medium ${MUTED_CLASS}`}>{t('common.or')}</span>
              <div className="h-px flex-1 bg-white/15" />
            </div>

            <div className="space-y-3">
              {GOOGLE_OAUTH_ENABLED && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleBusy || appleBusy || busy}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-theme bg-white text-sm font-bold text-[#3c4043] shadow-sm transition-colors hover:bg-white/90 disabled:opacity-60"
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
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-theme border border-white/15 bg-white/[0.06] text-sm font-bold text-white shadow-sm transition-colors hover:bg-white/10 disabled:opacity-60"
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
