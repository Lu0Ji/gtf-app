import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const LEVELS = [
  { value: 'less', icon: 'lucide:eye-off', title: 'Daha az göster', desc: 'Hassas olarak işaretlenen kayıtları akışından ve Keşfet\'ten gizle.' },
  { value: 'standard', icon: 'lucide:sliders-horizontal', title: 'Standart', desc: 'Hassas kayıtlar bir uyarı etiketiyle birlikte gösterilir.' },
  { value: 'more', icon: 'lucide:eye', title: 'Daha fazla göster', desc: 'Hassas kayıtlar da dahil, hiçbir ek filtre uygulanmaz.' },
]

export default function HassasIcerikKontrolu() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [level, setLevel] = useState(profile?.content_filter_level || 'standard')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ content_filter_level: level }).eq('id', user.id)
    setSaving(false)
    if (error) {
      showToast(error.code === '42703' ? 'Bu özellik henüz etkin değil.' : 'Kaydedilemedi, tekrar dene.')
      return
    }
    await refreshProfile()
    showToast('Tercihini kaydettik.', 'success')
    navigate(-1)
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 pb-3 pt-12 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <h1 className="font-heading text-[17px] font-extrabold tracking-[-0.035em]">Hassas içerik</h1>
          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="px-5 pt-6">
        <section>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:shield-check" class="text-[21px]"></iconify-icon>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">İçerik tercihlerin</p>
              <h2 className="mt-1 font-heading text-[22px] font-extrabold leading-7 tracking-[-0.05em]">
                Akışını sana göre ayarla
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                Yazarların kendi işaretlediği hassas kayıtların akışında ve Keşfet'te nasıl görüneceğini seç.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <h3 className="mb-3 font-heading text-[16px] font-bold tracking-[-0.025em]">Gösterim düzeyi</h3>
          <div className="space-y-3">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={`w-full rounded-theme border p-4 text-left shadow-sm ${
                  level === l.value ? 'border-2 border-primary' : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      level === l.value ? 'border-primary' : 'border-muted-foreground'
                    }`}
                  >
                    {level === l.value && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <iconify-icon icon={l.icon} class={`text-[17px] ${level === l.value ? 'text-primary' : 'text-muted-foreground'}`}></iconify-icon>
                        <span className="text-sm font-bold text-foreground">{l.title}</span>
                      </div>
                      {level === l.value && (
                        <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">
                          Seçili
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 pr-2 text-[12px] leading-5 text-muted-foreground">{l.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-theme bg-muted px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-primary">
              <iconify-icon icon="lucide:info" class="text-sm"></iconify-icon>
            </div>
            <p className="pt-0.5 text-[11px] leading-4 text-muted-foreground">
              Hassas işaretleme şu an tahmin sahibinin kendi beyanına dayalıdır — otomatik görsel bulanıklaştırma
              ve içerik denetimi henüz yok.
            </p>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-5 pb-5 pt-3 backdrop-blur-md">
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
