import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatDateLong } from '../lib/format.js'

const DURATIONS = [
  { days: 7, label: '7 gün', note: 'Kısa ara' },
  { days: 30, label: '30 gün', note: 'Önerilen' },
  { days: 90, label: '90 gün', note: 'Uzun ara' },
]

const REASONS = [
  'Bir süre sosyal medyadan uzaklaşmak istiyorum',
  'Çok fazla bildirim alıyorum',
  'Diğer',
]

export default function HesabiDondur() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { showToast } = useToast()
  const [days, setDays] = useState(30)
  const [reason, setReason] = useState(REASONS[0])
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  async function handleFreeze() {
    if (!password || submitting) return
    setSubmitting(true)
    setError('')
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password })
    if (reauthError) {
      setError('Şifre yanlış, tekrar dene.')
      setSubmitting(false)
      return
    }
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ frozen_until: until.toISOString(), freeze_reason: reason })
      .eq('id', user.id)
    if (updateError) {
      setError(updateError.message || 'Dondurulamadı, tekrar dene.')
      setSubmitting(false)
      return
    }
    await signOut()
    showToast('Hesabın donduruldu. İstediğin an tekrar giriş yaparak geri dönebilirsin.', 'success')
    navigate('/giris', { replace: true })
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-5 pb-3 pt-12 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Hesap ayarları</p>
            <h1 className="font-heading text-xl font-extrabold tracking-[-0.04em]">Hesabı dondur</h1>
          </div>
        </div>
      </header>

      <main className="px-5 pb-8 pt-6">
        <section>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:pause-circle" class="text-[23px]"></iconify-icon>
            </div>
            <div>
              <h2 className="font-heading text-[20px] font-extrabold leading-7 tracking-[-0.04em]">
                Bir süre ara vermek ister misin?
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                Hesabını silmeden görünürlüğünü geçici olarak kapatabilirsin. Giriş yaptığın an aynı bilgilerle
                geri dönersin.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-theme border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <iconify-icon icon="lucide:info" class="text-lg text-primary"></iconify-icon>
            <h2 className="font-heading text-[15px] font-bold tracking-[-0.02em]">Dondurunca ne olur?</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                <iconify-icon icon="lucide:user-round-x" class="text-sm"></iconify-icon>
              </div>
              <div>
                <p className="text-[13px] font-bold">Profilin gizlenir</p>
                <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">
                  Profilin ve tahminlerin diğer kişilerce görünmez olur.
                </p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                <iconify-icon icon="lucide:book-lock" class="text-sm"></iconify-icon>
              </div>
              <div>
                <p className="text-[13px] font-bold">Tahmin kayıtların korunur</p>
                <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">
                  Mühürlü ve açılmış tahminlerin hesabında saklanmaya devam eder.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <h2 className="font-heading text-[17px] font-bold tracking-[-0.03em]">Dondurma süresi</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">Süre bitmeden istediğin an giriş yaparak geri dönebilirsin.</p>

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
              Hesabın <span className="font-bold text-foreground">{formatDateLong(until.toISOString())}</span>{' '}
              tarihine kadar dondurulacak.
            </p>
          </div>
        </section>

        <section className="mt-7">
          <h2 className="font-heading text-[17px] font-bold tracking-[-0.03em]">Neden ara veriyorsun?</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">İsteğe bağlıdır; geri bildirimlerin deneyimi iyileştirir.</p>

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

        <section className="mt-7 rounded-theme border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <iconify-icon icon="lucide:shield-check" class="text-lg text-success"></iconify-icon>
            <h2 className="font-heading text-[15px] font-bold tracking-[-0.02em]">Kimliğini doğrula</h2>
          </div>
          <p className="mt-2 text-[12px] leading-4 text-muted-foreground">Bu işlemi onaylamak için mevcut şifreni gir.</p>

          <label className="mb-2 mt-4 block text-xs font-bold text-foreground">Şifre</label>
          <div className="flex h-12 items-center rounded-theme border border-border bg-input px-3">
            <iconify-icon icon="lucide:key-round" class="mr-2 text-[18px] text-muted-foreground"></iconify-icon>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifreni gir"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          {error && <p className="mt-2 text-[11px] font-semibold text-destructive">{error}</p>}
        </section>

        <p className="mt-5 px-1 text-center text-[11px] leading-4 text-muted-foreground">
          Dondurma işlemini onayladığında, GTF hesabının seçtiğin süre boyunca geçici olarak devre dışı
          bırakılmasını kabul etmiş olursun.
        </p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 pb-6 pt-3 backdrop-blur-md">
        <button
          onClick={handleFreeze}
          disabled={!password || submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-50"
        >
          <iconify-icon icon="lucide:pause" class="text-[18px]"></iconify-icon>
          {submitting ? 'Donduruluyor…' : `Hesabımı ${days} gün dondur`}
        </button>
      </div>
    </div>
  )
}
