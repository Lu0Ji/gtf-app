import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase, queryWithGroupIdFallback } from '../lib/supabase.js'
import { timeAgo, formatTimeUntil } from '../lib/format.js'
import { CATEGORY_META } from '../lib/categories.js'
import { fetchLeaderboard } from '../lib/leaderboard.js'
import { addSearchHistoryEntry } from '../lib/searchHistory.js'
import DifficultyChip from '../components/DifficultyChip.jsx'
import Chip from '../components/ui/Chip.jsx'
import Card from '../components/ui/Card.jsx'
import { useUserSettings } from '../hooks/useUserSettings.js'
import ScreenHeader from '../components/ui/ScreenHeader.jsx'

const SEARCH_PAGE_SIZE = 15

// CATEGORY_META covers every real slug, but news/event rows can carry a
// category outside that set (external feeds) — meta then falls back to a
// plain { icon, label: category } object with no labelKey, so fall through
// to the raw string in that case instead of calling t(undefined).
function categoryLabel(t, meta) {
  return meta.labelKey ? t(meta.labelKey) : meta.label
}

function SearchResults({ query, navigate }) {
  const { t } = useTranslation()
  const [profiles, setProfiles] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(SEARCH_PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const [predictionsFull, setPredictionsFull] = useState(false)

  useEffect(() => {
    setLimit(SEARCH_PAGE_SIZE)
  }, [query])

  useEffect(() => {
    let cancelled = false
    if (limit === SEARCH_PAGE_SIZE) setLoading(true)
    else setLoadingMore(true)
    const handle = setTimeout(async () => {
      const term = query.trim()
      if (limit === SEARCH_PAGE_SIZE) addSearchHistoryEntry(term)
      const [{ data: blockedRows }, { data: profileRows }, { data: predictionRows }] = await Promise.all([
        supabase.rpc('blocked_user_ids'),
        supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
          .limit(limit),
        queryWithGroupIdFallback((filterGroupId) => {
          let q = supabase
            .from('predictions')
            .select('*, profiles:author_id(display_name, username, avatar_url)')
            .eq('is_private', false)
            .ilike('title', `%${term}%`)
            .order('created_at', { ascending: false })
            .limit(limit)
          if (filterGroupId) q = q.is('group_id', null)
          return q
        }),
      ])
      if (cancelled) return
      const blockedSet = new Set((blockedRows || []).map((row) => row.blocked_user_ids ?? row))
      setProfiles((profileRows || []).filter((p) => !blockedSet.has(p.id)))
      const filteredPredictions = (predictionRows || []).filter((p) => !blockedSet.has(p.author_id))
      setPredictions(filteredPredictions)
      setPredictionsFull((predictionRows || []).length === limit)
      setLoading(false)
      setLoadingMore(false)
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query, limit])

  if (loading) {
    return <p className="px-5 text-xs text-muted-foreground">{t('discover.searching')}</p>
  }

  if (profiles.length === 0 && predictions.length === 0) {
    return (
      <p className="mx-5 rounded-theme border border-dashed border-border bg-muted/60 p-4 text-center text-xs text-muted-foreground">
        {t('discover.noResults', { query })}
      </p>
    )
  }

  return (
    <div>
      {profiles.length > 0 && (
        <section className="mb-6">
          <h2 className="px-5 font-heading text-sm font-bold tracking-tight">{t('discover.usersHeading')}</h2>
          <div className="mt-3 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {profiles.map((p, i) => (
              <button
                key={p.id}
                onClick={() => navigate(`/kullanici/${p.id}`)}
                className={`flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 active:bg-muted ${i < profiles.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                  <img src={p.avatar_url || fallbackAvatarFor(p.id)} alt={p.display_name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.display_name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">@{p.username}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {predictions.length > 0 && (
        <section className="mb-6">
          <h2 className="px-5 font-heading text-sm font-bold tracking-tight">{t('discover.predictionsHeading')}</h2>
          <div className="mt-3 space-y-3 px-5">
            {predictions.map((p) => {
              const meta = CATEGORY_META[p.category] || { icon: 'lucide:tag', label: p.category }
              return (
                <button
                  key={p.id}
                  onClick={() => navigate('/tahmin-kaydi', { state: { prediction: p } })}
                  className="block w-full rounded-theme border border-border bg-card p-4 text-left shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Chip>{categoryLabel(t, meta).toUpperCase()}</Chip>
                      <DifficultyChip tier={p.difficulty_tier} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold leading-5">{p.title}</h3>
                  <p className="mt-2 text-[11px] text-muted-foreground">{p.profiles?.display_name || t('common.unknownUser')}</p>
                </button>
              )
            })}
          </div>
          {predictionsFull && (
            <button
              onClick={() => setLimit((l) => l + SEARCH_PAGE_SIZE)}
              disabled={loadingMore}
              className="mx-5 mt-3 flex h-10 w-[calc(100%-40px)] items-center justify-center rounded-theme border border-border bg-card text-xs font-bold text-foreground shadow-sm disabled:opacity-60"
            >
              {loadingMore ? t('common.loading') : t('discover.loadMore')}
            </button>
          )}
        </section>
      )}
    </div>
  )
}


function CategoryTile({ category, count, variant, navigate }) {
  const { t } = useTranslation()
  const meta = CATEGORY_META[category] || { icon: 'lucide:tag', label: category }
  const variantClass =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'border border-border bg-card text-card-foreground shadow-sm'

  return (
    <button
      // Anasayfa's category tabs are keyed by DB slug (see categories.js's
      // CATEGORY_SLUGS), not the Turkish display label — passing the slug
      // here is what makes this land on the right tab regardless of the
      // viewer's language.
      onClick={() => navigate('/', { state: { category } })}
      className={`rounded-theme p-4 text-left ${variantClass}`}
    >
      <div className="flex items-start justify-between">
        {variant === 'primary' ? (
          <iconify-icon icon={meta.icon} class="text-xl"></iconify-icon>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
            <iconify-icon icon={meta.icon} class="text-lg"></iconify-icon>
          </span>
        )}
      </div>
      <p className={`font-heading text-base font-bold ${variant === 'primary' ? 'mt-7' : 'mt-5'}`}>{categoryLabel(t, meta)}</p>
      <p className={`mt-1 text-[11px] ${variant === 'primary' ? 'text-white/70' : 'text-muted-foreground'}`}>
        {t('groups.predictionCountInline', { count })}
      </p>
    </button>
  )
}

export default function Kesfet() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { settings } = useUserSettings()
  // Arama geçmişinden bir sorguya tekrar dokununca buraya prefilled gelir.
  const [query, setQuery] = useState(() => location.state?.query || '')
  const [categoryCounts, setCategoryCounts] = useState([])
  const [topRanked, setTopRanked] = useState([])
  const [recentPredictions, setRecentPredictions] = useState([])
  const [trending, setTrending] = useState([])
  const [openingSoon, setOpeningSoon] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [newsHeadlines, setNewsHeadlines] = useState([])
  const [loading, setLoading] = useState(true)

  // Fire-and-forget: each function checks whether its own cache is
  // actually stale before calling out (football-data.org / Hürriyet's RSS),
  // so it's cheap to just ask on every visit rather than wiring up a real
  // cron job (see supabase/schema.sql's notes on why there isn't one). Not
  // awaited — the screen renders off whatever's already in
  // real_world_events, and picks up anything newer on the next visit/reload.
  useEffect(() => {
    supabase.functions.invoke('fetch-sports-fixtures').then(
      () => {},
      () => {}
    )
    supabase.functions.invoke('fetch-news-headlines').then(
      () => {},
      () => {}
    )
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      const [predictionsRes, leaderboardRes, openingSoonRes, eventsRes, newsRes] = await Promise.all([
        queryWithGroupIdFallback((filterGroupId) => {
          let q = supabase
            .from('predictions')
            .select('*, profiles:author_id(display_name, username, avatar_url)')
            .eq('is_private', false)
            .order('created_at', { ascending: false })
            .limit(30)
          if (filterGroupId) q = q.is('group_id', null)
          return q
        }),
        fetchLeaderboard({ limit: 3 }),
        queryWithGroupIdFallback((filterGroupId) => {
          let q = supabase
            .from('predictions')
            .select('id, title, category, event_date')
            .eq('is_private', false)
            .eq('status', 'sealed')
            .gte('event_date', new Date().toISOString())
            .lte('event_date', in48h)
            .order('event_date', { ascending: true })
            .limit(5)
          if (filterGroupId) q = q.is('group_id', null)
          return q
        }),
        // real_world_events may not exist yet (see supabase/schema.sql) —
        // the section just quietly doesn't render until the migration and
        // Edge Function are both deployed.
        supabase
          .from('real_world_events')
          .select('*')
          .eq('kind', 'sports')
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(20),
        // News rows use event_date as publish time, not a future point —
        // see the GÜNDEM comment in supabase/schema.sql — so this is a
        // plain "most recent first" query, no gte() cutoff.
        supabase
          .from('real_world_events')
          .select('*')
          .eq('kind', 'news')
          .order('event_date', { ascending: false })
          .limit(20),
      ])

      if (cancelled) return

      const counts = new Map()
      for (const p of predictionsRes.data || []) {
        counts.set(p.category, (counts.get(p.category) || 0) + 1)
      }
      const countsArr = Array.from(counts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)

      // "Trend": most-liked among recently posted public predictions. No
      // aggregate query needed — tally the likes for this same batch
      // client-side, same pattern as the category counts above.
      const recentIds = (predictionsRes.data || []).map((p) => p.id)
      const { data: likeRows } =
        recentIds.length > 0
          ? await supabase.from('prediction_likes').select('prediction_id').in('prediction_id', recentIds)
          : { data: [] }
      if (cancelled) return
      const likeCounts = new Map()
      for (const row of likeRows || []) {
        likeCounts.set(row.prediction_id, (likeCounts.get(row.prediction_id) || 0) + 1)
      }
      const trendingList = (predictionsRes.data || [])
        .map((p) => ({ prediction: p, likeCount: likeCounts.get(p.id) || 0 }))
        .filter((p) => p.likeCount > 0)
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, 5)

      setCategoryCounts(countsArr)
      setTopRanked(leaderboardRes.rows || [])
      setRecentPredictions((predictionsRes.data || []).slice(0, 6))
      setTrending(trendingList)
      setOpeningSoon(openingSoonRes.data || [])

      // Personalized: an event in a category you've marked as an interest
      // (Uygulama Ayarları) sorts first; soonest-first within each group.
      // Not a filter — with only football fixtures live so far, hiding
      // "spor" for anyone who hasn't picked it as an interest would leave
      // this empty for most people instead of just deprioritized.
      const interests = new Set((settings.content.interests || []).map((i) => i.toLowerCase()))
      const events = eventsRes.error ? [] : eventsRes.data || []
      const rankedEvents = [...events].sort((a, b) => {
        const aMatch = interests.has(a.category) ? 0 : 1
        const bMatch = interests.has(b.category) ? 0 : 1
        if (aMatch !== bMatch) return aMatch - bMatch
        return new Date(a.event_date) - new Date(b.event_date)
      })
      setUpcomingEvents(rankedEvents)

      // News gets an actual filter, not just a re-sort like events above —
      // user feedback (2026-09-10): seeing categories you never picked as
      // an interest, over and over, wears on people more for a fast-moving
      // feed like news than it does for the sparser events list. Safe to
      // filter here specifically because news is no longer thin: 3 sources
      // now (see fetch-news-headlines) means every real interest has
      // enough volume to not go empty. Still falls back to the unfiltered
      // list if the filter WOULD be empty (an interest with no fresh items
      // right now, or no interests picked at all) — an empty section reads
      // as broken, a slightly-off-topic one doesn't.
      const news = newsRes.error ? [] : newsRes.data || []
      const interestedNews = interests.size > 0 ? news.filter((n) => interests.has(n.category)) : []
      const rankedNews = [...(interestedNews.length > 0 ? interestedNews : news)].sort(
        (a, b) => new Date(b.event_date) - new Date(a.event_date)
      )
      setNewsHeadlines(rankedNews)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
    // settings.content.interests only affects client-side re-sorting, not
    // what's fetched — omitted so changing it elsewhere doesn't re-run the
    // whole page's data load, just the next natural visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <ScreenHeader eyebrow={t('nav.discover')} title={t('discover.title')} className="pb-0" />
      <div className="px-5 pb-5 pt-4">
        <div className="flex items-center gap-2 rounded-theme border border-border bg-card px-4 py-3 shadow-sm">
          <iconify-icon icon="lucide:search" class="text-lg text-muted-foreground"></iconify-icon>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('discover.searchPlaceholder')}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button aria-label={t('discover.clearSearchAria')} onClick={() => setQuery('')} className="text-muted-foreground">
              <iconify-icon icon="lucide:x" class="text-lg"></iconify-icon>
            </button>
          )}
        </div>
      </div>

      <main>
        {query.trim() ? (
          <SearchResults query={query.trim()} navigate={navigate} />
        ) : loading ? (
          <p className="px-5 text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <>
            {upcomingEvents.length > 0 && (
              <section className="mb-8">
                <div className="px-5">
                  <h2 className="flex items-center gap-1.5 font-heading text-lg font-bold tracking-tight">
                    <iconify-icon icon="lucide:radar" class="text-accent"></iconify-icon>
                    {t('discover.upcomingEventsHeading')}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('discover.upcomingEventsSubtitle')}
                  </p>
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
                  {upcomingEvents.map((ev) => {
                    const meta = CATEGORY_META[ev.category] || { icon: 'lucide:tag', label: ev.category }
                    return (
                      <div
                        key={ev.id}
                        className="min-w-[220px] max-w-[220px] rounded-theme border border-border bg-card p-3.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-primary">
                            <iconify-icon icon={meta.icon} class="text-xs"></iconify-icon>
                            {categoryLabel(t, meta)}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-accent">
                            <iconify-icon icon="lucide:hourglass" class="text-xs"></iconify-icon>
                            {formatTimeUntil(ev.event_date)}
                          </span>
                        </div>
                        {ev.subtitle && (
                          <p className="mt-2 truncate text-[10px] font-semibold text-muted-foreground">
                            {ev.subtitle}
                          </p>
                        )}
                        <p className="mt-1 text-sm font-bold leading-5">{ev.title}</p>
                        <button
                          onClick={() =>
                            navigate('/tahmin-olustur', {
                              state: {
                                prefill: {
                                  title: ev.title,
                                  category: ev.category,
                                  eventDate: ev.event_date,
                                },
                              },
                            })
                          }
                          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-theme bg-primary py-2 text-[11px] font-bold text-primary-foreground"
                        >
                          <iconify-icon icon="lucide:pen-line" class="text-xs"></iconify-icon>
                          {t('nav.createPrediction')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {newsHeadlines.length > 0 && (
              <section className="mb-8">
                <div className="px-5">
                  <h2 className="flex items-center gap-1.5 font-heading text-lg font-bold tracking-tight">
                    <iconify-icon icon="lucide:newspaper" class="text-accent"></iconify-icon>
                    {t('discover.newsHeading')}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('discover.newsSubtitle')}
                  </p>
                </div>
                <div className="mt-3 space-y-2.5 px-5">
                  {newsHeadlines.slice(0, 8).map((item) => {
                    const meta = CATEGORY_META[item.category] || { icon: 'lucide:tag', label: item.category }
                    return (
                      <div
                        key={item.id}
                        className="rounded-theme border border-border bg-card p-3.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-primary">
                            <iconify-icon icon={meta.icon} class="text-xs"></iconify-icon>
                            {categoryLabel(t, meta)}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(item.event_date)}</span>
                        </div>
                        <a
                          href={item.metadata?.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block text-sm font-bold leading-5 text-foreground"
                        >
                          {item.title}
                        </a>
                        <button
                          onClick={() =>
                            navigate('/tahmin-olustur', {
                              state: { prefill: { title: item.title, category: item.category } },
                            })
                          }
                          className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-primary"
                        >
                          <iconify-icon icon="lucide:pen-line" class="text-xs"></iconify-icon>
                          {t('discover.createPredictionAboutThisCta')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {openingSoon.length > 0 && (
              <section className="mb-8">
                <div className="px-5">
                  <h2 className="font-heading text-lg font-bold tracking-tight">{t('discover.openingSoonHeading')}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('discover.openingSoonSubtitle')}</p>
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
                  {openingSoon.map((p) => {
                    const meta = CATEGORY_META[p.category] || { icon: 'lucide:tag', label: p.category }
                    return (
                      <div
                        key={p.id}
                        className="min-w-[190px] rounded-theme border border-border bg-card p-3.5 shadow-sm"
                      >
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent">
                          <iconify-icon icon="lucide:hourglass" class="text-xs"></iconify-icon>
                          {formatTimeUntil(p.event_date)}
                        </div>
                        <p className="mt-2 text-sm font-bold leading-5">{p.title}</p>
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-primary">
                          <iconify-icon icon={meta.icon} class="text-xs"></iconify-icon>
                          {categoryLabel(t, meta)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {trending.length > 0 && (
              <section className="mb-8">
                <div className="px-5">
                  <h2 className="flex items-center gap-1.5 font-heading text-lg font-bold tracking-tight">
                    <iconify-icon icon="lucide:flame" class="text-accent"></iconify-icon>
                    {t('discover.trendingHeading')}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('discover.trendingSubtitle')}</p>
                </div>
                <div className="mt-3 space-y-2.5 px-5">
                  {trending.map(({ prediction, likeCount }) => (
                    <button
                      key={prediction.id}
                      onClick={() => navigate('/tahmin-kaydi', { state: { prediction } })}
                      className="flex w-full items-center gap-3 rounded-theme border border-border bg-card p-3.5 text-left shadow-sm"
                    >
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                        <img
                          src={prediction.profiles?.avatar_url || fallbackAvatarFor(prediction.author_id)}
                          alt={prediction.profiles?.display_name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm font-bold">{prediction.title}</p>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-destructive">
                        <iconify-icon icon="lucide:heart" class="text-sm"></iconify-icon>
                        {likeCount}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-8">
              <div className="flex items-center justify-between px-5">
                <div>
                  <h2 className="font-heading text-lg font-bold tracking-tight">{t('discover.popularCategoriesHeading')}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('discover.popularCategoriesSubtitle')}</p>
                </div>
              </div>

              {categoryCounts.length === 0 ? (
                <p className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-4 text-center text-xs text-muted-foreground">
                  {t('discover.noCategorizedPredictions')}
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 px-5">
                  {categoryCounts.map((c, i) => (
                    <CategoryTile
                      key={c.category}
                      category={c.category}
                      count={c.count}
                      variant={i === 0 ? 'primary' : 'card'}
                      navigate={navigate}
                    />
                  ))}
                </div>
              )}
            </section>

            <Card as="section" className="mx-5 mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                      <iconify-icon icon="lucide:medal" class="text-lg"></iconify-icon>
                    </span>
                    <h2 className="font-heading text-lg font-bold tracking-tight">{t('leaderboard.title')}</h2>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{t('discover.leaderboardTop3Subtitle')}</p>
                </div>
                <button
                  aria-label={t('discover.leaderboardOpenAria')}
                  onClick={() => navigate('/liderlik-tablosu')}
                  className="rounded-full bg-muted p-2 text-primary"
                >
                  <iconify-icon icon="lucide:arrow-up-right" class="text-base"></iconify-icon>
                </button>
              </div>

              {topRanked.length === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">{t('discover.noOneYet')}</p>
              ) : (
                <div className="mt-4 divide-y divide-border">
                  {topRanked.map((entry, i) => (
                    <button
                      key={entry.authorId}
                      onClick={() => navigate(`/kullanici/${entry.authorId}`)}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span className={`w-5 font-heading text-sm font-extrabold ${i === 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <div className="h-9 w-9 overflow-hidden rounded-full bg-muted">
                        <img src={entry.profile?.avatar_url || fallbackAvatarFor(entry.authorId)} alt={entry.profile?.display_name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{entry.profile?.display_name}</p>
                      </div>
                      <span className="font-heading text-sm font-extrabold text-primary">%{entry.accuracyPct}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <section className="mb-5">
              <div className="flex items-end justify-between px-5">
                <div>
                  <h2 className="font-heading text-lg font-bold tracking-tight">{t('discover.recentHeading')}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('discover.recentSubtitle')}</p>
                </div>
              </div>

              {recentPredictions.length === 0 ? (
                <p className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-4 text-center text-xs text-muted-foreground">
                  {t('discover.noRecordsYet')}
                </p>
              ) : (
                <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
                  {recentPredictions.map((p) => {
                    const meta = CATEGORY_META[p.category] || { icon: 'lucide:tag', label: p.category }
                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate('/tahmin-kaydi', { state: { prediction: p } })}
                        className="min-w-[240px] rounded-theme border border-border bg-card p-4 text-left shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Chip>{categoryLabel(t, meta).toUpperCase()}</Chip>
                            <DifficultyChip tier={p.difficulty_tier} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</span>
                        </div>
                        <h3 className="mt-3 font-heading text-sm font-bold leading-5">{p.title}</h3>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {p.profiles?.display_name || t('common.unknownUser')}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
