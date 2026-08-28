import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'

const THEME_COLORS = [
  { name: 'Gece Mürekkebi', hex: '#183B5B', icon: 'lucide:check' },
  { name: 'Kehribar Bakır', hex: '#A76522', icon: 'lucide:contrast' },
  { name: 'Orman Yeşili', hex: '#267050', icon: 'lucide:contrast' },
  { name: 'Sis Mavisi', hex: '#167C80', icon: 'lucide:contrast' },
  { name: 'Erik Moru', hex: '#6B5A97', icon: 'lucide:contrast' },
  { name: 'Koyu Bordo', hex: '#9D3B51', icon: 'lucide:contrast' },
]

export default function ProfilAyarlari() {
  const navigate = useNavigate()
  const [selectedTheme, setSelectedTheme] = useState('Gece Mürekkebi')

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <header className="flex items-center justify-between px-5 pt-12">
        <div className="flex items-center gap-3">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <div>
            <h1 className="font-heading text-[20px] font-extrabold tracking-[-0.05em]">Profil ayarları</h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Görünümünü kişiselleştir</p>
          </div>
        </div>
        <button
          aria-label="Yardım"
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-muted-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:circle-help" class="text-[19px]"></iconify-icon>
        </button>
      </header>

      <main className="pt-6">
        <section className="px-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Canlı önizleme</h2>
              <p className="mt-1 text-xs text-muted-foreground">Profilindeki görünüm bu şekilde olacak</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1.5 text-[10px] font-bold text-secondary-foreground">
              Yalnızca senin profilin
            </span>
          </div>

          <article className="mt-4 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <div className="relative h-28 w-full overflow-hidden bg-[#183B5B]">
              <img
                src={IMG('b32c1757-d3fe-4345-8012-9a4613b7c4e0')}
                alt="Profil kapak görseli"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#183B5B]/45 to-transparent" />
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1.5 text-[10px] font-bold text-foreground backdrop-blur-sm">
                <iconify-icon icon="lucide:eye" class="text-xs"></iconify-icon>
                Önizleme
              </div>
            </div>

            <div className="relative px-4 pb-4">
              <div className="-mt-9 flex items-end justify-between">
                <div className="h-[76px] w-[76px] overflow-hidden rounded-full border-4 border-card bg-card shadow-md">
                  <img
                    src={IMG('b24a4f41-e671-44e8-a000-f9577da3292c')}
                    alt="Elif Demir"
                    className="h-full w-full object-cover"
                  />
                </div>
                <button className="mb-1 flex items-center gap-1.5 rounded-theme bg-[#183B5B] px-3 py-2 text-[11px] font-bold text-white">
                  <iconify-icon icon="lucide:user-plus" class="text-sm"></iconify-icon>
                  Takip et
                </button>
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-heading text-[18px] font-extrabold tracking-[-0.045em]">Elif Demir</h3>
                  <iconify-icon icon="lucide:badge-check" class="text-base text-[#183B5B]"></iconify-icon>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">@elifdemir · İstanbul</p>
                <p className="mt-3 text-xs leading-5 text-foreground">
                  Geleceği not alıyorum. Teknoloji, şehir hayatı ve uzun vadeli fikirler.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-theme bg-muted py-3">
                <div className="px-2 text-center">
                  <p className="font-heading text-base font-extrabold text-[#183B5B]">86</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Tahmin</p>
                </div>
                <div className="px-2 text-center">
                  <p className="font-heading text-base font-extrabold text-[#183B5B]">%72</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">İsabet</p>
                </div>
                <div className="px-2 text-center">
                  <p className="font-heading text-base font-extrabold text-[#183B5B]">1,2 B</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Takipçi</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-theme border border-[#183B5B]/20 bg-[#183B5B]/[0.06] px-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-theme bg-[#183B5B] text-white">
                  <iconify-icon icon="lucide:chart-no-axes-combined" class="text-lg"></iconify-icon>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-foreground">Son 90 gün performansı</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">18 doğrulanmış kayıt · Tutarlı yükseliş</p>
                </div>
                <iconify-icon icon="lucide:chevron-right" class="ml-auto text-base text-[#183B5B]"></iconify-icon>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-7 px-5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Kapak fotoğrafı</h2>
              <p className="mt-1 text-xs text-muted-foreground">Profil fotoğrafının arkasında görünür</p>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">İsteğe bağlı</span>
          </div>

          <div className="mt-4 rounded-theme border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-16 w-20 shrink-0 overflow-hidden rounded-theme bg-muted">
                <img
                  src={IMG('bae86251-5608-4e6e-a5d0-0f53f6538759')}
                  alt="Seçili kapak fotoğrafı"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Gelecek ufku</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  Yatay görseller en iyi sonucu verir. Kaydetmeden önce kırpabilirsin.
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-theme bg-secondary py-2.5 text-xs font-bold text-secondary-foreground">
                <iconify-icon icon="lucide:replace" class="text-sm"></iconify-icon>
                Değiştir
              </button>
              <button className="flex items-center justify-center gap-1.5 rounded-theme border border-border px-4 py-2.5 text-xs font-bold text-destructive">
                <iconify-icon icon="lucide:trash-2" class="text-sm"></iconify-icon>
                Kaldır
              </button>
            </div>
          </div>
        </section>

        <section className="mt-7 px-5">
          <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Profil fotoğrafı</h2>
          <p className="mt-1 text-xs text-muted-foreground">Tanıdıkların seni daha kolay bulsun</p>

          <div className="mt-4 flex items-center gap-4 rounded-theme border border-border bg-card p-4 shadow-sm">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-secondary">
              <img
                src={IMG('b2552d37-f604-48b3-9b67-704f4b8acb1e')}
                alt="Elif Demir profil fotoğrafı"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Elif Demir</p>
              <p className="mt-1 text-[11px] text-muted-foreground">JPG, PNG veya HEIC · En fazla 10 MB</p>
            </div>
            <button
              aria-label="Profil fotoğrafını değiştir"
              className="flex h-10 w-10 items-center justify-center rounded-theme bg-secondary text-primary"
            >
              <iconify-icon icon="lucide:camera" class="text-lg"></iconify-icon>
            </button>
          </div>
        </section>

        <section className="mt-7 px-5">
          <div>
            <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Profil tema rengi</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Seçimin yalnızca profilindeki vurgulara, istatistiklere ve performans kartına uygulanır.
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {THEME_COLORS.map((color, i) => {
              const isSelected = color.name === selectedTheme
              return (
                <button
                  key={color.name}
                  onClick={() => setSelectedTheme(color.name)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
                    i < THEME_COLORS.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                    style={
                      isSelected
                        ? { backgroundColor: color.hex, boxShadow: `0 0 0 2px var(--color-card), 0 0 0 4px ${color.hex}` }
                        : { backgroundColor: color.hex }
                    }
                  >
                    <iconify-icon icon={isSelected ? 'lucide:check' : 'lucide:contrast'} class={isSelected ? 'text-lg' : 'text-sm'}></iconify-icon>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{color.name}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">Yüksek kontrast · AA</span>
                  </span>
                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                      <iconify-icon icon="lucide:circle-check" class="text-sm"></iconify-icon>
                      Seçili
                    </span>
                  ) : (
                    <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <section className="mx-5 mt-6 rounded-theme bg-muted px-4 py-3">
          <div className="flex items-start gap-2.5">
            <iconify-icon icon="lucide:info" class="mt-0.5 text-base text-primary"></iconify-icon>
            <p className="text-[11px] leading-5 text-muted-foreground">
              Tema rengin uygulamanın genel görünümünü değiştirmez. Tahmin kayıtların ve doğrulama bilgilerin her
              zaman aynı kalır.
            </p>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-5 pb-6 pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[393px] gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-12 flex-1 items-center justify-center rounded-theme border border-border bg-card text-sm font-bold text-secondary-foreground"
          >
            Vazgeç
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex h-12 flex-[1.45] items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:check" class="text-lg"></iconify-icon>
            Değişiklikleri kaydet
          </button>
        </div>
      </div>
    </div>
  )
}
