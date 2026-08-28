import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'

const PERIODS = ['Haftalık', 'Aylık', 'Yıllık']
const CATEGORY_FILTERS = ['Tümü', 'Spor', 'Teknoloji', 'Bilim', 'Kültür', 'Ekonomi', 'Dünya']

const PODIUM = [
  {
    rank: 2,
    name: 'Deniz Akın',
    pct: '%81',
    trend: { dir: 'up', value: 1 },
    imageId: 'f344a36f-c08a-43ed-9fdd-515f4a0dd025',
    accent: '#B87935',
  },
  {
    rank: 1,
    name: 'İpek Yalçın',
    pct: '%86',
    trend: { dir: 'up', value: 3 },
    imageId: '6ff2f211-4470-4cea-be7a-27dd9e2c267d',
    accent: '#9A5C14',
  },
  {
    rank: 3,
    name: 'Sena Bilgin',
    pct: '%79',
    trend: { dir: 'flat', value: 0 },
    imageId: 'eb6705b4-d387-49ff-8ebc-1f69976d9a8e',
    accent: '#C18B57',
  },
]

const RANKINGS = [
  { rank: 4, name: 'Kerem Arda', initials: 'KA', count: 29, pct: '%77', trend: { dir: 'up', value: 2 }, tone: 'secondary' },
  { rank: 5, name: 'Zeynep Doğan', initials: 'ZD', count: 44, pct: '%75', trend: { dir: 'down', value: 1 }, tone: 'muted' },
  { rank: 6, name: 'Onur Aydın', initials: 'OA', count: 18, pct: '%72', trend: { dir: 'up', value: 4 }, tone: 'secondary' },
  { rank: 7, name: 'Ece Arslan', initials: 'EA', count: 34, pct: '%71', trend: { dir: 'flat', value: 0 }, tone: 'muted' },
  { rank: 8, name: 'Melis Öztürk', initials: 'MÖ', count: 25, pct: '%70', trend: { dir: 'up', value: 1 }, tone: 'secondary' },
]

function TrendBadge({ trend }) {
  if (trend.dir === 'up') {
    return (
      <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] font-semibold text-success">
        <iconify-icon icon="lucide:arrow-up" class="text-xs"></iconify-icon>
        {trend.value}
      </p>
    )
  }
  if (trend.dir === 'down') {
    return (
      <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] font-semibold text-destructive">
        <iconify-icon icon="lucide:arrow-down" class="text-xs"></iconify-icon>
        {trend.value}
      </p>
    )
  }
  return (
    <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] font-semibold text-muted-foreground">
      <iconify-icon icon="lucide:minus" class="text-xs"></iconify-icon>
      {trend.value}
    </p>
  )
}

