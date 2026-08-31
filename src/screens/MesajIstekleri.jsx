import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const OPTIONS = [
  { value: 'everyone', icon: 'lucide:users', title: 'Herkes', desc: 'Takip etmediğin kişiler de mesaj gönderebilir' },
  { value: 'following', icon: 'lucide:user-check', title: 'Yalnızca takip ettiklerim', desc: 'Sadece takip ettiğin kişiler yazabilir' },
  { value: 'none', icon: 'lucide:ban', title: 'Hiç kimse', desc: 'Yeni mesajları kapat' },
]

export default function MesajIstekleri() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [permission, setPermission] = useState(profile?.message_permission || 'following')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ message_permission: permission }).eq('id', user.id)
    setSaving(false)
    if (error) {
      showToast(
        error.code === '42703' ? 'Bu özellik henüz etkin değil.' : 'Kaydedilemedi, tekrar dene.'
      )
      return
    }
    await refreshProfile()
    showToast('Mesaj tercihini kaydettik.', 'success')
    navigate(-1)
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 px-5 pb-4 pt-12 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <h1 className="font-heading text-[17px] font-extrabold tracking-[-0.035em]">Mesaj İstekleri</h1>
          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="px-5 pt-6">
        <section>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:mail-check" class="text-[22px]"></iconify-icon>
            </div>
            <div className="pt-0.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Gizlilik</p>
              <h2 className="mt-1 font-heading text-[23px] font-extrabold leading-7 tracking-[-0.05em]">
                Kim sana mesaj atabilir
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                Bu tercih dışındaki biri sana mesaj göndermeye çalıştığında, mesajı gönderemez.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => setPermission(opt.value)}
                className={`flex w-full items-center gap-3 px-4 py-4 text-left ${
                  i < OPTIONS.length - 1 ? 'border-b border-border' : ''
                } ${permission === opt.value ? 'bg-secondary/45' : ''}`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    permission === opt.value ? 'bg-card text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <iconify-icon icon={opt.icon} class="text-[18px]"></iconify-icon>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{opt.title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{opt.desc}</p>
                </div>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    permission === opt.value ? 'border-primary' : 'border-border'
                  }`}
                >
                  {permission === opt.value && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-theme bg-muted px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
              <iconify-icon icon="lucide:lock-keyhole" class="text-sm"></iconify-icon>
            </div>
            <p className="pt-0.5 text-[11px] leading-4 text-muted-foreground">
              Spam filtreleme, ayrı istek klasörü ve otomatik silme gibi ek kontroller henüz yok — bu tercih
              şu an yalnızca kimin sana mesaj gönderebileceğini belirler.
            </p>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-5 pb-6 pt-3 backdrop-blur-md">
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
