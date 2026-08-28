import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'

export default function TahminKaydi() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="flex items-center justify-between px-5 pt-12 pb-5">
        <button
          aria-label="Geri dön"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-xl"></iconify-icon>
        </button>
        <p className="font-heading text-sm font-bold tracking-tight">Tahmin Kaydı</p>
        <button
          aria-label="Kaydı paylaş"
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:share-2" class="text-[18px]"></iconify-icon>
        </button>
      </header>

      <main>
        <section className="px-5">
          <div className="rounded-theme border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                <img
                  src={IMG('a4692a40-aad2-478a-927f-ac284145b46f')}
                  alt="Ece Arslan"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">Ece Arslan</p>
                  <iconify-icon icon="lucide:badge-check" class="text-base text-primary"></iconify-icon>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Mühürlü kayıt · 26 Ağustos 2026 · 21:14</p>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                SPOR
              </span>
            </div>

            <div className="mt-5">
              <h1 className="font-heading text-[25px] font-extrabold leading-8 tracking-[-0.045em]">
                Önümüzdeki derbi tahminimdir
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Bu sezonun formuna güveniyorum.</p>
            </div>

            <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
              <iconify-icon icon="lucide:shield-check" class="text-base text-success"></iconify-icon>
              <span>İçerik kaydedildi ve değiştirilemez.</span>
            </div>
          </div>
        </section>

        <section className="mx-5 mt-5 overflow-hidden rounded-theme bg-primary text-primary-foreground shadow-sm">
          <div className="relative px-5 pb-5 pt-6">
            <div className="absolute right-[-18px] top-[-18px] h-28 w-28 rounded-full border border-white/10" />
            <div className="absolute right-6 top-7 h-16 w-16 rounded-full border border-white/10" />
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-theme bg-white/15">
                  <iconify-icon icon="lucide:lock-keyhole" class="text-lg"></iconify-icon>
                </span>
                <div>
                  <p className="font-heading text-xl font-extrabold tracking-tight">Mühürlü</p>
                  <p className="text-[11px] text-white/65">Kayıt güvenle saklanıyor</p>
                </div>
              </div>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">AÇILMADI</span>
            </div>

            <div className="relative mt-6 rounded-theme border border-white/15 bg-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">Açılış zamanı</p>
                  <p className="mt-1 font-heading text-base font-bold">31 Ağustos 2026, 22:45</p>
                </div>
                <iconify-icon icon="lucide:calendar-clock" class="text-2xl text-white/75"></iconify-icon>
              </div>
              <div className="mt-4 h-px bg-white/15" />
              <div className="mt-4 flex items-center gap-2 text-xs text-white/75">
                <iconify-icon icon="lucide:eye-off" class="text-base"></iconify-icon>
                <span>Tahmin metni açılışa kadar görüntülenemez.</span>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-theme bg-white/10 px-2 py-3 text-center">
                <p className="font-heading text-lg font-extrabold">5</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/65">Gün</p>
              </div>
              <div className="rounded-theme bg-white/10 px-2 py-3 text-center">
                <p className="font-heading text-lg font-extrabold">01</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/65">Saat</p>
              </div>
              <div className="rounded-theme bg-white/10 px-2 py-3 text-center">
                <p className="font-heading text-lg font-extrabold">31</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/65">Dakika</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/15 bg-black/10 px-5 py-3">
            <div className="flex items-center gap-2">
              <iconify-icon icon="lucide:circle-check" class="text-base text-white/75"></iconify-icon>
              <p className="text-xs text-white/75">Mühür sonrası içerik kopyalanamaz, düzenlenemez veya silinemez.</p>
            </div>
          </div>
        </section>

        <section className="mx-5 mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold tracking-tight">Bağlı etkinlik</h2>
            <span className="text-[11px] font-semibold text-accent">Açılış koşulu</span>
          </div>
          <article className="rounded-theme border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
                <iconify-icon icon="lucide:goal" class="text-xl"></iconify-icon>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-[15px] font-bold">Galatasaray - Fenerbahçe</h3>
                <p className="mt-1 text-xs text-muted-foreground">31 Ağustos 2026 · İstanbul</p>
              </div>
              <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-theme bg-muted px-3 py-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
              <div>
                <p className="text-xs font-bold text-secondary-foreground">Resmi sonuç bekleniyor</p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                  Kayıt, etkinlik doğrulanarak tamamlandıktan sonra açılır.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="mx-5 mt-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-base font-bold tracking-tight">Kayıt güvencesi</h2>
              <p className="mt-1 text-xs text-muted-foreground">Zaman damgalı, kalıcı kanıt</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:fingerprint" class="text-lg"></iconify-icon>
            </div>
          </div>

          <div className="mt-3 rounded-theme border border-border bg-card p-4 shadow-sm">
            <p className="text-xs leading-5 text-muted-foreground">
              İlk mühürleme zamanı ve içerik özeti kalıcı olarak saklanır. Böylece tahminin sonuç açıklanmadan önce
              var olduğu doğrulanabilir.
            </p>
            <div className="mt-4 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">İçerik özeti</span>
                <span className="font-mono text-[11px] font-semibold text-primary">8f3c••••a91e</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Kayıt durumu</span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-success">
                  <iconify-icon icon="lucide:check-circle-2" class="text-sm"></iconify-icon>Doğrulanmış
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-5 mt-7">
          <h2 className="font-heading text-base font-bold tracking-tight">Açıldığında</h2>
          <div className="mt-3 rounded-theme border border-dashed border-border bg-muted/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-card text-primary shadow-sm">
                <iconify-icon icon="lucide:scan-search" class="text-lg"></iconify-icon>
              </div>
              <div>
                <p className="text-sm font-bold">Sonuçla birlikte değerlendirilecek</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Orijinal tahmin, resmi maç sonucu, kaynaklar ve doğruluk değerlendirmesi aynı kayıtta görünür.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-5 pb-5 pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[393px] gap-3">
          <button
            aria-label="Kaydı paylaş"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-primary shadow-sm"
          >
            <iconify-icon icon="lucide:share-2" class="text-[19px]"></iconify-icon>
          </button>
          <button className="flex flex-1 items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm">
            <iconify-icon icon="lucide:eye" class="text-base"></iconify-icon>
            Mühürlü kaydı incele
          </button>
          <button
            aria-label="Ece Arslan'ı takip et"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-primary shadow-sm"
          >
            <iconify-icon icon="lucide:user-plus" class="text-[19px]"></iconify-icon>
          </button>
        </div>
      </div>
    </div>
  )
}