export default function LiderlikTablosu() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('Haftalık')
  const [category, setCategory] = useState('Tümü')

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <header className="border-b border-border bg-background px-5 pb-4 pt-12">
        <div className="flex items-center gap-3">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-lg"></iconify-icon>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-extrabold tracking-tight">Liderlik Tablosu</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Kalıcı, doğrulanmış kayıtlar</p>
          </div>
          <button
            aria-label="Dönem seçimi"
            className="flex items-center gap-1.5 rounded-theme bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"
          >
            2026
            <iconify-icon icon="lucide:chevron-down" class="text-sm"></iconify-icon>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 rounded-theme bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-[10px] py-2.5 text-xs ${
                p === period ? 'bg-card font-bold text-primary shadow-sm' : 'font-semibold text-muted-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_FILTERS.map((c) => {
            const isActive = c === category
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs ${
                  isActive
                    ? 'bg-primary font-bold text-primary-foreground'
                    : 'border border-border bg-card font-semibold text-secondary-foreground'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
      </header>

      <main>
        <section className="px-5 pb-5 pt-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Bu hafta</p>
              <h2 className="mt-1 font-heading text-lg font-bold tracking-tight">Öne çıkan tahminciler</h2>
            </div>
            <p className="text-right text-[11px] leading-4 text-muted-foreground">
              Doğruluk oranı
              <br />
              en az 12 kayıt
            </p>
          </div>

          <div className="mt-5 grid grid-cols-3 items-end gap-2">
            {PODIUM.map((p) => {
              const isFirst = p.rank === 1
              return (
                <article key={p.rank} className={`relative text-center ${isFirst ? '' : 'pt-7'}`}>
                  <div
                    className={`absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-center justify-center rounded-full text-xs font-extrabold text-white shadow-sm ${
                      isFirst ? 'h-8 w-8' : 'h-7 w-7'
                    }`}
                    style={{ backgroundColor: p.accent }}
                  >
                    {p.rank}
                  </div>
                  <button
                    className={`flex w-full flex-col items-center rounded-theme bg-card px-2 pb-3 shadow-sm ${
                      isFirst ? 'border-2 pb-4 pt-10' : 'border border-border pt-9'
                    }`}
                    style={isFirst ? { borderColor: p.accent } : undefined}
                  >
                    <div
                      className={`overflow-hidden rounded-full border-2 bg-muted ${isFirst ? 'h-[68px] w-[68px]' : 'h-14 w-14'}`}
                      style={{ borderColor: p.accent }}
                    >
                      <img src={IMG(p.imageId)} alt={p.name} className="h-full w-full object-cover" />
                    </div>
                    <p className={`mt-2 w-full truncate font-bold ${isFirst ? 'text-sm' : 'text-xs'}`}>{p.name}</p>
                    <p className={`mt-1 font-heading font-extrabold text-primary ${isFirst ? 'text-lg' : 'text-base'}`}>
                      {p.pct}
                    </p>
                    <TrendBadge trend={p.trend} />
                  </button>
                </article>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span>
              <strong className="font-bold text-foreground">İpek</strong> · 37 doğrulanmış tahmin
            </span>
            <span className="h-3 w-px bg-border" />
            <span>Haftalık sıralama</span>
          </div>
        </section>

        <section className="border-t border-border px-5 pb-8 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold tracking-tight">Sıralama</h2>
            <button className="flex items-center gap-1 text-xs font-semibold text-primary">
              Doğruluk oranı
              <iconify-icon icon="lucide:chevron-down" class="text-sm"></iconify-icon>
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Oran, örneklem büyüklüğüyle birlikte değerlendirilir.</p>

          <div className="mt-4 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {RANKINGS.map((r, i) => (
              <button
                key={r.rank}
                className={`flex w-full items-center gap-3 px-3 py-3.5 text-left ${
                  i < RANKINGS.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span className="w-5 text-center font-heading text-sm font-extrabold text-muted-foreground">
                  {r.rank}
                </span>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                    r.tone === 'secondary' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {r.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{r.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{r.count} doğrulanmış tahmin</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-sm font-extrabold text-primary">{r.pct}</p>
                  <TrendBadge trend={r.trend} />
                </div>
                <iconify-icon icon="lucide:chevron-right" class="text-base text-muted-foreground"></iconify-icon>
              </button>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-5 pb-5 pt-3 backdrop-blur-md">
        <button className="mx-auto flex w-full max-w-[393px] items-center gap-3 rounded-theme border border-primary bg-card px-3 py-3 text-left shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
            12
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Senin sıran</p>
            <p className="mt-0.5 text-sm font-bold">
              Arda Kılıç <span className="font-normal text-muted-foreground">· 22 kayıt</span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-heading text-base font-extrabold text-primary">%66</p>
            <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] font-semibold text-success">
              <iconify-icon icon="lucide:arrow-up" class="text-xs"></iconify-icon>2 sıra
            </p>
          </div>
          <iconify-icon icon="lucide:chevron-right" class="text-base text-muted-foreground"></iconify-icon>
        </button>
      </div>
    </div>
  )
}
