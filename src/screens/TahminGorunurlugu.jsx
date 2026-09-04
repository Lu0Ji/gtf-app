import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import DetailHeader from '../components/ui/DetailHeader.jsx'

export default function TahminGorunurlugu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  // Maps onto the same profiles.is_private the "Gizli hesap" toggle in
  // Uygulama Ayarları uses — this screen is the other place that same
  // control is designed to live (FireVibe's "Tahmin Görünürlüğü"), not a
  // second, independent visibility system. "Yalnızca ben" isn't a third
  // state here: that's what Zaman kapsülü mode already is, per-post.
  const [isPrivate, setIsPrivate] = useState(Boolean(profile?.is_private))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ is_private: isPrivate }).eq('id', user.id)
    setSaving(false)
    if (error) {
      showToast(t('common.saveFailedGeneric'))
      return
    }
    await refreshProfile()
    showToast(t('settings.predictionVisibility.saveSuccess'), 'success')
    navigate(-1)
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <DetailHeader title={t('settings.predictionVisibility.title')} />

      <main className="px-5 pt-7">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t('settings.predictionVisibility.eyebrow')}</p>
          <h1 className="mt-2 font-heading text-[27px] font-extrabold leading-[1.1] tracking-[-0.055em]">
            {t('settings.predictionVisibility.heading')}
          </h1>
          <p className="mt-3 max-w-[345px] text-[13px] leading-5 text-muted-foreground">{t('settings.predictionVisibility.body')}</p>
        </section>

        <section className="mt-7 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-4">
            <h2 className="font-heading text-base font-bold tracking-[-0.03em]">{t('settings.predictionVisibility.whoCanSeeTitle')}</h2>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{t('settings.predictionVisibility.whoCanSeeSubtitle')}</p>
          </div>

          <div className="px-4">
            <button
              onClick={() => setIsPrivate(false)}
              className="flex w-full cursor-pointer items-center gap-3 border-b border-border py-4 text-left"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-secondary text-secondary-foreground">
                <iconify-icon icon="lucide:globe-2" class="text-[20px]"></iconify-icon>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{t('settings.predictionVisibility.public')}</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  {t('settings.predictionVisibility.publicDesc')}
                </span>
              </span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  !isPrivate ? 'border-primary' : 'border-border'
                }`}
              >
                {!isPrivate && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </span>
            </button>

            <button
              onClick={() => setIsPrivate(true)}
              className="flex w-full cursor-pointer items-center gap-3 py-4 text-left"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-muted text-muted-foreground">
                <iconify-icon icon="lucide:users-round" class="text-[20px]"></iconify-icon>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{t('settings.predictionVisibility.followersOnly')}</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  {t('settings.predictionVisibility.followersOnlyDesc')}
                </span>
              </span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isPrivate ? 'border-primary' : 'border-border'
                }`}
              >
                {isPrivate && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </span>
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-theme border border-border bg-muted p-4">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-card text-primary shadow-sm">
              <iconify-icon icon="lucide:archive" class="text-[18px]"></iconify-icon>
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{t('settings.predictionVisibility.capsuleNoteTitle')}</h2>
              <p className="mt-1.5 text-[11px] leading-[1.55] text-muted-foreground">{t('settings.predictionVisibility.capsuleNoteBody')}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-theme border border-border bg-muted p-4">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-card text-primary shadow-sm">
              <iconify-icon icon="lucide:stamp" class="text-[18px]"></iconify-icon>
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{t('settings.predictionVisibility.sealedNoteTitle')}</h2>
              <p className="mt-1.5 text-[11px] leading-[1.55] text-muted-foreground">{t('settings.predictionVisibility.sealedNoteBody')}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 flex items-start gap-2.5 px-1">
          <iconify-icon icon="lucide:info" class="mt-0.5 shrink-0 text-base text-muted-foreground"></iconify-icon>
          <p className="text-[11px] leading-[1.55] text-muted-foreground">{t('settings.predictionVisibility.footerNote')}</p>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-5 pb-6 pt-3 backdrop-blur-md">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-transform duration-150 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
        >
          <iconify-icon icon="lucide:check" class="text-[18px]"></iconify-icon>
          {saving ? t('common.saving') : t('common.saveChanges')}
        </button>
      </div>
    </div>
  )
}
