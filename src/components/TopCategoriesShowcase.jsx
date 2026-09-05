import { useTranslation } from 'react-i18next'
import { CATEGORY_META } from '../lib/categories.js'

// Ring sizes for the podium arrangement (1st biggest & centered, 2nd/3rd
// smaller & flanking) — same idea as LiderlikTablosu's podium, just circles
// instead of avatars. Only kicks in once there are actually 3 categories to
// rank; with 1-2 a plain row of same-size rings reads better than an
// artificial size hierarchy that implies a comparison that doesn't exist.
const RING_SIZE = { primary: 88, secondary: 68 }
const STROKE_WIDTH = { primary: 7, secondary: 5.5 }

// A category outside the fixed catalog (a user's own custom one, see
// TahminOlustur.jsx's "Diğer" option) has no `meta.ink` — `stroke`'s own
// initial value is `none`, not inherited/currentColor, so leaving it
// unset would render an invisible progress arc, not just an uncolored
// one. Falls back to the same muted tone as the ring's own track.
const FALLBACK_INK = 'var(--color-muted-foreground)'

function CategoryRing({ category, pct, count, primary }) {
  const { t } = useTranslation()
  const meta = CATEGORY_META[category]
  const ink = meta?.ink || FALLBACK_INK
  const size = primary ? RING_SIZE.primary : RING_SIZE.secondary
  const strokeWidth = primary ? STROKE_WIDTH.primary : STROKE_WIDTH.secondary
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ stroke: ink }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <iconify-icon icon={meta?.icon || 'lucide:tag'} class={primary ? 'text-lg' : 'text-base'} style={{ color: ink }}></iconify-icon>
          <span className={`font-heading font-extrabold leading-none ${primary ? 'mt-1 text-base' : 'mt-0.5 text-sm'}`}>
            %{pct}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className={`font-bold capitalize leading-tight ${primary ? 'text-xs' : 'text-[11px] text-muted-foreground'}`}>
          {meta ? t(meta.labelKey) : category}
        </p>
        <p className="text-[10px] text-muted-foreground">{t('profile.topCategoryCount', { count })}</p>
      </div>
    </div>
  )
}

// Own or someone else's — just needs their prediction list (any status;
// "en çok tahmin yaptığı kategori" is about activity/volume, not accuracy,
// so unlike the categoryAccuracy widget above it this counts everything,
// not just resolved records). Both Profil.jsx and KullaniciProfili.jsx
// already load the full predictions array for other reasons, so this needs
// no query of its own.
export default function TopCategoriesShowcase({ predictions }) {
  const { t } = useTranslation()

  const top = (() => {
    const counts = new Map()
    for (const p of predictions) counts.set(p.category, (counts.get(p.category) || 0) + 1)
    const total = predictions.length
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  })()

  if (top.length === 0) return null

  // Podium order [2nd, 1st, 3rd] only makes sense with a real 1st/2nd/3rd —
  // with fewer categories just show them in rank order, same size.
  const ordered = top.length === 3 ? [top[1], top[0], top[2]] : top

  return (
    <section className="mx-5 mt-5 overflow-hidden rounded-theme border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <iconify-icon icon="lucide:pie-chart" class="text-base text-accent"></iconify-icon>
        <div>
          <h2 className="font-heading text-sm font-extrabold tracking-tight">{t('profile.topCategoriesTitle')}</h2>
          <p className="text-[11px] text-muted-foreground">{t('profile.topCategoriesSubtitle')}</p>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-center gap-4">
        {ordered.map((cat) => (
          <CategoryRing key={cat.category} {...cat} primary={top.length === 3 && cat.category === top[0].category} />
        ))}
      </div>
    </section>
  )
}
