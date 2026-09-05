import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fallbackAvatarFor } from '../lib/images.js'
import { fetchLeaderboard, MIN_VERIFIED_FOR_RANKING } from '../lib/leaderboard.js'
import { CATEGORY_META, CATEGORY_SLUGS } from '../lib/categories.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import DetailHeader from '../components/ui/DetailHeader.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'

const PODIUM_ACCENTS = ['#9A5C14', '#B87935', '#C18B57']
const DURATION_TABS = ['all', 'short', 'medium', 'long']
const CATEGORY_TABS = ['all', ...CATEGORY_SLUGS]

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function LiderlikTablosu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [category, setCategory] = useState('all')
  const [bucket, setBucket] = useState('all')
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchLeaderboard({
      category: category === 'all' ? null : category,
      bucket: bucket === 'all' ? null : bucket,
      limit: 100,
    }).then(({ rows }) => {
      if (!cancelled) {
        setRankings(rows)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [category, bucket])

  const podium = rankings.slice(0, 3)
  const rest = rankings.slice(3)
  const myIndex = rankings.findIndex((r) => r.authorId === user?.id)
  const me = myIndex >= 0 ? rankings[myIndex] : null

  // Reorder podium visually as [2nd, 1st, 3rd] to match the classic podium layout.
  const podiumOrdered = [podium[1], podium[0], podium[2]].filter(Boolean)

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <DetailHeader title={t('leaderboard.title')} subtitle={t('leaderboard.subtitle')} />

      <section className="mt-4">
        <div className="flex gap-2 overflow-x-auto px-5 pb-1">
          {DURATION_TABS.map((tab) => {
            const isActive = tab === bucket
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setBucket(tab)}
                className={
                  isActive
                    ? 'shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground'
                    : 'shrink-0 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-secondary-foreground'
                }
              >
                {t(`leaderboard.duration.${tab}`)}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
          {CATEGORY_TABS.map((slug) => {
            const isActive = slug === category
            const label = slug === 'all' ? t('nav.allCategories') : t(CATEGORY_META[slug].labelKey)
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setCategory(slug)}
                className={
                  isActive
                    ? 'shrink-0 rounded-full bg-secondary px-3.5 py-1.5 text-[11px] font-bold text-secondary-foreground'
                    : 'shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold text-muted-foreground'
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </section>

      <main>
        {loading ? (
          <p className="px-5 py-10 text-center text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <>
            <section className="px-5 pb-5 pt-5">
              {podiumOrdered.length === 0 ? (
                <div className="rounded-theme border border-dashed border-border bg-muted/60 p-5 text-center">
                  <p className="text-xs text-muted-foreground">{t('leaderboard.noUsersYet')}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {t('leaderboard.minSampleHint', { count: MIN_VERIFIED_FOR_RANKING })}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 items-end gap-2">
                  {podiumOrdered.map((entry) => {
                    const rank = rankings.indexOf(entry) + 1
                    const isFirst = rank === 1
                    const accent = PODIUM_ACCENTS[rank - 1]
                    return (
                      <article key={entry.authorId} className={`relative text-center ${isFirst ? '' : 'pt-7'}`}>
                        <div
                          className={`absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-center justify-center rounded-full text-xs font-extrabold text-white shadow-sm ${
                            isFirst ? 'h-8 w-8' : 'h-7 w-7'
                          }`}
                          style={{ backgroundColor: accent }}
                        >
                          {rank}
                        </div>
                        <button
                          onClick={() => navigate(`/kullanici/${entry.authorId}`)}
                          className={`flex w-full flex-col items-center rounded-theme bg-card px-2 pb-3 shadow-sm transition-transform duration-150 active:scale-[0.97] ${
                            isFirst ? 'border-2 pb-4 pt-10' : 'border border-border pt-9'
                          }`}
                          style={isFirst ? { borderColor: accent } : undefined}
                        >
                          <div
                            className={`overflow-hidden rounded-full border-2 bg-muted ${isFirst ? 'h-[68px] w-[68px]' : 'h-14 w-14'}`}
                            style={{ borderColor: accent }}
                          >
                            <img
                              src={entry.profile?.avatar_url || fallbackAvatarFor(entry.authorId)}
                              alt={entry.profile?.display_name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <p className={`mt-2 w-full truncate font-bold ${isFirst ? 'text-sm' : 'text-xs'}`}>
                            {entry.profile?.display_name}
                          </p>
                          <p className={`mt-1 font-heading font-extrabold text-primary ${isFirst ? 'text-lg' : 'text-base'}`}>
                            %{entry.accuracyPct}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {t('leaderboard.accuracyStat', { correct: entry.correct, total: entry.total })}
                          </p>
                        </button>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            {rest.length > 0 && (
              <section className="border-t border-border pb-8 pt-5">
                <SectionHeader title={t('leaderboard.rankingSectionTitle')} />

                <div className="mx-5 mt-4 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
                  {rest.map((r, i) => {
                    const rank = i + 4
                    return (
                      <button
                        key={r.authorId}
                        onClick={() => navigate(`/kullanici/${r.authorId}`)}
                        className={`flex w-full items-center gap-3 px-3 py-3.5 text-left transition-colors duration-150 active:bg-muted ${
                          i < rest.length - 1 ? 'border-b border-border' : ''
                        } ${r.authorId === user?.id ? 'bg-secondary/40' : ''}`}
                      >
                        <span className="w-6 text-center font-heading text-sm font-extrabold text-muted-foreground">
                          {rank}
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                          {r.profile?.avatar_url ? (
                            <img src={r.profile.avatar_url} alt={r.profile.display_name} className="h-full w-full object-cover" />
                          ) : (
                            initials(r.profile?.display_name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold">{r.profile?.display_name}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">@{r.profile?.username}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-heading text-sm font-extrabold text-primary">%{r.accuracyPct}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {t('leaderboard.accuracyStat', { correct: r.correct, total: r.total })}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {me && myIndex >= 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-5 pb-5 pt-3 backdrop-blur-md">
          <button
            onClick={() => navigate('/profil')}
            className="mx-auto flex w-full max-w-[393px] items-center gap-3 rounded-theme border border-primary bg-card px-3 py-3 text-left transition-transform duration-150 active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
              {myIndex + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{t('leaderboard.yourRank')}</p>
              <p className="mt-0.5 text-sm font-bold">{me.profile?.display_name}</p>
            </div>
            <p className="font-heading text-base font-extrabold text-primary">%{me.accuracyPct}</p>
          </button>
        </div>
      )}
    </div>
  )
}
