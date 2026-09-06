import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

// Same 4-criteria strength check as SifreDegistir.jsx (kept in sync
// manually — small enough that a shared import would cost more than it
// saves). Unicode-aware, not script-specific: \p{Lu} matches an uppercase
// letter in any language, and \p{L}/\p{N} exclusion for "special" keeps a
// Cyrillic/Arabic password's own letters from being miscounted.
const CRITERIA = [
  { key: 'length', labelKey: 'settings.changePassword.criteriaLength', test: (v) => v.length >= 10 },
  { key: 'upper', labelKey: 'settings.changePassword.criteriaUpper', test: (v) => /\p{Lu}/u.test(v) },
  { key: 'digit', labelKey: 'settings.changePassword.criteriaDigit', test: (v) => /[0-9]/.test(v) },
  { key: 'special', labelKey: 'settings.changePassword.criteriaSpecial', test: (v) => /[^\p{L}\p{N}]/u.test(v) },
]

// Rendered as a top-level gate in App.jsx, not a routed screen — see
// AuthContext's passwordRecovery comment for why (HashRouter and
// Supabase's own recovery-link redirect both want the URL fragment, so
// routing here specifically would be unreliable). No "current password"
// field: the recovery link itself is the proof of identity, that's the
// whole point of the flow.
export default function YeniSifreBelirle() {
  const { t } = useTranslation()
  const { updatePasswordAfterRecovery } = useAuth()
  const { showToast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const metCriteria = CRITERIA.filter((c) => c.test(newPassword))
  const strength = metCriteria.length
  const strengthLabel = t('settings.changePassword.strengthLevels', { returnObjects: true })[strength]
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword
  const canSubmit = strength === 4 && passwordsMatch

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await updatePasswordAfterRecovery(newPassword)
      showToast(t('auth.passwordResetSuccess'), 'success')
      // Recovery session is now a normal one with the new password set —
      // clearing passwordRecovery (done inside updatePasswordAfterRecovery)
      // drops this gate and the router underneath resolves to wherever a
      // signed-in session normally lands.
    } catch (err) {
      setError(err.message || t('settings.changePassword.updateFailed'))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background px-6 pt-14 text-foreground font-body">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
          <iconify-icon icon="lucide:key-round" class="text-[23px]"></iconify-icon>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{t('auth.newPasswordEyebrow')}</p>
          <h1 className="mt-0.5 font-heading text-[22px] font-extrabold tracking-[-0.05em]">{t('auth.newPasswordHeading')}</h1>
        </div>
      </div>
      <p className="mt-3 max-w-[320px] text-[13px] leading-5 text-muted-foreground">{t('auth.newPasswordBody')}</p>

      <div className="mt-7 rounded-theme border border-border bg-card p-4 shadow-sm">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold text-foreground">{t('settings.changePassword.newPasswordLabel')}</label>
            {newPassword.length > 0 && (
              <span
                className={`text-[11px] font-bold ${strength >= 3 ? 'text-success' : strength >= 2 ? 'text-accent' : 'text-destructive'}`}
              >
                {strengthLabel}
              </span>
            )}
          </div>
          <div className="flex h-12 items-center rounded-theme border border-border bg-input px-3">
            <iconify-icon icon="lucide:lock" class="mr-2 text-[18px] text-muted-foreground"></iconify-icon>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium tracking-[0.08em] text-foreground outline-none"
              aria-label={t('settings.changePassword.newPasswordLabel')}
              autoFocus
            />
            <button
              aria-label={t('settings.changePassword.showPasswordAria')}
              onClick={() => setShowPassword((v) => !v)}
              className="ml-2 flex h-8 w-8 items-center justify-center text-muted-foreground"
            >
              <iconify-icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} class="text-[18px]"></iconify-icon>
            </button>
          </div>

          <div className="mt-3 flex gap-1.5">
            {CRITERIA.map((c) => (
              <div key={c.key} className={`h-1.5 flex-1 rounded-full ${c.test(newPassword) ? 'bg-success' : 'bg-muted'}`} />
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-xs font-bold text-foreground">{t('settings.changePassword.confirmPasswordLabel')}</label>
          <div
            className={`flex h-12 items-center rounded-theme border bg-input px-3 ${
              passwordsMatch ? 'border-success' : 'border-border'
            }`}
          >
            <iconify-icon icon="lucide:lock-keyhole" class="mr-2 text-[18px] text-muted-foreground"></iconify-icon>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium tracking-[0.08em] text-foreground outline-none"
              aria-label={t('settings.changePassword.confirmPasswordLabel')}
            />
            {passwordsMatch && <iconify-icon icon="lucide:check-circle-2" class="ml-2 text-[19px] text-success"></iconify-icon>}
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-destructive">
            <iconify-icon icon="lucide:circle-alert" class="mt-0.5 shrink-0 text-sm"></iconify-icon>
            <p>{error}</p>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-transform duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
      >
        <iconify-icon icon="lucide:shield-check" class="text-[18px]"></iconify-icon>
        {submitting ? t('settings.changePassword.updating') : t('auth.setNewPasswordCta')}
      </button>
    </div>
  )
}
