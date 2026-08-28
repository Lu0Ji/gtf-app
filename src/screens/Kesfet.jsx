import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'

const CATEGORY_TILES = [
  { name: 'Spor', icon: 'lucide:trophy', count: '148 mühürlü tahmin', variant: 'primary' },
  { name: 'Teknoloji', icon: 'lucide:cpu', count: '96 mühürlü tahmin', variant: 'card' },
  { name: 'Bilim', icon: 'lucide:flask-conical', count: '73 mühürlü tahmin', variant: 'card' },
  { name: 'Kültür', icon: 'lucide:book-open', count: '61 mühürlü tahmin', variant: 'secondary' },
  { name: 'Ekonomi', icon: 'lucide:chart-no-axes-combined', count: '54 mühürlü tahmin', variant: 'secondary' },
  { name: 'Dünya', icon: 'lucide:globe-2', count: '49 mühürlü tahmin', variant: 'card' },
]

const RISING_PREDICTORS = [
  { name: 'Nisa Yıldız', tag: 'Genel başarı oranı', pct: '%82', imageId: '3494e856-c763-439f-b959-54faed7982c2' },
  { name: 'Can Bora', tag: 'Teknoloji alanında', pct: '%79', imageId: 'd0ba0d80-c26c-40af-bdd9-875561dc4ae5' },
  { name: 'Ece Arslan', tag: 'Spor alanında', pct: '%76', imageId: 'e13f30b9-37e4-4d2c-a470-5ed617a98877' },
]

const LEADERBOARD = [
  { rank: 1, name: 'Nisa Yıldız', score: '12 / 15 doğru', pct: '%80', imageId: 'e5c6a2fd-2700-478a-a8f3-1ed0f5acfc3e' },
  { rank: 2, name: 'Ece Arslan', score: '9 / 12 doğru', pct: '%75', imageId: '0fe99233-7a27-4b70-960a-5148431a792b' },
  { rank: 3, name: 'Kerem Uslu', score: '8 / 11 doğru', pct: '%73', imageId: '373eb324-cbb6-4578-b81a-266c3459b694' },
]

function CategoryTile({ tile }) {
  const variantClass =
    tile.variant === 'primary'
      ? 'bg-primary text-primary-foreground shadow-sm'
      : tile.variant === 'secondary'
        ? 'bg-secondary text-secondary-foreground'
        : 'border border-border bg-card text-card-foreground shadow-sm'
  const iconWrapClass =
    tile.variant === 'primary'
      ? ''
      : 'flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary'
  const arrowClass = tile.variant === 'primary' ? 'text-base text-white/70' : 'text-base text-muted-foreground'

  return (
    <button className={`rounded-theme p-4 text-left ${variantClass}`}>
      <div className="flex items-start justify-between">
        {tile.variant === 'primary' ? (
          <iconify-icon icon={tile.icon} class="text-xl"></iconify-icon>
        ) : tile.variant === 'secondary' ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-primary">
            <iconify-icon icon={tile.icon} class="text-lg"></iconify-icon>
          </span>
        ) : (
          <span className={iconWrapClass}>
            <iconify-icon icon={tile.icon} class="text-lg"></iconify-icon>
          </span>
        )}
        <iconify-icon icon="lucide:arrow-up-right" class={arrowClass}></iconify-icon>
      </div>
      <p className={`font-heading text-base font-bold ${tile.variant === 'primary' ? 'mt-7' : 'mt-5'}`}>
        {tile.name}
      </p>
      <p className={`mt-1 text-[11px] ${tile.variant === 'primary' ? 'text-white/70' : 'text-muted-foreground'}`}>
        {tile.count}
      </p>
    </button>
  )
}

