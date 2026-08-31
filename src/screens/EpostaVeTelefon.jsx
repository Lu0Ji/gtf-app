import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function EpostaVeTelefon() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [editingEmail, setEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone] = useState(profile?.phone || '')
  const [busy, setBusy] = useState(false)

  const emailVerified = Boolean(user?.email_confirmed_at)

  async function handleUpdateEmail() {
    if (!newEmail.trim() || busy) return
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setBusy(false)
    if (error) {
      showToast(error.message || 'E-posta güncellenemedi, tekrar dene.')
      return
    }
    showToast('Onay linki her iki adresine de gönderildi, tıklayınca değişiklik tamamlanır.', 'success')
    setEditingEmail(false)
    setNewEmail('')
  }

  async function handleUpdatePhone() {
    if (busy) return
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ phone: phone.trim() || null }).eq('id', user.id)
    setBusy(false)
    if (error) {
      showToast('Telefon numarası kaydedilemedi, tekrar dene.')
      return
    }
    await refreshProfile()
    showToast('Telefon numaran kaydedildi.', 'success')
    setEditingPhone(false)
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-10">
      <header className="flex items-center justify-between px-5 pt-12">
        <button
          aria-label="Geri dön"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
        </button>
        <p className="font-heading text-base font-extrabold tracking-[-0.035em]">E-posta ve Telefon</p>
        <div className="h-10 w-10" />
      </header>

      <main className="px-5 pt-7">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">Hesap güvenliği</p>
          <h1 className="mt-2 font-heading text-[26px] font-extrabold leading-tight tracking-[-0.05em]">
            İletişim bilgilerin
          </h1>
          <p className="mt-2 max-w-[345px] text-[13px] leading-5 text-muted-foreground">
            Giriş ve hesap kurtarma için kullanılan bilgilerini buradan yönet.
          </p>
        </section>

        <section className="mt-7 space-y-4">
          <article className="rounded-theme border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-secondary text-secondary-foreground">
                  <iconify-icon icon="lucide:mail" class="text-[19px]"></iconify-icon>
                </div>
                <div className="min-w-0">
                  <h2 className="font-heading text-[15px] font-bold tracking-[-0.025em]">E-posta adresi</h2>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">{user?.email}</p>
                  <div
                    className={`mt-2 flex items-center gap-1.5 text-[11px] font-semibold ${
                      emailVerified ? 'text-success' : 'text-muted-foreground'
                    }`}
                  >
                    <iconify-icon icon={emailVerified ? 'lucide:badge-check' : 'lucide:circle-dashed'} class="text-[15px]"></iconify-icon>
                    {emailVerified ? 'Doğrulandı' : 'Doğrulanmadı'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditingEmail((v) => !v)}
                className="shrink-0 rounded-theme bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"
              >
                Değiştir
              </button>
            </div>
            {editingEmail && (
              <div className="mt-4 border-t border-border pt-4">
                <label className="mb-2 block text-xs font-bold text-foreground">Yeni e-posta adresi</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="yeni@eposta.com"
                  className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground outline-none"
                />
                <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                  Değişikliği onaylamak için hem eski hem yeni adresine bir link gönderilir.
                </p>
                <button
                  onClick={handleUpdateEmail}
                  disabled={busy || !newEmail.trim()}
                  className="mt-3 w-full rounded-theme bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
                >
                  Onay linki gönder
                </button>
              </div>
            )}
          </article>

          <article className="rounded-theme border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-muted text-secondary-foreground">
                  <iconify-icon icon="lucide:smartphone" class="text-[19px]"></iconify-icon>
                </div>
                <div className="min-w-0">
                  <h2 className="font-heading text-[15px] font-bold tracking-[-0.025em]">Telefon numarası</h2>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {profile?.phone || 'Henüz eklenmedi'}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                    Sadece hesap kurtarma amaçlı — SMS ile doğrulama şu an yok.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPhone((v) => !v)}
                className="shrink-0 rounded-theme bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"
              >
                {profile?.phone ? 'Değiştir' : 'Ekle'}
              </button>
            </div>
            {editingPhone && (
              <div className="mt-4 border-t border-border pt-4">
                <label className="mb-2 block text-xs font-bold text-foreground">Telefon numarası</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 5xx xxx xx xx"
                  className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground outline-none"
                />
                <button
                  onClick={handleUpdatePhone}
                  disabled={busy}
                  className="mt-3 w-full rounded-theme bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
                >
                  Kaydet
                </button>
              </div>
            )}
          </article>
        </section>

        <section className="mt-5 rounded-theme bg-muted px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
              <iconify-icon icon="lucide:shield-check" class="text-[16px]"></iconify-icon>
            </div>
            <div>
              <h2 className="text-xs font-bold text-foreground">Bilgilerin koruma altında</h2>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                İletişim bilgisi değişiklikleri her zaman e-posta onayı gerektirir.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
