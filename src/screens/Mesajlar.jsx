import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'

export default function Mesajlar() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="px-5 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-[26px] font-extrabold tracking-[-0.06em] text-primary">
              Mesajlar
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">Tahminlerin etrafındaki sohbetler</p>
          </div>
          <button
            aria-label="Yeni mesaj oluştur"
            className="flex h-11 w-11 items-center justify-center rounded-theme bg-primary text-primary-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:pen-square" class="text-xl"></iconify-icon>
          </button>
        </div>

        <div className="relative mt-5">
          <iconify-icon
            icon="lucide:search"
            class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground"
          ></iconify-icon>
          <input
            aria-label="Mesajlarda ara"
            type="search"
            placeholder="Mesajlarda ara"
            className="h-12 w-full rounded-theme border border-border bg-input pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </header>

      <main>
        <section className="mt-6">
          <div className="flex items-center justify-between px-5">
            <h2 className="font-heading text-sm font-bold tracking-tight">Sabitlenenler</h2>
            <button className="text-xs font-semibold text-primary">Düzenle</button>
          </div>

          <div className="mt-3 flex gap-4 overflow-x-auto px-5 pb-2">
            <button className="flex min-w-[70px] flex-col items-center text-center">
              <div className="relative h-[62px] w-[62px] rounded-full border-2 border-accent p-0.5">
                <div className="h-full w-full overflow-hidden rounded-full bg-muted">
                  <img src={IMG('2ebd8673-cdb6-436f-8c55-6f6cb7489059')} alt="Ece Arslan" className="h-full w-full object-cover" />
                </div>
                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                  <iconify-icon icon="lucide:pin" class="text-[10px]"></iconify-icon>
                </span>
              </div>
              <span className="mt-2 max-w-[72px] truncate text-[11px] font-semibold">Ece Arslan</span>
            </button>

            <button className="flex min-w-[82px] flex-col items-center text-center">
              <div className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-accent bg-secondary text-primary">
                <div className="grid grid-cols-2 gap-0.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card text-[9px] font-bold">D</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">O</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">Y</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card text-[9px] font-bold">3</span>
                </div>
                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                  <iconify-icon icon="lucide:pin" class="text-[10px]"></iconify-icon>
                </span>
              </div>
              <span className="mt-2 max-w-[82px] truncate text-[11px] font-semibold">Derbi Odası</span>
            </button>

            <button className="flex min-w-[70px] flex-col items-center text-center">
              <div className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full bg-muted text-primary">
                <iconify-icon icon="lucide:users-round" class="text-2xl"></iconify-icon>
                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-card text-muted-foreground">
                  <iconify-icon icon="lucide:pin" class="text-[10px]"></iconify-icon>
                </span>
              </div>
              <span className="mt-2 max-w-[72px] truncate text-[11px] font-semibold">Gelecek Lab</span>
            </button>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between px-5">
            <h2 className="font-heading text-lg font-bold tracking-tight">Sohbetler</h2>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
              3 okunmamış
            </span>
          </div>

          <div className="mt-3 border-y border-border bg-card">
            <button
              onClick={() => navigate('/sohbet')}
              className="flex w-full items-center gap-3 border-b border-border px-5 py-4 text-left"
            >
              <div className="relative h-14 w-14 shrink-0">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-muted">
                  <img src={IMG('30bcaf3b-c1a8-4dcb-bb98-3fdcc1b6b596')} alt="Ece Arslan" className="h-full w-full object-cover" />
                </div>
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-bold">Ece Arslan</p>
                  <time className="shrink-0 text-[11px] font-semibold text-primary">14:32</time>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <p className="truncate text-xs font-medium text-foreground">Açılınca sonucu birlikte konuşalım.</p>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <iconify-icon icon="lucide:lock-keyhole" class="text-xs text-primary"></iconify-icon>
                  <span>Mühürlü kayıt hakkında</span>
                </div>
              </div>
            </button>

            <button className="flex w-full items-center gap-3 border-b border-border px-5 py-4 text-left">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <div className="grid grid-cols-2 gap-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold">D</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold">O</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold">Y</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold">3</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-bold">Derbi Odası Yöneticileri</p>
                  <time className="shrink-0 text-[11px] text-muted-foreground">13:08</time>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <p className="truncate text-xs text-muted-foreground">Yeni etkinlik eklendi: Galatasaray - Fenerbahçe</p>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    2
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <iconify-icon icon="lucide:users-round" class="text-xs"></iconify-icon>
                  <span>Grup sohbeti · 184 üye</span>
                </div>
              </div>
            </button>

            <button className="flex w-full items-center gap-3 border-b border-border px-5 py-4 text-left">
              <div className="relative h-14 w-14 shrink-0">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-muted">
                  <img src={IMG('86e36643-3023-4f68-ba1c-4d2addba5617')} alt="Onur Şahin" className="h-full w-full object-cover" />
                </div>
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-bold">Onur Şahin</p>
                  <time className="shrink-0 text-[11px] text-muted-foreground">Dün</time>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <p className="truncate text-xs text-muted-foreground">Dünya Kupası tahminini mühürledin mi?</p>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <iconify-icon icon="lucide:check-check" class="text-xs text-success"></iconify-icon>
                  <span>Görüldü</span>
                </div>
              </div>
            </button>

            <button className="flex w-full items-center gap-3 px-5 py-4 text-left">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <iconify-icon icon="lucide:landmark" class="text-xl"></iconify-icon>
                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-muted-foreground">
                  <iconify-icon icon="lucide:volume-x" class="text-[10px]"></iconify-icon>
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-bold">Ekonomi Notları</p>
                  <time className="shrink-0 text-[11px] text-muted-foreground">Pzt</time>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">Selin Acar: Açılış tarihi için not düştüm.</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <iconify-icon icon="lucide:volume-x" class="text-xs"></iconify-icon>
                  <span>Bildirimler sessizde</span>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section className="mx-5 mt-7 rounded-theme border border-dashed border-border bg-muted/60 px-5 py-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-card text-primary shadow-sm">
            <iconify-icon icon="lucide:message-circle" class="text-lg"></iconify-icon>
          </div>
          <h2 className="mt-3 font-heading text-sm font-bold">Yeni bir sohbet başlat</h2>
          <p className="mx-auto mt-1 max-w-[250px] text-xs leading-5 text-muted-foreground">
            Birini takip ettiğinde veya gruba katıldığında, buradan kolayca mesajlaşabilirsin.
          </p>
          <button className="mt-4 inline-flex items-center gap-2 rounded-theme bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground">
            <iconify-icon icon="lucide:user-plus" class="text-sm"></iconify-icon>
            Kişi bul
          </button>
        </section>
      </main>
    </div>
  )
}
