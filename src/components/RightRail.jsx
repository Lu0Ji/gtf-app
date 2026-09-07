import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase, queryWithGroupIdFallback } from '../lib/supabase.js'
import { fallbackAvatarFor } from '../lib/images.js'
import { formatTimeUntil } from '../lib/format.js'
import { CATEGORY_META } from '../lib/categories.js'
import { fetchLeaderboard } from '../lib/leaderboard.js'
import { fetchPeopleSuggestions } from '../lib/peopleSuggestions.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

// xl+ only (1280px) — a sidebar + a single ~600px column already fills a
// laptop-width window reasonably; this is what fills a genuinely wide
// desktop instead of leaving the whole right half of the screen blank.
// Content mirrors what Keşfet/Liderlik Tablosu already compute, just the
// top few of each as a standing widget, not a full duplicate screen. The
// suggested-people widget specifically takes over from Anasayfa's own
// "Sana önerilen kişiler" (hidden at this breakpoint, see Anasayfa.jsx) —
// same idea, but a standing rail widget beats something buried below a
// 15-card feed someone has to scroll past to ever see.
export default function RightRail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [topRanked, setTopRanked] = useState([])
  const [openingSoon, setOpeningSoon] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      const [rankedRes, openingRes, peopleRes] = await Promise.all([
        fetchLeaderboard({ limit: 3 }),
        queryWithGroupIdFallback((filterGroupId) => {
          let q = supabase
            .from('predictions')
            .select('id, title, category, event_date')
            .eq('is_private', false)
            .eq('status', 'sealed')
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true })
            .limit(4)
          if (filterGroupId) q = q.is('group_id', null)
          return q
        }),
        fetchPeopleSuggestions(user.id, { limit: 3 }),
      ])
      if (cancelled) return

      setTopRanked(rankedRes.rows || [])
      setOpeningSoon(openingRes.data || [])
      setPeople(peopleRes)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  async function handleFollow(personId) {
    const removed = people.find((p) => p.id === personId)
    setPeople((prev) => prev.filter((p) => p.id !== personId))
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: personId })
    if (error) {
      setPeople((prev) => (removed ? [...prev, removed] : prev))
      showToast(t('home.followFailedToast'))
    }
  }

  if (loading) return <aside className="sticky top-6 hidden min-w-[300px] max-w-[420px] flex-1 xl:block" />

  return (
    <aside className="sticky top-6 hidden max-h-[calc(100vh-3rem)] min-w-[300px] max-w-[420px] flex-1 flex-col gap-6 overflow-y-auto xl:flex">
      {openingSoon.length > 0 && (
        <section className="rounded-theme border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:hourglass" class="text-base"></iconify-icon>
            </span>
            <h2 className="text-base font-bold tracking-[-0.04em] text-foreground">{t('home.upcomingOpenings')}</h2>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {openingSoon.map((p) => {
              const meta = CATEGORY_META[p.category]
              return (
                <button
                  key={p.id}
                  onClick={() => navigate('/tahmin-kaydi', { state: { prediction: p } })}
                  className="shine-none cursor-pointer rounded-theme text-left transition-colors duration-150 active:bg-muted"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-accent">
                    <iconify-icon icon="lucide:hourglass" class="text-xs"></iconify-icon>
                    {formatTimeUntil(p.event_date)}
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold leading-5 text-foreground">{p.title}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-primary">
                    <iconify-icon icon={meta?.icon || 'lucide:tag'} class="text-[10px]"></iconify-icon>
                    {meta ? t(meta.labelKey) : p.category}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {people.length > 0 && (
        <section className="rounded-theme border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:user-plus" class="text-base"></iconify-icon>
            </span>
            <div>
              <h2 className="text-base font-bold tracking-[-0.04em] text-foreground">{t('home.suggestedPeople')}</h2>
              <p className="text-[11px] text-muted-foreground">{t('home.suggestedPeopleSubtitle')}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            {people.map((person) => (
              <div key={person.id} className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/kullanici/${person.id}`)}
                  className="shine-none flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                    <img
                      src={person.avatar_url || fallbackAvatarFor(person.id)}
                      alt={person.display_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-left">
                    <span className="block truncate text-sm font-semibold text-foreground">{person.display_name}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {person.mutualCount > 0 ? t('home.mutualFollowsCount', { count: person.mutualCount }) : t('home.newOnGtf')}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => handleFollow(person.id)}
                  className="shrink-0 rounded-theme bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground transition-transform duration-150 active:scale-95"
                >
                  {t('home.followAction')}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {topRanked.length > 0 && (
        <section className="rounded-theme border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-primary">
                <iconify-icon icon="lucide:medal" class="text-base"></iconify-icon>
              </span>
              <h2 className="text-base font-bold tracking-[-0.04em] text-foreground">{t('home.leaderboard')}</h2>
            </div>
            <button onClick={() => navigate('/liderlik-tablosu')} className="shine-none cursor-pointer text-xs font-bold text-primary">
              {t('home.leaderboardSeeAll')}
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            {topRanked.map((entry, i) => (
              <button
                key={entry.authorId}
                onClick={() => navigate(`/kullanici/${entry.authorId}`)}
                className="shine-none flex w-full cursor-pointer items-center gap-3 rounded-theme text-left transition-colors duration-150 active:bg-muted"
              >
                <span className={`w-5 shrink-0 font-heading text-sm font-extrabold ${i === 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                  {i + 1}
                </span>
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                  <img
                    src={entry.profile?.avatar_url || fallbackAvatarFor(entry.authorId)}
                    alt={entry.profile?.display_name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {entry.profile?.display_name}
                </span>
                <span className="shrink-0 text-xs font-bold text-muted-foreground">%{entry.accuracyPct}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  )
}
