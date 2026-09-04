import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatDateLong } from '../lib/format.js'
import DetailHeader from '../components/ui/DetailHeader.jsx'
import Card from '../components/ui/Card.jsx'

export default function HesabiDondur() {
  const { t } = useTranslation()
  const DURATIONS = [
    { days: 7, label: t('settings.freeze.day7'), note: t('settings.freeze.day7Note') },
    { days: 30, label: t('settings.freeze.day30'), note: t('settings.freeze.day30Note') },
    { days: 90, label: t('settings.freeze.day90'), note: t('settings.freeze.day90Note') },
  ]
  const REASONS = [t('settings.freeze.reason1'), t('settings.freeze.reason2'), t('settings.freeze.reason3')]
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { showToast } = useToast()
  const [days, setDays] = useState(30)
  const [reason, setReason] = useState(REASONS[0])
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [until, setUntil] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
  useEffect(() => {
    setUntil(new Date(Date.now() + days * 24 * 60 * 60 * 1000))
  }, [days])

  async function handleFreeze() {
    if (!password || submitting) return
    setSubmitting(true)
    setError('')
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password })
    if (reauthError) {
      setError(t('settings.freeze.wrongPassword'))
      setSubmitting(false)
      return
    }
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ frozen_until: until.toISOString(), freeze_reason: reason })
      .eq('id', user.id)
    if (updateError) {
      setError(updateError.message || t('settings.freeze.freezeFailed'))
      setSubmitting(false)
      return
    }
    await signOut()
    showToast(t('settings.freeze.freezeSuccess'), 'success')
    navigate('/giris', { replace: true })
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <DetailHeader eyebrow={t('settings.freeze.eyebrow')} title={t('settings.freeze.title')} />

      <main className="px-5 pb-8 pt-6">
        <section>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:pause-circle" class="text-[23px]"></iconify-icon>
            </div>
            <div>
              <h2 className="font-heading text-[20px] font-extrabold leading-7 tracking-[-0.04em]">
                {t('settings.freeze.heading')}
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-muted-foreground">{t('settings.freeze.body')}</p>
            </div>
          </div>
        </section>

        <Card as="section" className="mt-6">
          <div className="flex items-center gap-2">
            <iconify-icon icon="lucide:info" class="text-lg text-primary"></iconify-icon>
            <h2 className="font-heading text-[15px] font-bold tracking-[-0.02em]">{t('settings.freeze.whatHappensTitle')}</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                <iconify-icon icon="lucide:user-round-x" class="text-sm"></iconify-icon>
              </div>
              <div>
                <p className="text-[13px] font-bold">{t('settings.freeze.profileHiddenTitle')}</p>
                <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">{t('settings.freeze.profileHiddenBody')}</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                <iconify-icon icon="lucide:book-lock" class="text-sm"></iconify-icon>
              </div>
              <div>
                <p className="text-[13px] font-bold">{t('settings.freeze.recordsKeptTitle')}</p>
                <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">{t('settings.freeze.recordsKeptBody')}</p>
              </div>
            </div>
          </div>
        </Card>

        <section className="mt-7">
          <h2 className="font-heading text-[17px] font-bold tracking-[-0.03em]">{t('settings.freeze.durationTitle')}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">{t('settings.freeze.durationHint')}</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.days}
                onClick={() => setDays(d.days)}
                className={`flex min-h-[76px] flex-col items-start justify-between rounded-theme border p-3 text-left ${
                  days === d.days ? 'border-2 border-primary bg-secondary shadow-sm' : 'border-border bg-card'
                }`}
              >
                {days === d.days && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <iconify-icon icon="lucide:check" class="text-[10px]"></iconify-icon>
                  </span>
                )}
                <span className={`text-[12px] font-bold ${days === d.days ? 'text-secondary-foreground' : 'text-foreground'}`}>
                  {d.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{d.note}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-theme bg-muted px-3 py-3">
            <iconify-icon icon="lucide:calendar-clock" class="text-[18px] text-primary"></iconify-icon>
            <p className="text-[12px] leading-4 text-muted-foreground">
              <Trans
                i18nKey="settings.freeze.untilText"
                values={{ date: formatDateLong(until.toISOString()) }}
                components={{ b: <span className="font-bold text-foreground" /> }}
              />
            </p>
          </div>
        </section>

        <section className="mt-7">
          <h2 className="font-heading text-[17px] font-bold tracking-[-0.03em]">{t('settings.freeze.reasonTitle')}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">{t('settings.freeze.reasonHint')}</p>

          <div className="mt-3 space-y-2">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className="flex w-full items-center justify-between rounded-theme border border-border bg-card px-4 py-3 text-left"
              >
                <span className="text-[13px] font-medium text-foreground">{r}</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    reason === r ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  }`}
                >
                  {reason === r && <iconify-icon icon="lucide:check" class="text-[11px]"></iconify-icon>}
                </span>
              </button>
            ))}
          </div>
        </section>

        <Card as="section" className="mt-7">
          <div className="flex items-center gap-2">
            <iconify-icon icon="lucide:shield-check" class="text-lg text-success"></iconify-icon>
            <h2 className="font-heading text-[15px] font-bold tracking-[-0.02em]">{t('settings.freeze.verifyTitle')}</h2>
          </div>
          <p className="mt-2 text-[12px] leading-4 text-muted-foreground">{t('settings.freeze.verifyBody')}</p>

          <label className="mb-2 mt-4 block text-xs font-bold text-foreground">{t('settings.freeze.passwordLabel')}</label>
          <div className="flex h-12 items-center rounded-theme border border-border bg-input px-3">
            <iconify-icon icon="lucide:key-round" class="mr-2 text-[18px] text-muted-foreground"></iconify-icon>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('settings.freeze.passwordPlaceholder')}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          {error && <p className="mt-2 text-[11px] font-semibold text-destructive">{error}</p>}
        </Card>

        <p className="mt-5 px-1 text-center text-[11px] leading-4 text-muted-foreground">{t('settings.freeze.disclaimer')}</p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 pb-6 pt-3 backdrop-blur-md">
        <button
          onClick={handleFreeze}
          disabled={!password || submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-transform duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          <iconify-icon icon="lucide:pause" class="text-[18px]"></iconify-icon>
          {submitting ? t('settings.freeze.freezing') : t('settings.freeze.freezeCta', { days })}
        </button>
      </div>
    </div>
  )
}
