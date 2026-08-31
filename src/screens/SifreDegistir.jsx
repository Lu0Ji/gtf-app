import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const CRITERIA = [
  { key: 'length', label: 'En az 10 karakter', test: (v) => v.length >= 10 },
  { key: 'upper', label: 'Büyük harf içerir', test: (v) => /[A-ZÇĞİÖŞÜ]/.test(v) },
  { key: 'digit', label: 'Rakam içerir', test: (v) => /[0-9]/.test(v) },
  { key: 'special', label: 'Özel karakter içerir', test: (v) => /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(v) },
]

export default function SifreDegistir() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [signOutOthers, setSignOutOthers] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const metCriteria = CRITERIA.filter((c) => c.test(newPassword))
  const strength = metCriteria.length
  const strengthLabel = ['Çok zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü'][strength]
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword
  const canSubmit = currentPassword.length > 0 && strength === 4 && passwordsMatch

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError('')
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (reauthError) {
      setError('Mevcut şifre doğru değil. Tekrar dene.')
      setSubmitting(false)
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      setError(updateError.message || 'Şifre güncellenemedi, tekrar dene.')
      setSubmitting(false)
      return
    }
    if (signOutOthers) {
      // Best-effort — invalidates every session but this one. Older
      // supabase-js versions ignore an unsupported `scope` silently, so a
      // failure here shouldn't block the password change that already
      // succeeded.
      await supabase.auth.signOut({ scope: 'others' }).catch(() => {})
    }
    showToast('Şifren güncellendi.', 'success')
    navigate(-1)
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-32">
      <header className="border-b border-border bg-background px-5 pb-5 pt-12">
        <div className="flex items-center justify-between">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <p className="font-heading text-[17px] font-extrabold tracking-[-0.04em]">Güvenlik</p>
          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="px-5 pt-7">
        <section>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:key-round" class="text-[23px]"></iconify-icon>
            </div>
            <div className="pt-0.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Hesap güvenliği</p>
              <h1 className="mt-1 font-heading text-[25px] font-extrabold tracking-[-0.05em]">Şifreni değiştir</h1>
              <p className="mt-2 max-w-[300px] text-[13px] leading-5 text-muted-foreground">
                Hesabını korumak için güçlü ve daha önce kullanmadığın bir şifre seç.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-7 rounded-theme border border-border bg-card p-4 shadow-sm">
          <div>
            <label className="mb-2 block text-xs font-bold text-foreground">Mevcut şifre</label>
            <div
              className={`flex h-12 items-center rounded-theme border bg-input px-3 ${
                error ? 'border-destructive' : 'border-border'
              }`}
            >
              <iconify-icon icon="lucide:lock-keyhole" class="mr-2 text-[18px] text-muted-foreground"></iconify-icon>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium tracking-[0.08em] text-foreground outline-none"
                aria-label="Mevcut şifre"
              />
              <button
                aria-label="Mevcut şifreyi göster"
                onClick={() => setShowCurrent((v) => !v)}
                className="ml-2 flex h-8 w-8 items-center justify-center text-muted-foreground"
              >
                <iconify-icon icon={showCurrent ? 'lucide:eye-off' : 'lucide:eye'} class="text-[18px]"></iconify-icon>
              </button>
            </div>
            {error && (
              <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-destructive">
                <iconify-icon icon="lucide:circle-alert" class="mt-0.5 shrink-0 text-sm"></iconify-icon>
                <p>{error}</p>
              </div>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Yeni şifre</label>
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
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium tracking-[0.08em] text-foreground outline-none"
                aria-label="Yeni şifre"
              />
              <button
                aria-label="Yeni şifreyi göster"
                onClick={() => setShowNew((v) => !v)}
                className="ml-2 flex h-8 w-8 items-center justify-center text-muted-foreground"
              >
                <iconify-icon icon={showNew ? 'lucide:eye-off' : 'lucide:eye'} class="text-[18px]"></iconify-icon>
              </button>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground">Şifre gücü</p>
                <p className={`text-[11px] font-bold ${strength === 4 ? 'text-success' : 'text-muted-foreground'}`}>
                  {strength} / 4 ölçüt
                </p>
              </div>
              <div className="mt-2 flex gap-1.5">
                {CRITERIA.map((c) => (
                  <div
                    key={c.key}
                    className={`h-1.5 flex-1 rounded-full ${c.test(newPassword) ? 'bg-success' : 'bg-muted'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-bold text-foreground">Yeni şifre tekrarı</label>
            <div
              className={`flex h-12 items-center rounded-theme border bg-input px-3 ${
                passwordsMatch ? 'border-success' : 'border-border'
              }`}
            >
              <iconify-icon icon="lucide:lock-keyhole" class="mr-2 text-[18px] text-muted-foreground"></iconify-icon>
              <input
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium tracking-[0.08em] text-foreground outline-none"
                aria-label="Yeni şifre tekrarı"
              />
              {passwordsMatch && <iconify-icon icon="lucide:check-circle-2" class="ml-2 text-[19px] text-success"></iconify-icon>}
            </div>
            {passwordsMatch && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-success">
                <iconify-icon icon="lucide:check" class="text-sm"></iconify-icon>
                Şifreler eşleşiyor
              </p>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-theme bg-muted p-4">
          <div className="flex items-center gap-2">
            <iconify-icon icon="lucide:list-checks" class="text-[18px] text-primary"></iconify-icon>
            <h2 className="font-heading text-sm font-bold tracking-[-0.02em]">Şifre güvenliği</h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
            {CRITERIA.map((c) => {
              const met = c.test(newPassword)
              return (
                <div
                  key={c.key}
                  className={`flex items-center gap-1.5 text-[11px] font-medium ${met ? 'text-success' : 'text-muted-foreground'}`}
                >
                  <iconify-icon icon={met ? 'lucide:check-circle-2' : 'lucide:circle'} class="text-[15px]"></iconify-icon>
                  {c.label}
                </div>
              )
            })}
          </div>
        </section>

        <section className="mt-5 rounded-theme border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <iconify-icon icon="lucide:monitor-smartphone" class="text-[17px]"></iconify-icon>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-sm font-bold tracking-[-0.02em]">Tüm cihazlardan çıkış yap</h2>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Bu cihaz dışındaki açık oturumlar yeni şifrenle yeniden giriş ister.
              </p>
            </div>
            <button
              aria-label="Tüm cihazlardan çıkış yap seçeneği"
              onClick={() => setSignOutOthers((v) => !v)}
              className={`relative mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-out ${
                signOutOthers ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-card shadow-sm transition-transform duration-200 ease-out ${
                  signOutOthers ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        <section className="mt-5 flex items-start gap-3 rounded-theme border border-success/30 bg-success/10 px-4 py-3">
          <iconify-icon icon="lucide:badge-check" class="mt-0.5 text-[18px] text-success"></iconify-icon>
          <div>
            <p className="text-xs font-bold text-foreground">Değişiklikten sonra onay alırsın</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Şifren başarıyla güncellendiğinde uygulama içinde bildirim gösterilir.
            </p>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-5 pb-6 pt-3 backdrop-blur-md">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-50"
        >
          <iconify-icon icon="lucide:shield-check" class="text-[18px]"></iconify-icon>
          {submitting ? 'Güncelleniyor…' : 'Şifreyi güncelle'}
        </button>
      </div>
    </div>
  )
}
