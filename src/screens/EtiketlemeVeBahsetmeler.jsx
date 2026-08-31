import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useUserSettings } from '../hooks/useUserSettings.js'

const OPTIONS = [
  { value: 'everyone', icon: 'lucide:globe-2', title: 'Herkes', desc: "GTF'deki tüm kullanıcılar" },
  { value: 'following', icon: 'lucide:users-round', title: 'Yalnızca takip ettiklerim', desc: 'Takip ettiğin kişiler' },
  { value: 'none', icon: 'lucide:user-round-x', title: 'Hiç kimse', desc: 'İsmin yorumlarda @bahsedilemez' },
]

export default function EtiketlemeVeBahsetmeler() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const { settings, update: updateSettings } = useUserSettings()
  const [permission, setPermission] = useState(profile?.mention_permission || 'everyone')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ mention_permission: permission }).eq('id', user.id)
    setSaving(false)
    if (error) {
      showToast(error.code === '42703' ? 'Bu özellik henüz etkin değil.' : 'Kaydedilemedi, tekrar dene.')
      return
    }
    await refreshProfile()
    showToast('Bahsetme tercihini kaydettik.', 'success')
    navigate(-1)
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-5 pb-4 pt-12 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <h1 className="font-heading text-[17px] font-extrabold tracking-[-0.04em]">Etiketleme ve Bahsetmeler</h1>
          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="px-5 pt-6">
        <section>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:at-sign" class="text-[23px]"></iconify-icon>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Gizlilik</p>
              <h2 className="mt-1 font-heading text-[23px] font-extrabold leading-7 tracking-[-0.05em]">
                İsmin nerede görünsün?
              </h2>
              <p className="mt-2 max-w-[310px] text-[13px] leading-5 text-muted-foreground">
                Yorumlarda @kullaniciadi yazarak kimlerin seni bahsedebileceğini seç.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-[15px] font-bold tracking-[-0.025em]">Kimler seni bahsedebilir?</h3>
          </div>

          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => setPermission(opt.value)}
                className={`flex w-full items-center gap-3 px-4 py-4 text-left ${
                  i < OPTIONS.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    permission === opt.value ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <iconify-icon icon={opt.icon} class="text-[18px]"></iconify-icon>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">{opt.title}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{opt.desc}</span>
                </span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    permission === opt.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
                  }`}
                >
                  {permission === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-card" />}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <h3 className="mb-3 font-heading text-[15px] font-bold tracking-[-0.025em]">Kontrol seçenekleri</h3>

          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <div className="flex items-start gap-3 px-4 py-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                <iconify-icon icon="lucide:bell-ring" class="text-[18px]"></iconify-icon>
              </div>
              <div className="min-w-0 flex-1 pr-2">
                <h4 className="text-sm font-bold text-foreground">Bahsetme bildirimleri</h4>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  Bir yorumda ismin @ ile geçtiğinde Hareketler'de haber ver.
                </p>
              </div>
              <button
                onClick={() => updateSettings('notifications', { mentions: !settings.notifications.mentions })}
                className={`relative mt-2 flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-out ${
                  settings.notifications.mentions ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-card shadow-sm transition-transform duration-200 ease-out ${
                    settings.notifications.mentions ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-theme bg-muted px-4 py-3">
          <div className="flex items-start gap-3">
            <iconify-icon icon="lucide:info" class="mt-0.5 text-[18px] text-primary"></iconify-icon>
            <p className="text-[11px] leading-4 text-muted-foreground">
              Şu an yalnızca yorumlarda @bahsetme destekleniyor. Tahmin metinlerinde ve grup içeriklerinde
              bahsetme, geçmiş etiketleri gözden geçirme ve etiket onayı henüz yok.
            </p>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-5 pb-6 pt-3 backdrop-blur-md">
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
