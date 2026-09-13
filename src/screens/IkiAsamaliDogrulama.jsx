import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../contexts/ToastContext.jsx'
import { useTotpEnrollment } from '../hooks/useTotpEnrollment.js'
import DetailHeader from '../components/ui/DetailHeader.jsx'
import Card from '../components/ui/Card.jsx'

export default function IkiAsamaliDogrulama() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { factor, loading, enrolling, enrollData, code, setCode, busy, startEnroll, verifyEnroll, cancelEnroll, disable } =
    useTotpEnrollment()
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  async function handleStartEnroll() {
    const { error } = await startEnroll()
    if (error) showToast(error.message || t('settings.twoFactor.enrollFailed'))
  }

  async function handleVerifyEnroll() {
    const { error } = await verifyEnroll()
    if (error) {
      showToast(t('settings.twoFactor.codeWrong'))
      return
    }
    showToast(t('settings.twoFactor.enrollSuccess'), 'success')
  }

  async function handleDisable() {
    const { error } = await disable()
    setShowDisableConfirm(false)
    if (error) {
      showToast(error.message || t('settings.twoFactor.disableFailed'))
      return
    }
    showToast(t('settings.twoFactor.disableSuccess'), 'success')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background font-body text-foreground">
        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-10">
      <DetailHeader title={t('settings.twoFactor.title')} />

      <main className="px-5 pt-8">
        <section>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:shield-check" class="text-[25px]"></iconify-icon>
            </div>
            <div className="pt-0.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">{t('settings.twoFactor.eyebrow')}</p>
              <h2 className="mt-1 font-heading text-[25px] font-extrabold leading-8 tracking-[-0.05em]">
                {t('settings.twoFactor.heading')}
              </h2>
              <p className="mt-2 max-w-[295px] text-[13px] leading-5 text-muted-foreground">{t('settings.twoFactor.body')}</p>
            </div>
          </div>
        </section>

        {enrolling ? (
          <Card as="section" className="mt-7">
            <h2 className="font-heading text-[15px] font-bold">{t('settings.twoFactor.connectAppTitle')}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('settings.twoFactor.connectAppBody')}</p>
            {enrollData?.qrCode && (
              // Supabase'in totp.qr_code alanı zaten tam bir data: URL'i
              // (ham SVG markup değil) — dangerouslySetInnerHTML burada
              // yanlıştı, string'in "data:image/svg+xml;utf-8," başlangıcı
              // literal metin olarak render oluyordu (görsel bir bug,
              // /browse ile ekran görüntüsü alınana kadar fark edilmemiş).
              <div className="mx-auto mt-4 flex h-48 w-48 items-center justify-center rounded-theme border border-border bg-white p-2">
                <img src={enrollData.qrCode} alt={t('settings.twoFactor.connectAppTitle')} className="h-full w-full" />
              </div>
            )}
            <p className="mt-3 break-all rounded-theme bg-muted px-3 py-2 text-center text-[11px] font-mono text-muted-foreground">
              {enrollData?.secret}
            </p>
            <label className="mb-2 mt-4 block text-xs font-bold text-foreground">{t('settings.twoFactor.codeLabel')}</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              className="w-full rounded-theme border border-border bg-input px-4 py-3 text-center font-heading text-lg font-extrabold tracking-[0.3em] text-foreground outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={cancelEnroll}
                className="flex-1 rounded-theme bg-muted py-2.5 text-xs font-bold text-muted-foreground"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleVerifyEnroll}
                disabled={code.length !== 6 || busy}
                className="flex-1 rounded-theme bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy ? t('settings.twoFactor.verifying') : t('settings.twoFactor.activate')}
              </button>
            </div>
          </Card>
        ) : (
          <>
            <section className="mt-7 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
              <div className="relative px-4 pb-4 pt-4">
                <div className={`absolute inset-x-0 top-0 h-1 ${factor ? 'bg-success' : 'bg-muted'}`} />
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-sm font-bold text-foreground">{factor ? t('settings.twoFactor.protectionOn') : t('settings.twoFactor.protectionOff')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {factor ? t('settings.twoFactor.appConnected') : t('settings.twoFactor.notConnectedYet')}
                    </p>
                  </div>
                  <div
                    className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${
                      factor ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <iconify-icon icon={factor ? 'lucide:check' : 'lucide:x'} class="text-base"></iconify-icon>
                    {factor ? t('settings.twoFactor.on') : t('settings.twoFactor.off')}
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
                    <p className="text-sm font-bold text-foreground">{t('settings.twoFactor.addAppTitle')}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t('settings.twoFactor.addAppBody')}</p>
                  </div>
                  <iconify-icon icon="lucide:plus" class="text-lg text-primary"></iconify-icon>
                </button>
              </section>
            )}

            <section className="mt-7 rounded-theme border border-border bg-muted px-4 py-3.5">
              <div className="flex items-start gap-3">
                <iconify-icon icon="lucide:info" class="mt-0.5 shrink-0 text-[18px] text-primary"></iconify-icon>
                <p className="text-[11px] leading-4 text-muted-foreground">{t('settings.twoFactor.infoNote')}</p>
              </div>
            </section>

            {factor && (
              <section className="mt-7 border-t border-border pt-5">
                {showDisableConfirm ? (
                  <div className="rounded-theme border border-destructive/30 bg-destructive/10 p-3.5">
                    <p className="text-xs font-bold text-foreground">{t('settings.twoFactor.confirmTitle')}</p>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{t('settings.twoFactor.confirmBody')}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setShowDisableConfirm(false)}
                        className="flex-1 rounded-theme bg-muted py-2 text-xs font-bold text-muted-foreground"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleDisable}
                        disabled={busy}
                        className="flex-1 rounded-theme bg-destructive py-2 text-xs font-bold text-destructive-foreground disabled:opacity-60"
                      >
                        {busy ? t('settings.twoFactor.disabling') : t('settings.twoFactor.yesDisable')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDisableConfirm(true)}
                    className="flex items-center gap-2 text-xs font-bold text-destructive"
                  >
                    <iconify-icon icon="lucide:shield-off" class="text-base"></iconify-icon>
                    {t('settings.twoFactor.disableCta')}
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
