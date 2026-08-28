import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'

export default function Sohbet() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body">
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 pb-4 pt-12 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <button
              aria-label="Mesajlara dön"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-theme bg-secondary text-secondary-foreground"
            >
              <iconify-icon icon="lucide:arrow-left" class="text-xl"></iconify-icon>
            </button>

            <button className="flex min-w-0 flex-1 items-center justify-center gap-3 px-3 text-left">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                <img
                  src={IMG('45ef8632-46e1-43ca-9a32-ce5f5800af73')}
                  alt="Ece Arslan"
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-success" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-extrabold tracking-tight">Ece Arslan</p>
                <p className="mt-0.5 text-[11px] text-success">Şimdi aktif</p>
              </div>
            </button>

            <button
              aria-label="Sohbet seçenekleri"
              className="flex h-10 w-10 items-center justify-center rounded-theme bg-secondary text-secondary-foreground"
            >
              <iconify-icon icon="lucide:ellipsis" class="text-xl"></iconify-icon>
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 pb-36 pt-6">
          <div className="flex justify-center">
            <span className="rounded-full bg-muted px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">
              Bugün
            </span>
          </div>

          <section className="mt-7" aria-label="Sohbet mesajları">
            <div className="flex items-end gap-2.5">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                <img
                  src={IMG('73b0e5be-8f22-49ab-8330-548beaba1a27')}
                  alt="Ece Arslan"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="max-w-[268px]">
                <div className="rounded-theme rounded-bl-sm border border-border bg-card px-4 py-3 shadow-sm">
                  <p className="text-sm leading-5">Derbi için tahmin yaptın mı?</p>
                </div>
                <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">14:18</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <div className="max-w-[286px]">
                <div className="rounded-theme rounded-br-sm bg-primary px-4 py-3 text-primary-foreground shadow-sm">
                  <p className="text-sm leading-5">Evet, ama mühürlü. 31 Ağustos'u bekleyeceğiz.</p>
                </div>
                <p className="mt-1.5 px-1 text-right text-[10px] text-muted-foreground">14:20 · İletildi</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/tahmin-kaydi')}
              className="ml-10 mt-5 block max-w-[292px] rounded-theme border border-border bg-card p-3.5 text-left shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-primary text-primary-foreground">
                  <iconify-icon icon="lucide:lock-keyhole" class="text-base"></iconify-icon>
                </div>
                <iconify-icon icon="lucide:chevron-right" class="mt-1 text-lg text-muted-foreground"></iconify-icon>
              </div>
              <p className="mt-5 font-heading text-[15px] font-extrabold leading-5 tracking-tight">
                Önümüzdeki derbi tahminimdir
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                  SPOR
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
                  <iconify-icon icon="lucide:calendar-days" class="text-xs"></iconify-icon>
                  31 Ağustos'ta açılacak
                </span>
              </div>
            </button>

            <div className="ml-10 mt-3 flex max-w-[292px] gap-2 rounded-theme bg-muted px-3 py-2.5">
              <iconify-icon icon="lucide:shield-check" class="mt-0.5 shrink-0 text-base text-primary"></iconify-icon>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Özel tahmin içeriği açılmadan gönderilemez, alıntılanamaz veya önizlenemez.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="max-w-[248px]">
                <div className="rounded-theme rounded-br-sm bg-primary px-4 py-3 text-primary-foreground shadow-sm">
                  <p className="text-sm leading-5">Ben de etkinliğe bağladım.</p>
                </div>
                <p className="mt-1.5 px-1 text-right text-[10px] text-muted-foreground">14:22 · İletildi</p>
              </div>
            </div>
          </section>
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-4 pb-5 pt-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-[393px] items-end gap-2">
            <button
              aria-label="Dosya ekle"
              className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground"
            >
              <iconify-icon icon="lucide:paperclip" class="text-xl"></iconify-icon>
            </button>
            <button
              aria-label="Kamera"
              className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground"
            >
              <iconify-icon icon="lucide:camera" class="text-xl"></iconify-icon>
            </button>
            <div className="flex h-12 min-w-0 flex-1 items-center rounded-theme border border-border bg-input px-4 shadow-sm">
              <span className="text-sm text-muted-foreground">Mesaj yaz...</span>
            </div>
            <button
              aria-label="Mesaj gönder"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-primary text-primary-foreground shadow-sm"
            >
              <iconify-icon icon="lucide:send" class="text-xl"></iconify-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
