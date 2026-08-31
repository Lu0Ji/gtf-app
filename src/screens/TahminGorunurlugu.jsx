import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function TahminGorunurlugu() {
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
      showToast('Kaydedilemedi, tekrar dene.')
      return
    }
    await refreshProfile()
    showToast('Görünürlük tercihini kaydettik.', 'success')
    navigate(-1)
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="flex items-center justify-between px-5 pt-12">
        <button
          aria-label="Geri dön"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
        </button>
        <p className="font-heading text-sm font-bold tracking-[-0.02em]">Gizlilik</p>
        <div className="h-10 w-10" />
      </header>

      <main className="px-5 pt-7">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Tahmin tercihleri</p>
          <h1 className="mt-2 font-heading text-[27px] font-extrabold leading-[1.1] tracking-[-0.055em]">
            Tahmin görünürlüğü
          </h1>
          <p className="mt-3 max-w-[345px] text-[13px] leading-5 text-muted-foreground">
            Herkese açık tahminlerinin kimler tarafından görülebileceğini seç. Grup içine gönderdiğin tahminler
            her zaman o grubun üyeleriyle sınırlıdır.
          </p>
        </section>

        <section className="mt-7 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-4">
            <h2 className="font-heading text-base font-bold tracking-[-0.03em]">Kim görebilir</h2>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Hesabının genel görünürlüğü</p>
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
                <span className="block text-sm font-bold">Herkese açık</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  GTF'deki herkes profilinde görebilir.
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
                <span className="block text-sm font-bold">Yalnızca takipçilerim</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  Onayladığın takipçiler tahminlerini görür (Gizli hesap).
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
              <h2 className="text-sm font-bold text-foreground">Tek bir tahmini kimseyle paylaşmak istemiyorsan</h2>
              <p className="mt-1.5 text-[11px] leading-[1.55] text-muted-foreground">
                Yeni tahmin oluştururken "Zaman kapsülü" modunu seç — bu hesap görünürlüğünden bağımsız,
                tamamen kişisel kalır.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-theme border border-border bg-muted p-4">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-card text-primary shadow-sm">
              <iconify-icon icon="lucide:stamp" class="text-[18px]"></iconify-icon>
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Mühürlü kayıtlar korunur</h2>
              <p className="mt-1.5 text-[11px] leading-[1.55] text-muted-foreground">
                Görünürlük seçimin ne olursa olsun, mühürlü tahmininin içeriği açılış tarihine kadar kimse
                tarafından okunamaz.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 flex items-start gap-2.5 px-1">
          <iconify-icon icon="lucide:info" class="mt-0.5 shrink-0 text-base text-muted-foreground"></iconify-icon>
          <p className="text-[11px] leading-[1.55] text-muted-foreground">
            Bu tercih, "Gizlilik → Gizli hesap" ayarınla aynı anahtarı kullanır — ikisinden birini değiştirmek
            diğerini de günceller.
          </p>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-5 pb-6 pt-3 backdrop-blur-md">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60"
        >
          <iconify-icon icon="lucide:check" class="text-[18px]"></iconify-icon>
          {saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
        </button>
      </div>
    </div>
  )
}
