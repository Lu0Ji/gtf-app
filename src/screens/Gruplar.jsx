import { useState } from 'react'
import { IMG } from '../lib/images.js'

const FILTERS = ['Takip ettiklerin', 'Önerilenler', 'Herkese açık', 'Özel gruplar']

export default function Gruplar() {
  const [activeFilter, setActiveFilter] = useState('Takip ettiklerin')

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <header className="px-5 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Topluluklar
            </p>
            <h1 className="mt-1 font-heading text-[25px] font-extrabold tracking-[-0.055em] text-primary">
              Gruplar
            </h1>
          </div>
          <button
            aria-label="Grup davetleri"
            className="relative flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:mail-plus" class="text-[19px]"></iconify-icon>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
          </button>
        </div>

        <div className="relative mt-5">
          <iconify-icon
            icon="lucide:search"
            class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground"
          ></iconify-icon>
          <input
            aria-label="Grup ara"
            type="search"
            placeholder="Grup ara"
            className="h-12 w-full rounded-theme border border-border bg-input pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <button className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm">
          <iconify-icon icon="lucide:plus" class="text-lg"></iconify-icon>
          Yeni grup kur
        </button>
      </header>

      <main className="pt-6">
        <div className="border-b border-border px-5">
          <div className="flex gap-5 overflow-x-auto">
            {FILTERS.map((filter) => {
              const isActive = filter === activeFilter
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`shrink-0 border-b-2 pb-3 text-sm ${
                    isActive
                      ? 'border-primary font-bold text-primary'
                      : 'border-transparent font-medium text-muted-foreground'
                  }`}
                >
                  {filter}
                </button>
              )
            })}
          </div>
        </div>

        <section className="pt-5">
          <div className="flex items-end justify-between px-5">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-tight">Takip ettiklerin</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Gündemdeki toplulukların</p>
            </div>
            <button className="text-xs font-bold text-primary">Tümünü gör</button>
          </div>

          <article className="mx-5 mt-4 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <div className="relative h-32 w-full overflow-hidden">
              <img
                src={IMG('7c699d9a-f77e-4389-94ef-f9211f92a605')}
                alt="Derbi Odası kapak görseli"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <span className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold text-primary backdrop-blur-sm">
                  SPOR
                </span>
                <span className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                  <iconify-icon icon="lucide:users" class="text-xs"></iconify-icon>18,4 B
                </span>
              </div>
              <button
                aria-label="Derbi Odası seçenekleri"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-primary backdrop-blur-sm"
              >
                <iconify-icon icon="lucide:ellipsis" class="text-base"></iconify-icon>
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-heading text-[18px] font-bold tracking-tight">Derbi Odası</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Futbolun en çok konuşulan geceleri için ortak kayıt.
                  </p>
                </div>
                <button className="shrink-0 rounded-theme bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground">
                  Takipte
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-theme bg-muted px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-primary">
                    <iconify-icon icon="lucide:lock-keyhole" class="text-sm"></iconify-icon>
                  </div>
                  <p className="text-xs font-semibold text-foreground">326 mühürlü tahmin</p>
                </div>
                <span className="text-[11px] text-muted-foreground">Yaklaşan derbi</span>
              </div>
            </div>
          </article>

          <article className="mx-5 mt-3 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <div className="flex">
              <div className="relative h-28 w-[112px] shrink-0 overflow-hidden">
                <img
                  src={IMG('d477895f-b33d-466d-8349-8bcff9e4508a')}
                  alt="Geleceğin Teknolojisi kapak görseli"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-primary/15" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="rounded-full bg-secondary px-2 py-1 text-[9px] font-bold text-secondary-foreground">
                      TEKNOLOJİ
                    </span>
                    <h3 className="mt-2 truncate font-heading text-[16px] font-bold">
                      Geleceğin Teknolojisi
                    </h3>
                  </div>
                  <button aria-label="Geleceğin Teknolojisi seçenekleri" className="text-muted-foreground">
                    <iconify-icon icon="lucide:ellipsis" class="text-lg"></iconify-icon>
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <iconify-icon icon="lucide:users" class="text-sm"></iconify-icon>7,2 B üye
                  </span>
                  <span className="font-semibold text-success">12 yeni kayıt</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between px-5">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-tight">Önerilenler</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">İlgi alanlarına göre seçildi</p>
            </div>
            <iconify-icon icon="lucide:sparkles" class="mb-1 text-lg text-accent"></iconify-icon>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto px-5 pb-2">
            <article className="min-w-[244px] overflow-hidden rounded-theme border border-border bg-card shadow-sm">
              <div className="relative h-28 w-full overflow-hidden">
                <img
                  src={IMG('94075804-d227-4579-b415-d556ea297679')}
                  alt="Olimpiyat Takipçileri kapak görseli"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold text-primary backdrop-blur-sm">
                  SPOR
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-heading text-[17px] font-bold">Olimpiyat Takipçileri</h3>
                <p className="mt-1 text-xs text-muted-foreground">4,8 B üye · 89 yeni tahmin</p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                  <iconify-icon icon="lucide:calendar-days" class="text-sm"></iconify-icon>
                  Milano Cortina 2026
                </div>
                <button className="mt-4 w-full rounded-theme bg-primary py-2.5 text-xs font-bold text-primary-foreground">
                  Katıl
                </button>
              </div>
            </article>

            <article className="min-w-[224px] rounded-theme border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                  FİNANS
                </span>
                <button aria-label="Piyasa Notları seçenekleri" className="text-muted-foreground">
                  <iconify-icon icon="lucide:ellipsis" class="text-lg"></iconify-icon>
                </button>
              </div>
              <div className="mt-6 flex h-11 w-11 items-center justify-center rounded-theme bg-muted text-primary">
                <iconify-icon icon="lucide:chart-no-axes-combined" class="text-xl"></iconify-icon>
              </div>
              <h3 className="mt-4 font-heading text-[17px] font-bold">Piyasa Notları</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Haftalık görünüm ve uzun vadeli tahminler.
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">2,1 B üye</span>
                <button className="rounded-theme bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground">
                  Katıl
                </button>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between px-5">
            <h2 className="font-heading text-lg font-bold tracking-tight">Herkese açık</h2>
            <button className="text-xs font-bold text-primary">Tümünü gör</button>
          </div>

          <article className="mx-5 mt-4 flex items-center gap-3 rounded-theme border border-border bg-card p-3 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-[#E8EEF0] text-primary">
              <iconify-icon icon="lucide:landmark" class="text-xl"></iconify-icon>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-bold">Şehir Gündemi</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-secondary-foreground">
                  ŞEHİR
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">3,6 B üye · Bugün 24 tahmin</p>
            </div>
            <button className="shrink-0 rounded-theme border border-border bg-card px-3 py-2 text-xs font-bold text-primary">
              Katıl
            </button>
          </article>

          <article className="mx-5 mt-3 flex items-center gap-3 rounded-theme border border-border bg-card p-3 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-[#F0EBE3] text-accent">
              <iconify-icon icon="lucide:clapperboard" class="text-xl"></iconify-icon>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-bold">Perde Arkası</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-secondary-foreground">
                  KÜLTÜR
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">1,9 B üye · Dün 17 tahmin</p>
            </div>
            <button className="shrink-0 rounded-theme border border-border bg-card px-3 py-2 text-xs font-bold text-primary">
              Katıl
            </button>
          </article>
        </section>

        <section className="mt-8 px-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold tracking-tight">Özel gruplar</h2>
            <button className="text-xs font-bold text-primary">Tümünü gör</button>
          </div>

          <article className="mt-4 rounded-theme border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-muted text-primary">
                <iconify-icon icon="lucide:graduation-cap" class="text-xl"></iconify-icon>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-bold">Boğaziçi '16 Mezunları</h3>
                  <iconify-icon icon="lucide:lock-keyhole" class="shrink-0 text-sm text-muted-foreground"></iconify-icon>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  248 üye · Yalnızca üyeler kayıtları görebilir
                </p>
              </div>
            </div>
            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-theme bg-secondary py-2.5 text-xs font-bold text-secondary-foreground">
              <iconify-icon icon="lucide:send" class="text-sm"></iconify-icon>
              Katılım isteği gönder
            </button>
          </article>
        </section>
      </main>
    </div>
  )
}
