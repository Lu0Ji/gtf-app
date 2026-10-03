import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BADGES, TIERS } from '../lib/badges.js'
import BadgeMedallion from './BadgeMedallion.jsx'
import BadgeTierLabel from './BadgeTierLabel.jsx'

// Glamorous badge showcase for a profile header — Rozetler.jsx already
// guards `showcase_badges` so only a badge the owner has actually earned
// can end up in it (the star-toggle there only renders on earned badges),
// so displaying a showcased slug elsewhere just needs a catalog lookup by
// slug, not a full stats recompute for whoever's profile this is.
export default function BadgeShowcase({ slugs, totalEarned, isOwn }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const showcased = (slugs || []).map((slug) => BADGES.find((b) => b.slug === slug)).filter(Boolean)

  if (showcased.length === 0 && !isOwn) return null

  const slots = isOwn ? [...showcased, ...Array(Math.max(0, 3 - showcased.length)).fill(null)] : showcased

  return (
    <section className="mx-5 mt-5 overflow-hidden rounded-theme border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <iconify-icon icon="lucide:sparkles" class="text-base text-accent"></iconify-icon>
          <h2 className="font-heading text-sm font-extrabold tracking-tight">{t('badges.showcaseTitle')}</h2>
        </div>
        <button onClick={() => navigate('/rozetler')} className="text-[11px] font-bold text-primary">
          {totalEarned > 0 ? t('badges.earnedCountAndViewAll', { count: totalEarned }) : t('badges.viewAll')}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {slots.map((badge, i) =>
          badge ? (
            <button
              key={badge.slug}
              onClick={() => navigate('/rozetler')}
              className="flex flex-col items-center gap-1.5 rounded-theme p-2.5"
              style={{ background: TIERS.find((t) => t.key === badge.tier)?.tint }}
            >
              <BadgeMedallion icon={badge.icon} tier={TIERS.find((t) => t.key === badge.tier)} earned size="md" />
              <span
                className="line-clamp-2 text-center text-[10px] font-bold leading-tight"
                style={{ color: TIERS.find((t) => t.key === badge.tier)?.ink }}
              >
                {t(`badges.items.${badge.slug}.title`)}
              </span>
              <BadgeTierLabel tier={TIERS.find((t) => t.key === badge.tier)} />
            </button>
          ) : (
            <button
              key={`empty-${i}`}
              onClick={() => navigate('/rozetler')}
              className="flex flex-col items-center justify-center gap-1.5 rounded-theme border border-dashed border-border py-3.5 text-muted-foreground"
            >
              <iconify-icon icon="lucide:plus" class="text-lg"></iconify-icon>
              <span className="text-[9px] font-bold">{t('badges.addSlot')}</span>
            </button>
          )
        )}
      </div>
    </section>
  )
}
