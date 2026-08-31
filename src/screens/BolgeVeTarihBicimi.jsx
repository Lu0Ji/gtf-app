import { useNavigate } from 'react-router-dom'
import { useUserSettings } from '../hooks/useUserSettings.js'
import { formatTime } from '../lib/format.js'

export default function BolgeVeTarihBicimi() {
  const navigate = useNavigate()
  const { settings, update } = useUserSettings()
  const now = new Date().toISOString()

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-10">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 pt-12 backdrop-blur-md">
        <div className="flex h-12 items-center justify-between">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <h1 className="font-heading text-[17px] font-extrabold tracking-[-0.035em]">Bölge ve Tarih Biçimi</h1>
          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="px-5 pt-6">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">Bölgesel tercihler</p>
          <h2 className="mt-2 font-heading text-[25px] font-extrabold leading-tight tracking-[-0.05em]">
            Saati sana göre göster
          </h2>
          <p className="mt-2 max-w-[350px] text-[13px] leading-5 text-muted-foreground">
            Mesaj saatleri bu tercihe göre gösterilir. Tarihler her zaman ayın adıyla yazılır (örn. 29 Ağustos
            2026), bu yüzden ayrı bir tarih sırası seçeneğine gerek yok. Saat dilimi cihazının kendi saatini
            otomatik takip eder.
          </p>
        </section>

        <section className="mt-7 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Gösterim biçimi</p>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Saat biçimi</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Mesaj zaman damgalarında kullanılır</p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
                {formatTime(now)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => update('region', { timeFormat: '24h' })}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-theme border text-sm font-bold ${
                  settings.region.timeFormat === '24h'
                    ? 'border-2 border-primary bg-secondary text-primary'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {settings.region.timeFormat === '24h' && <iconify-icon icon="lucide:check" class="text-base"></iconify-icon>}
                24 saat
              </button>
              <button
                onClick={() => update('region', { timeFormat: '12h' })}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-theme border text-sm font-bold ${
                  settings.region.timeFormat === '12h'
                    ? 'border-2 border-primary bg-secondary text-primary'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {settings.region.timeFormat === '12h' && <iconify-icon icon="lucide:check" class="text-base"></iconify-icon>}
                12 saat
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-theme bg-muted p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
              <iconify-icon icon="lucide:calendar-clock" class="text-[15px]"></iconify-icon>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Etkinlik tarihleri yerel saatle gösterilir</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Mühür açılışları ve tahmin tarihleri, cihazının saat dilimine göre otomatik ayarlanır — ayrıca
                bir bölge seçmene gerek yok.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