export default function Kesfet() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="px-5 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Keşfet</p>
            <h1 className="mt-1 font-heading text-[27px] font-extrabold tracking-[-0.06em] text-primary">
              Geleceğin izinde
            </h1>
          </div>
          <button
            aria-label="Konumu değiştir"
            className="flex items-center gap-1.5 rounded-theme border border-border bg-card px-3 py-2 text-xs font-bold text-primary shadow-sm"
          >
            <iconify-icon icon="lucide:map-pin" class="text-base text-accent"></iconify-icon>
            İstanbul
            <iconify-icon icon="lucide:chevron-down" class="text-sm"></iconify-icon>
          </button>
        </div>

        <button
          aria-label="Kişi, tahmin, etkinlik veya kategori ara"
          className="mt-5 flex w-full items-center gap-3 rounded-theme border border-border bg-card px-4 py-4 text-left text-sm text-muted-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:search" class="text-xl text-primary"></iconify-icon>
          <span>Kişi, tahmin, etkinlik veya kategori ara</span>
        </button>
      </header>

      <main>
        <section className="mb-8">
          <div className="flex items-end justify-between px-5">
            <div>
              <div className="flex items-center gap-1.5">
                <iconify-icon icon="lucide:map-pin" class="text-base text-accent"></iconify-icon>
                <p className="text-xs font-semibold text-muted-foreground">İstanbul çevresi</p>
              </div>
              <h2 className="mt-1 font-heading text-lg font-bold tracking-tight">Yakınındaki etkinlikler</h2>
            </div>
            <button className="text-xs font-bold text-primary">Haritada gör</button>
          </div>

          <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
            <article className="relative min-w-[254px] overflow-hidden rounded-theme bg-primary shadow-sm">
              <div className="h-44 w-full overflow-hidden">
                <img
                  src={IMG('778e5bf6-cc7c-4854-a9b8-24e1b6d9ede7')}
                  alt="Galatasaray Fenerbahçe maçı"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
              <div className="absolute left-3 top-3">
                <span className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold text-primary backdrop-blur-sm">
                  SPOR
                </span>
              </div>
              <div className="p-4 text-primary-foreground">
                <h3 className="font-heading text-base font-bold">Galatasaray - Fenerbahçe</h3>
                <div className="mt-2 flex items-center justify-between text-xs text-white/75">
                  <span>31 Ağustos · İstanbul</span>
                  <span className="flex items-center gap-1 font-semibold text-white">
                    <iconify-icon icon="lucide:pen-line" class="text-sm"></iconify-icon>42 tahmin
                  </span>
                </div>
              </div>
            </article>

            <article className="min-w-[214px] overflow-hidden rounded-theme border border-border bg-card shadow-sm">
              <div className="h-28 w-full overflow-hidden">
                <img
                  src={IMG('a98364be-5183-4341-a638-14d448d40f1f')}
                  alt="İstanbul Maratonu"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-accent">Şehir</span>
                <h3 className="mt-1 font-heading text-sm font-bold">İstanbul Maratonu</h3>
                <p className="mt-1 text-xs text-muted-foreground">8 Kasım · 18 tahmin</p>
              </div>
            </article>

            <article className="min-w-[214px] overflow-hidden rounded-theme border border-border bg-card shadow-sm">
              <div className="h-28 w-full overflow-hidden">
                <img
                  src={IMG('bb6677f0-a313-4f08-a870-b57af7eb193c')}
                  alt="Akbank Caz Festivali"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-accent">Kültür</span>
                <h3 className="mt-1 font-heading text-sm font-bold">Akbank Caz Festivali</h3>
                <p className="mt-1 text-xs text-muted-foreground">2 Ekim · 15 tahmin</p>
              </div>
            </article>
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between px-5">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-tight">Popüler alanlar</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Mühürlü kayıtlar açılmayı bekliyor</p>
            </div>
            <iconify-icon icon="lucide:layout-grid" class="text-lg text-primary"></iconify-icon>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 px-5">
            {CATEGORY_TILES.map((tile) => (
              <CategoryTile key={tile.name} tile={tile} />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between px-5">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-tight">Yükselen tahminciler</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Son 30 günde istikrarlı sonuçlar</p>
            </div>
            <button className="text-xs font-bold text-primary">Tümü</button>
          </div>

          <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
            {RISING_PREDICTORS.map((person) => (
              <article key={person.name} className="min-w-[196px] rounded-theme border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
                    <img src={IMG(person.imageId)} alt={person.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                    <span className="font-heading text-sm font-extrabold">{person.pct}</span>
                  </div>
                </div>
                <p className="mt-3 font-heading text-sm font-bold">{person.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{person.tag}</p>
                <button className="mt-4 w-full rounded-theme bg-secondary py-2.5 text-xs font-bold text-secondary-foreground">
                  Takip et
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-5 mb-8 rounded-theme border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                  <iconify-icon icon="lucide:medal" class="text-lg"></iconify-icon>
                </span>
                <h2 className="font-heading text-lg font-bold tracking-tight">Liderlik Tablosu</h2>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Doğrulanmış tahminlere göre</p>
            </div>
            <button
              aria-label="Liderlik tablosunu aç"
              onClick={() => navigate('/liderlik-tablosu')}
              className="rounded-full bg-muted p-2 text-primary"
            >
              <iconify-icon icon="lucide:arrow-up-right" class="text-base"></iconify-icon>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button className="rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
              Haftalık
            </button>
            <button className="rounded-full bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
              Aylık
            </button>
            <button className="rounded-full bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
              Yıllık
            </button>
            <button className="ml-auto flex items-center gap-1 rounded-full border border-border px-2.5 py-2 text-xs font-semibold text-primary">
              Spor <iconify-icon icon="lucide:chevron-down" class="text-sm"></iconify-icon>
            </button>
          </div>

          <div className="mt-4 divide-y divide-border">
            {LEADERBOARD.map((entry) => (
              <button key={entry.rank} className="flex w-full items-center gap-3 py-3 text-left">
                <span
                  className={`w-5 font-heading text-sm font-extrabold ${
                    entry.rank === 1 ? 'text-accent' : 'text-muted-foreground'
                  }`}
                >
                  {entry.rank}
                </span>
                <div className="h-9 w-9 overflow-hidden rounded-full bg-muted">
                  <img src={IMG(entry.imageId)} alt={entry.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{entry.name}</p>
                  <p className="text-[11px] text-muted-foreground">{entry.score}</p>
                </div>
                <span className="font-heading text-sm font-extrabold text-success">{entry.pct}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <div className="flex items-end justify-between px-5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" />
                <p className="text-xs font-semibold text-success">Yeni doğrulandı</p>
              </div>
              <h2 className="mt-1 font-heading text-lg font-bold tracking-tight">Açılanlar</h2>
            </div>
            <button className="text-xs font-bold text-primary">Tüm kayıtlar</button>
          </div>

          <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
            <article className="min-w-[278px] rounded-theme border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                  TEKNOLOJİ
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                  <iconify-icon icon="lucide:badge-check" class="text-sm"></iconify-icon>Yapay zekâ doğruladı
                </span>
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">14 Mayıs 2026'da mühürlendi</p>
              <h3 className="mt-2 font-heading text-[17px] font-bold leading-6">
                &ldquo;Yeni nesil katlanabilir telefonlar yıl bitmeden daha ince tasarımlara geçecek.&rdquo;
              </h3>
              <div className="mt-4 rounded-theme bg-muted p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Resmî sonuç</p>
                <p className="mt-1 text-xs leading-5 text-foreground">
                  Üç büyük üretici ince gövdeli yeni modellerini duyurdu.
                </p>
              </div>
            </article>

            <article className="min-w-[278px] rounded-theme border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                  SPOR
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                  <iconify-icon icon="lucide:badge-check" class="text-sm"></iconify-icon>Yapay zekâ doğruladı
                </span>
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">2 Haziran 2026'da mühürlendi</p>
              <h3 className="mt-2 font-heading text-[17px] font-bold leading-6">
                &ldquo;Kadıköy'deki derbide ilk yarı golsüz tamamlanacak.&rdquo;
              </h3>
              <div className="mt-4 rounded-theme bg-muted p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Resmî sonuç</p>
                <p className="mt-1 text-xs leading-5 text-foreground">Karşılaşmanın ilk yarısı 0–0 sonuçlandı.</p>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}
