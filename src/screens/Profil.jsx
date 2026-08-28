import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'

const CATEGORY_ACCURACY = [
  { name: 'Ekonomi', icon: 'lucide:landmark', pct: '%81', count: '11 sonuçlanan kayıt', widthClass: 'w-[81%]' },
  { name: 'Teknoloji', icon: 'lucide:cpu', pct: '%75', count: '8 sonuçlanan kayıt', widthClass: 'w-3/4' },
  { name: 'Şehir', icon: 'lucide:building-2', pct: '%67', count: '6 sonuçlanan kayıt', widthClass: 'w-2/3' },
]

const PROFILE_TABS = ['Tahminler', 'Yanıtlar', 'Kaydedilenler']

export default function Profil() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Tahminler')

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <header className="px-5 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Profil</p>
            <h1 className="mt-1 font-heading text-[25px] font-extrabold tracking-[-0.06em] text-primary">
              Kayıt defterin
            </h1>
          </div>
          <button
            aria-label="Profil ayarları"
            onClick={() => navigate('/uygulama-ayarlari')}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:settings-2" class="text-[19px]"></iconify-icon>
          </button>
        </div>
      </header>

      <main className="pt-5">
        <section className="mx-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="h-[86px] w-[86px] overflow-hidden rounded-full border-4 border-card bg-muted shadow-md">
                <img
                  src={IMG('a97f3f05-c665-4b5c-94c7-c83149118bc9')}
                  alt="Elif Demir"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                <iconify-icon icon="lucide:badge-check" class="text-[14px]"></iconify-icon>
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-heading text-[21px] font-extrabold tracking-[-0.05em]">Elif Demir</h2>
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">
                  PRO
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">@elifdemir</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  onClick={() => navigate('/profil-ayarlari')}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary"
                >
                  Profil Ayarları
                  <iconify-icon icon="lucide:arrow-up-right" class="text-sm"></iconify-icon>
                </button>
                <button
                  onClick={() => navigate('/hareketler')}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary"
                >
                  Hareketler
                  <iconify-icon icon="lucide:activity" class="text-sm"></iconify-icon>
                </button>
                <button
                  onClick={() => navigate('/uygulama-ayarlari')}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary"
                >
                  Uygulama Ayarları
                  <iconify-icon icon="lucide:settings-2" class="text-sm"></iconify-icon>
                </button>
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-[340px] text-[14px] leading-5 text-foreground">
            Veriye bakıp fikrini değiştirmekten çekinmeyen biri. Ekonomi, şehir hayatı ve yeni teknolojiler üzerine
            kayıt tutuyorum.
          </p>

          <div className="mt-5 flex items-center gap-5">
            <div>
              <p className="font-heading text-lg font-extrabold tracking-[-0.05em]">486</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Takipçi</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="font-heading text-lg font-extrabold tracking-[-0.05em]">218</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Takip edilen</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="font-heading text-lg font-extrabold tracking-[-0.05em]">42</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Tahmin</p>
            </div>
          </div>
        </section>

        <section className="mx-5 mt-6 rounded-theme border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">Profil görünümün</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Kapak fotoğrafı eklemek zorunlu değildir.
              </p>
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:sliders-horizontal" class="text-[17px]"></iconify-icon>
            </button>
          </div>
          <button className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary">
            Profil görünümünü kişiselleştir
            <iconify-icon icon="lucide:arrow-right" class="text-sm"></iconify-icon>
          </button>
        </section>

        <section className="mx-5 mt-5 overflow-hidden rounded-theme bg-primary text-primary-foreground shadow-sm">
          <div className="flex items-start justify-between px-5 pt-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary-foreground/75">
                Kalıcı performans
              </p>
              <div className="mt-1 flex items-end gap-2">
                <span className="font-heading text-[42px] font-extrabold leading-none tracking-[-0.08em]">%72</span>
                <span className="mb-1 text-xs font-semibold text-primary-foreground/80">isabet oranı</span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary-foreground/25 bg-primary-foreground/10">
              <iconify-icon icon="lucide:chart-no-axes-combined" class="text-xl"></iconify-icon>
            </div>
          </div>
          <div className="mx-5 mt-5 h-px bg-primary-foreground/20" />
          <div className="grid grid-cols-3 gap-2 px-5 py-4">
            <div>
              <p className="text-[10px] font-medium text-primary-foreground/70">Açılan kayıt</p>
              <p className="mt-1 text-sm font-bold">29</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-primary-foreground/70">Doğrulanan</p>
              <p className="mt-1 text-sm font-bold">21</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-primary-foreground/70">Ort. süre</p>
              <p className="mt-1 text-sm font-bold">18 gün</p>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="flex items-end justify-between px-5">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Kategori doğruluğu</h2>
              <p className="mt-1 text-xs text-muted-foreground">Açılan ve sonuçlanan kayıtlara göre</p>
            </div>
            <button className="text-xs font-bold text-primary">Tümü</button>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto px-5 pb-1">
            {CATEGORY_ACCURACY.map((cat) => (
              <article key={cat.name} className="min-w-[150px] rounded-theme border border-border bg-card p-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-theme bg-secondary text-primary">
                    <iconify-icon icon={cat.icon} class="text-lg"></iconify-icon>
                  </span>
                  <span className="text-xs font-bold text-success">{cat.pct}</span>
                </div>
                <p className="mt-4 text-sm font-bold">{cat.name}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{cat.count}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full bg-primary ${cat.widthClass}`} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <div className="border-b border-border px-5">
            <div className="flex items-center gap-6">
              {PROFILE_TABS.map((tab) => {
                const isActive = tab === activeTab
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm ${
                      isActive ? 'border-b-2 border-primary font-bold text-primary' : 'font-semibold text-muted-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mx-5 mt-4 rounded-theme border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
                <iconify-icon icon="lucide:stamp" class="text-lg"></iconify-icon>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                    TEKNOLOJİ
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
                    <iconify-icon icon="lucide:clock-3" class="text-xs"></iconify-icon>
                    Mühürlü
                  </span>
                </div>
                <p className="mt-3 text-[15px] font-semibold leading-6">
                  Yeni nesil kişisel yapay zekâ cihazları yıl bitmeden günlük kullanıma girecek.
                </p>
                <div className="mt-3 flex items-center justify-between rounded-theme bg-muted px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <iconify-icon icon="lucide:calendar-days" class="text-base text-primary"></iconify-icon>
                    <span className="text-[11px] font-semibold">12 Aralık 2026'da açılacak</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">4 gün önce</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-5 mt-3 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between bg-success px-4 py-2 text-success-foreground">
              <span className="flex items-center gap-1.5 text-[11px] font-bold">
                <iconify-icon icon="lucide:badge-check" class="text-sm"></iconify-icon>
                Doğrulandı
              </span>
              <span className="text-[10px] font-semibold">3 Şub 2026</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                  EKONOMİ
                </span>
                <span className="text-[10px] text-muted-foreground">26 gün önce mühürlendi</span>
              </div>
              <p className="mt-3 text-[15px] font-semibold leading-6">
                &ldquo;TCMB politika faizini ocak sonunda sabit tutacak.&rdquo;
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-success">
                <iconify-icon icon="lucide:check-circle-2" class="text-base"></iconify-icon>
                Sonuç, tahminle eşleşti
              </div>
            </div>
          </div>

          <button className="mx-5 mt-4 flex w-[calc(100%-40px)] items-center justify-center gap-2 rounded-theme border border-border bg-card py-3 text-sm font-bold text-primary shadow-sm">
            Tüm tahmin geçmişi
            <iconify-icon icon="lucide:arrow-right" class="text-base"></iconify-icon>
          </button>
        </section>
      </main>
    </div>
  )
}
