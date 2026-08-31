import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useToast } from '../contexts/ToastContext.jsx'

export default function IkiAsamaliDogrulama() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [factor, setFactor] = useState(null) // verified TOTP factor, or null
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollData, setEnrollData] = useState(null) // { id, qrCode, secret }
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  async function loadFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (!error) {
      setFactor((data?.totp || []).find((f) => f.status === 'verified') || null)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadFactors()
  }, [])

  async function handleStartEnroll() {
    setBusy(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setBusy(false)
    if (error) {
      showToast(error.message || 'Doğrulayıcı eklenemedi, tekrar dene.')
      return
    }
    setEnrollData({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    setEnrolling(true)
  }

  async function handleVerifyEnroll() {
    if (code.trim().length !== 6 || busy) return
    setBusy(true)
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrollData.id,
    })
    if (challengeError) {
      showToast(challengeError.message || 'Kod doğrulanamadı, tekrar dene.')
      setBusy(false)
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollData.id,
      challengeId: challenge.id,
      code: code.trim(),
    })
    setBusy(false)
    if (verifyError) {
      showToast('Kod yanlış, tekrar dene.')
      return
    }
    showToast('İki aşamalı doğrulama etkinleştirildi.', 'success')
    setEnrolling(false)
    setEnrollData(null)
    setCode('')
    await loadFactors()
  }

  async function handleCancelEnroll() {
    if (enrollData) await supabase.auth.mfa.unenroll({ factorId: enrollData.id }).catch(() => {})
    setEnrolling(false)
    setEnrollData(null)
    setCode('')
  }

  async function handleDisable() {
    if (!factor || busy) return
    setBusy(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    setBusy(false)
    setShowDisableConfirm(false)
    if (error) {
      showToast(error.message || 'Kapatılamadı, tekrar dene.')
      return
    }
    showToast('İki aşamalı doğrulama kapatıldı.', 'success')
    await loadFactors()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background font-body text-foreground">
        <p className="text-xs text-muted-foreground">Yükleniyor…</p>
      </div>
    )
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
        <h1 className="font-heading text-base font-extrabold tracking-[-0.035em]">Hesap güvenliği</h1>
        <div className="h-10 w-10" />
      </header>

      <main className="px-5 pt-8">
        <section>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:shield-check" class="text-[25px]"></iconify-icon>
            </div>
            <div className="pt-0.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">Güvenlik katmanı</p>
              <h2 className="mt-1 font-heading text-[25px] font-extrabold leading-8 tracking-[-0.05em]">
                İki aşamalı doğrulama
              </h2>
              <p className="mt-2 max-w-[295px] text-[13px] leading-5 text-muted-foreground">
                Girişlerde şifrene ek olarak, bir doğrulayıcı uygulamadan altı haneli bir kod istenir.
              </p>
            </div>
          </div>
        </section>

        {enrolling ? (
          <section className="mt-7 rounded-theme border border-border bg-card p-4 shadow-sm">
            <h2 className="font-heading text-[15px] font-bold">Doğrulayıcı uygulamayla bağla</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Google Authenticator, Authy gibi bir uygulamayla aşağıdaki kodu tara.
            </p>
            {enrollData?.qrCode && (
              <div
                className="mx-auto mt-4 h-48 w-48 rounded-theme border border-border bg-white p-2"
                dangerouslySetInnerHTML={{ __html: enrollData.qrCode }}
              />
            )}
            <p className="mt-3 break-all rounded-theme bg-muted px-3 py-2 text-center text-[11px] font-mono text-muted-foreground">
              {enrollData?.secret}
            </p>
            <label className="mb-2 mt-4 block text-xs font-bold text-foreground">Doğrulayıcıdaki 6 haneli kod</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              className="w-full rounded-theme border border-border bg-input px-4 py-3 text-center font-heading text-lg font-extrabold tracking-[0.3em] text-foreground outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleCancelEnroll}
                className="flex-1 rounded-theme bg-muted py-2.5 text-xs font-bold text-muted-foreground"
              >
                Vazgeç
              </button>
              <button
                onClick={handleVerifyEnroll}
                disabled={code.length !== 6 || busy}
                className="flex-1 rounded-theme bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy ? 'Doğrulanıyor…' : 'Etkinleştir'}
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-7 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
              <div className="relative px-4 pb-4 pt-4">
                <div className={`absolute inset-x-0 top-0 h-1 ${factor ? 'bg-success' : 'bg-muted'}`} />
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-sm font-bold text-foreground">{factor ? 'Koruma etkin' : 'Koruma kapalı'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {factor ? 'Doğrulayıcı uygulama bağlı' : 'Henüz bir doğrulayıcı bağlamadın'}
                    </p>
                  </div>
                  <div
                    className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${
                      factor ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <iconify-icon icon={factor ? 'lucide:check' : 'lucide:x'} class="text-base"></iconify-icon>
                    {factor ? 'Açık' : 'Kapalı'}
                  </div>
                </div>
              </div>
            </section>

            {!factor && (
              <section className="mt-7">
                <button
                  onClick={handleStartEnroll}
                  disabled={busy}
                  className="flex w-full items-center gap-3 rounded-theme border border-border bg-card p-4 text-left shadow-sm disabled:opacity-60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
                    <iconify-icon icon="lucide:smartphone" class="text-xl"></iconify-icon>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">Doğrulayıcı uygulama ekle</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Google Authenticator, Authy, vb.</p>
                  </div>
                  <iconify-icon icon="lucide:plus" class="text-lg text-primary"></iconify-icon>
                </button>
              </section>
            )}

            <section className="mt-7 rounded-theme border border-border bg-muted px-4 py-3.5">
              <div className="flex items-start gap-3">
                <iconify-icon icon="lucide:info" class="mt-0.5 shrink-0 text-[18px] text-primary"></iconify-icon>
                <p className="text-[11px] leading-4 text-muted-foreground">
                  Şu an yalnızca doğrulayıcı uygulama (TOTP) destekleniyor. SMS ile yedek kod ve kurtarma kodları
                  henüz yok.
                </p>
              </div>
            </section>

            {factor && (
              <section className="mt-7 border-t border-border pt-5">
                {showDisableConfirm ? (
                  <div className="rounded-theme border border-destructive/30 bg-destructive/10 p-3.5">
                    <p className="text-xs font-bold text-foreground">Emin misin?</p>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                      İki aşamalı doğrulama kapanacak, hesabın yalnızca şifreyle korunacak.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setShowDisableConfirm(false)}
                        className="flex-1 rounded-theme bg-muted py-2 text-xs font-bold text-muted-foreground"
                      >
                        Vazgeç
                      </button>
                      <button
                        onClick={handleDisable}
                        disabled={busy}
                        className="flex-1 rounded-theme bg-destructive py-2 text-xs font-bold text-destructive-foreground disabled:opacity-60"
                      >
                        {busy ? 'Kapatılıyor…' : 'Evet, kapat'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDisableConfirm(true)}
                    className="flex items-center gap-2 text-xs font-bold text-destructive"
                  >
                    <iconify-icon icon="lucide:shield-off" class="text-base"></iconify-icon>
                    İki aşamalı doğrulamayı kapat
                  </button>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
