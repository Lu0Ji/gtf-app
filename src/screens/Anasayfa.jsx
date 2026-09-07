import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase, queryWithGroupIdFallback } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useUserSettings } from '../hooks/useUserSettings.js'
import { formatDateLong, sealLabel, timeAgo } from '../lib/format.js'
import { CATEGORY_META, CATEGORY_SLUGS } from '../lib/categories.js'
import DifficultyChip from '../components/DifficultyChip.jsx'
import Chip from '../components/ui/Chip.jsx'
import Card from '../components/ui/Card.jsx'
import StreakFlame from '../components/StreakFlame.jsx'
import { rankFeed } from '../lib/feedRanking.js'
import { fetchPeopleSuggestions } from '../lib/peopleSuggestions.js'

// 'all' is a UI-only sentinel (never stored/queried) — every real entry is
// a stable DB slug (see categories.js), translated for display via
// CATEGORY_META[slug].labelKey. Keeping state in slugs, not display labels,
// is what lets the tab bar and the DB filter below stay correct in every
// language at once.
const CATEGORY_TABS = ['all', ...CATEGORY_SLUGS]

function Header() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  return (
    <header className="px-5 pt-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-theme bg-primary font-heading text-sm font-extrabold tracking-[-0.08em] text-primary-foreground">
            GTF
          </div>
          <div>
            <p className="font-heading text-[21px] font-extrabold leading-none tracking-[-0.06em] text-primary">
              Guess the Future
            </p>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">
              {t('home.publicFeed')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile?.streak_count > 1 && (
            <span
              className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1.5 text-xs font-bold text-accent"
              title={t('home.streakTitleAttr', { count: profile.streak_count })}
            >
              <StreakFlame count={profile.streak_count} size="sm" />
              {profile.streak_count}
            </span>
          )}
          <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-card shadow-sm">
            <img src={profile?.avatar_url || fallbackAvatarFor(profile?.id)} alt="Profilin" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  )
}

function ComposeCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()

  return (
    <Card as="section" className="mx-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
          <img src={profile?.avatar_url || fallbackAvatarFor(profile?.id)} alt="Profilin" className="h-full w-full object-cover" />
        </div>
        <button
          onClick={() => navigate('/tahmin-olustur')}
          className="flex h-11 flex-1 items-center rounded-theme bg-muted px-4 text-left text-sm text-muted-foreground"
        >
          {t('home.composePlaceholder')}
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/tahmin-olustur')}
            className="flex items-center gap-1.5 rounded-theme bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"
          >
            <iconify-icon icon="lucide:pen-line" class="text-sm text-primary"></iconify-icon>
            {t('home.tabPrediction')}
          </button>
          <button
            onClick={() => navigate('/tahmin-olustur')}
            className="flex items-center gap-1.5 rounded-theme bg-muted px-3 py-2 text-xs font-bold text-muted-foreground"
          >
            <iconify-icon icon="lucide:archive" class="text-sm"></iconify-icon>
            {t('home.tabCapsule')}
          </button>
        </div>
        <button
          aria-label={t('home.newPredictionAria')}
          onClick={() => navigate('/tahmin-olustur')}
          className="flex h-9 w-9 items-center justify-center rounded-theme bg-primary text-primary-foreground"
        >
          <iconify-icon icon="lucide:plus" class="text-lg"></iconify-icon>
        </button>
      </div>
    </Card>
  )
}

// Personal hook: your own sealed predictions whose reveal date has arrived
// are the one thing only you can act on right now, so surface them above
// everything else instead of leaving them to be found on your profile.
function OpeningTodayBanner() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('predictions')
      .select('id, title, sealed_content, category, status, event_date, author_id')
      .eq('author_id', user.id)
      .eq('status', 'sealed')
      .lte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setPending(data || [])
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (pending.length === 0) return null

  return (
    <button
      onClick={() => navigate('/tahmin-kaydi', { state: { prediction: pending[0] } })}
      className="mx-5 mt-4 flex w-[calc(100%-40px)] items-center gap-3 rounded-theme border-2 border-accent bg-accent/10 p-4 text-left shadow-sm"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-accent text-accent-foreground">
        <iconify-icon icon="lucide:stamp" class="text-lg"></iconify-icon>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{t('home.sealReady', { count: pending.length })}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {t('home.sealReadyBody', { title: pending[0].title })}
        </p>
      </div>
      <iconify-icon icon="lucide:chevron-right" class="shrink-0 text-lg text-muted-foreground"></iconify-icon>
    </button>
  )
}

function CategoryTabs({ active, onSelect }) {
  const { t } = useTranslation()
  return (
    <section className="mt-5">
      <div className="flex gap-2 overflow-x-auto px-5 pb-1">
        {CATEGORY_TABS.map((slug) => {
          const isActive = slug === active
          const label = slug === 'all' ? t('nav.allCategories') : t(CATEGORY_META[slug].labelKey)
          return (
            <button
              key={slug}
              type="button"
              onClick={() => onSelect(slug)}
              className={
                isActive
                  ? 'shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground'
                  : 'shrink-0 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-secondary-foreground'
              }
            >
              {label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function StatsBanner() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ count: sealedCount }, { count: verifiedCount }] = await Promise.all([
        queryWithGroupIdFallback((filterGroupId) => {
          let q = supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('is_private', false).eq('status', 'sealed')
          if (filterGroupId) q = q.is('group_id', null)
          return q
        }),
        queryWithGroupIdFallback((filterGroupId) => {
          let q = supabase
            .from('predictions')
            .select('*', { count: 'exact', head: true })
            .eq('is_private', false)
            .in('status', ['verified_correct', 'verified_incorrect'])
          if (filterGroupId) q = q.is('group_id', null)
          return q
        }),
      ])
      if (!cancelled) setStats({ sealed: sealedCount || 0, verified: verifiedCount || 0 })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!stats || (stats.sealed === 0 && stats.verified === 0)) return null

  return (
    <Card as="section" className="mx-5 mt-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
          <iconify-icon icon="lucide:activity" class="text-lg"></iconify-icon>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground">{t('home.platformNow')}</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            <Trans
              i18nKey="home.platformStats"
              values={{ sealed: stats.sealed, verified: stats.verified }}
              components={{ b: <span className="font-semibold text-foreground" /> }}
            />
          </p>
        </div>
      </div>
    </Card>
  )
}

function PredictionCard({ prediction, social, onToggleLike, onToggleSave }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const author = prediction.profiles
  const categoryMeta = CATEGORY_META[prediction.category]
  const isVerified = prediction.status === 'verified_correct' || prediction.status === 'verified_incorrect'
  const isCorrect = prediction.status === 'verified_correct'
  const { liked, likeCount, saved, commentCount } = social

  return (
    <Card
      as="article"
      onClick={() => navigate('/tahmin-kaydi', { state: { prediction } })}
      className="mx-5 mt-4 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/kullanici/${prediction.author_id}`)
          }}
          className="shine-none h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full"
        >
          <img
            src={author?.avatar_url || fallbackAvatarFor(prediction.author_id)}
            alt={author?.display_name || t('common.unknownUser')}
            className="h-full w-full object-cover"
          />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/kullanici/${prediction.author_id}`)
              }}
              className="shine-none cursor-pointer text-left"
            >
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold">{author?.display_name || t('common.unknownUser')}</h2>
                <iconify-icon icon="lucide:badge-check" class="text-sm text-primary"></iconify-icon>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                @{author?.username || t('common.unknownUsername')} · {timeAgo(prediction.created_at)}
              </p>
            </button>
          </div>
          {prediction.is_sensitive && (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive">
              <iconify-icon icon="lucide:triangle-alert" class="text-xs"></iconify-icon>
              {t('home.sensitiveTag')}
            </span>
          )}
          <p className="mt-3 text-[15px] font-medium leading-6 text-foreground">{prediction.title}</p>

          {prediction.media_url && (
            <div className="mt-3 overflow-hidden rounded-theme border border-border bg-muted">
              {prediction.media_type === 'video' ? (
                <video src={prediction.media_url} controls className="max-h-72 w-full object-cover" />
              ) : (
                <img src={prediction.media_url} alt="" className="max-h-72 w-full object-cover" />
              )}
            </div>
          )}

          {isVerified ? (
            <div className="mt-3 overflow-hidden rounded-theme border border-border">
              <div
                className={`flex items-center justify-between px-3 py-2 text-[11px] font-bold ${
                  isCorrect ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <iconify-icon icon={isCorrect ? 'lucide:badge-check' : 'lucide:x-circle'} class="text-sm"></iconify-icon>
                  {isCorrect ? t('home.verified') : t('home.notRealized')}
                </span>
                <span>{formatDateLong(prediction.verified_at)}</span>
              </div>
              <div className="bg-muted p-3">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-bold text-primary">
                    {categoryMeta ? t(categoryMeta.labelKey).toUpperCase() : prediction.category?.toUpperCase()}
                  </span>
                  <DifficultyChip tier={prediction.difficulty_tier} />
                </div>
                <p className="mt-3 text-sm font-bold leading-5">&ldquo;{prediction.sealed_content}&rdquo;</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-theme border border-border bg-muted p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-bold text-primary">
                    {categoryMeta ? t(categoryMeta.labelKey).toUpperCase() : prediction.category?.toUpperCase()}
                  </span>
                  <DifficultyChip tier={prediction.difficulty_tier} />
                </div>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
                  <iconify-icon icon="lucide:stamp" class="text-xs"></iconify-icon>
                  {t('home.sealedPrediction')}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-primary">
                  <iconify-icon icon="lucide:calendar-days" class="text-base"></iconify-icon>
                </div>
                <div>
                  <p className="text-xs font-bold">{sealLabel(prediction.event_date)}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{t('home.sealedFixedHint')}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-muted-foreground">
              <button
                aria-label={t('home.likeAria')}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleLike(prediction.id)
                }}
                className={`flex items-center gap-1.5 text-xs font-semibold ${liked ? 'text-destructive' : ''}`}
              >
                <iconify-icon icon="lucide:heart" class="text-[18px]"></iconify-icon>
                {likeCount}
              </button>
              <button
                aria-label={t('home.commentAria')}
                onClick={(e) => {
                  e.stopPropagation()
                  navigate('/tahmin-kaydi', { state: { prediction } })
                }}
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <iconify-icon icon="lucide:message-circle" class="text-[18px]"></iconify-icon>
                {commentCount}
              </button>
            </div>
            <button
              aria-label={t('home.saveAria')}
              onClick={(e) => {
                e.stopPropagation()
                onToggleSave(prediction.id)
              }}
              className={saved ? 'text-primary' : 'text-muted-foreground'}
            >
              <iconify-icon icon={saved ? 'lucide:bookmark-check' : 'lucide:bookmark'} class="text-[18px]"></iconify-icon>
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}

const EMPTY_SOCIAL = { liked: false, likeCount: 0, saved: false, commentCount: 0 }
const FEED_PAGE_SIZE = 15

function PredictionFeed({ category }) {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const { settings } = useUserSettings()
  const [predictions, setPredictions] = useState([])
  const [socialById, setSocialById] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [followingIds, setFollowingIds] = useState(new Set())

  // Who the viewer follows, for the ranking follow-boost — fetched once per
  // signed-in user, independent of category/page.
  useEffect(() => {
    let cancelled = false
    if (!user) {
      setFollowingIds(new Set())
      return
    }
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('status', 'accepted')
      .then(({ data }) => {
        if (!cancelled) setFollowingIds(new Set((data || []).map((row) => row.following_id)))
      })
    return () => {
      cancelled = true
    }
  }, [user])

  async function loadSocial(ids) {
    if (ids.length === 0) return {}
    const [{ data: likes }, { data: comments }, { data: saves }] = await Promise.all([
      supabase.from('prediction_likes').select('prediction_id, user_id').in('prediction_id', ids),
      supabase.from('prediction_comments').select('prediction_id').in('prediction_id', ids),
      user
        ? supabase.from('prediction_saves').select('prediction_id').eq('user_id', user.id).in('prediction_id', ids)
        : Promise.resolve({ data: [] }),
    ])
    const savedIds = new Set((saves || []).map((s) => s.prediction_id))
    const map = {}
    for (const id of ids) {
      const idLikes = (likes || []).filter((l) => l.prediction_id === id)
      map[id] = {
        liked: user ? idLikes.some((l) => l.user_id === user.id) : false,
        likeCount: idLikes.length,
        saved: savedIds.has(id),
        commentCount: (comments || []).filter((c) => c.prediction_id === id).length,
      }
    }
    return map
  }

  // Fetches one page of raw rows plus the viewer's block list, applies the
  // block/mute/sensitivity filters, and reports whether the *unfiltered*
  // page came back full — that's the real signal for "more rows might
  // exist server-side", since a filtered page can come back short even
  // when there's more to load.
  async function fetchPage(pageIndex) {
    const from = pageIndex * FEED_PAGE_SIZE
    const to = from + FEED_PAGE_SIZE - 1
    const [{ data, error }, { data: blockedRows }] = await Promise.all([
      queryWithGroupIdFallback((filterGroupId) => {
        let q = supabase
          .from('predictions')
          .select('*, profiles:author_id(display_name, username, avatar_url)')
          .eq('is_private', false)
          .order('created_at', { ascending: false })
          .range(from, to)
        if (filterGroupId) q = q.is('group_id', null)
        if (category !== 'all') q = q.eq('category', category)
        return q
      }),
      user ? supabase.rpc('blocked_user_ids') : Promise.resolve({ data: [] }),
    ])
    const rawRows = error ? [] : data || []
    const blockedSet = new Set((blockedRows || []).map((row) => row.blocked_user_ids ?? row))
    const mutedWords = (settings.content.mutedWords || []).map((w) => w.toLowerCase()).filter(Boolean)
    const hideSensitive = profile?.content_filter_level === 'less'
    const filtered = rawRows.filter(
      (p) =>
        !blockedSet.has(p.author_id) &&
        !mutedWords.some((w) => p.title?.toLowerCase().includes(w)) &&
        !(hideSensitive && p.is_sensitive)
    )
    return { filtered, rawCount: rawRows.length }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPage(0)
    setHasMore(true)
    async function init() {
      const { filtered, rawCount } = await fetchPage(0)
      if (cancelled) return
      setHasMore(rawCount === FEED_PAGE_SIZE)
      // Social counts (likes/comments) feed the engagement signal, so fetch
      // them before ranking — not after, or the first render would briefly
      // show plain chronological order and then jump.
      const social = await loadSocial(filtered.map((p) => p.id))
      if (!cancelled) {
        const ranked = rankFeed(filtered, social, { followingIds, interests: settings.content.interests })
        setPredictions(ranked)
        setSocialById(social)
        setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, user, settings.content.mutedWords, profile?.content_filter_level, followingIds])

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    const { filtered, rawCount } = await fetchPage(nextPage)
    const social = await loadSocial(filtered.map((p) => p.id))
    // Each newly-fetched page is ranked among itself (not re-mixed with
    // already-shown pages above it) — see feedRanking.js's file comment for
    // why a per-page re-rank, not a full-corpus one.
    const ranked = rankFeed(filtered, social, { followingIds, interests: settings.content.interests })
    setPredictions((prev) => [...prev, ...ranked])
    setPage(nextPage)
    setHasMore(rawCount === FEED_PAGE_SIZE)
    setSocialById((prev) => ({ ...prev, ...social }))
    setLoadingMore(false)
  }

  // Infinite scroll: a sentinel div at the bottom of the list triggers the
  // same handleLoadMore a manual button used to. Kept in a ref (updated every
  // render) rather than as an effect dependency — handleLoadMore closes over
  // page/hasMore/loadingMore, and re-creating the observer on every one of
  // those changes would be wasteful when just reading the latest one works.
  // A *callback* ref (not a plain useRef + effect) is what re-attaches the
  // observer correctly when the sentinel itself unmounts/remounts — e.g.
  // hasMore flips false→true across a category switch's own reload.
  const loadMoreRef = useRef(handleLoadMore)
  loadMoreRef.current = handleLoadMore
  const observerRef = useRef(null)
  const sentinelCallbackRef = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect()
    if (!node) return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreRef.current()
      },
      { rootMargin: '600px 0px' }
    )
    observerRef.current.observe(node)
  }, [])

  async function handleToggleLike(predictionId) {
    if (!user) return
    const current = socialById[predictionId] || EMPTY_SOCIAL
    const nextLiked = !current.liked
    setSocialById((prev) => ({
      ...prev,
      [predictionId]: { ...current, liked: nextLiked, likeCount: current.likeCount + (nextLiked ? 1 : -1) },
    }))
    const { error } = nextLiked
      ? await supabase.from('prediction_likes').insert({ user_id: user.id, prediction_id: predictionId })
      : await supabase.from('prediction_likes').delete().eq('user_id', user.id).eq('prediction_id', predictionId)
    if (error) {
      setSocialById((prev) => ({ ...prev, [predictionId]: current }))
      showToast(t('home.likeFailedToast'))
    }
  }

  async function handleToggleSave(predictionId) {
    if (!user) return
    const current = socialById[predictionId] || EMPTY_SOCIAL
    const nextSaved = !current.saved
    setSocialById((prev) => ({ ...prev, [predictionId]: { ...current, saved: nextSaved } }))
    const { error } = nextSaved
      ? await supabase.from('prediction_saves').insert({ user_id: user.id, prediction_id: predictionId })
      : await supabase.from('prediction_saves').delete().eq('user_id', user.id).eq('prediction_id', predictionId)
    if (error) {
      setSocialById((prev) => ({ ...prev, [predictionId]: current }))
      showToast(t('home.saveFailedToast'))
    }
  }

  if (loading) {
    return <p className="mx-5 mt-4 text-xs text-muted-foreground">{t('home.loadingRecords')}</p>
  }

  if (predictions.length === 0) {
    return (
      <div className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-card p-6 text-center">
        <p className="text-sm font-bold text-foreground">{t('home.noRecordsTitle')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('home.noRecordsBody')}</p>
      </div>
    )
  }

  return (
    <>
      {predictions.map((prediction) => (
        <PredictionCard
          key={prediction.id}
          prediction={prediction}
          social={socialById[prediction.id] || EMPTY_SOCIAL}
          onToggleLike={handleToggleLike}
          onToggleSave={handleToggleSave}
        />
      ))}
      {hasMore && (
        <div ref={sentinelCallbackRef} className="mx-5 mt-4 flex h-11 items-center justify-center">
          {loadingMore && (
            <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <iconify-icon icon="lucide:loader-2" class="animate-spin text-base"></iconify-icon>
              {t('home.loadingMore')}
            </span>
          )}
        </div>
      )}
    </>
  )
}

function SuggestedPeople() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetchPeopleSuggestions(user.id, { limit: 5 }).then((result) => {
      if (cancelled) return
      setPeople(result)
      setLoading(false)
    })
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

  if (loading || people.length === 0) return null

  return (
    <section className="mt-7">
      <div className="flex items-end justify-between px-5">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight">{t('home.suggestedPeople')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('home.suggestedPeopleSubtitle')}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto px-5 pb-1">
        {people.map((person) => (
          <article key={person.id} className="min-w-[166px] rounded-theme border border-border bg-card p-3 shadow-sm">
            <button onClick={() => navigate(`/kullanici/${person.id}`)} className="shine-none block cursor-pointer text-left">
              <div className="h-11 w-11 overflow-hidden rounded-full">
                <img src={person.avatar_url || fallbackAvatarFor(person.id)} alt={person.display_name} className="h-full w-full object-cover" />
              </div>
              <h3 className="mt-3 text-sm font-bold">{person.display_name}</h3>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {person.mutualCount > 0 ? t('home.mutualFollowsCount', { count: person.mutualCount }) : t('home.newOnGtf')}
              </p>
            </button>
            <button
              onClick={() => handleFollow(person.id)}
              className="mt-3 w-full rounded-theme bg-secondary py-2 text-xs font-bold text-secondary-foreground"
            >
              {t('home.followAction')}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function FollowedGroups() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('group_members')
      .select('groups(id, name, category, description, cover_image_url)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!cancelled) {
          setGroups((data || []).map((m) => m.groups).filter(Boolean))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) return null

  return (
    <section className="mt-7">
      <div className="flex items-end justify-between px-5">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight">{t('home.yourGroups')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {groups.length === 0 ? t('home.notJoinedYet') : t('home.joinedCommunities')}
          </p>
        </div>
        <button onClick={() => navigate('/gruplar')} className="text-xs font-bold text-primary">
          {t('home.groupsCta')}
        </button>
      </div>

      {groups.length === 0 ? (
        <button
          onClick={() => navigate('/gruplar')}
          className="mx-5 mt-4 flex w-[calc(100%-40px)] items-center justify-center gap-2 rounded-theme border border-dashed border-border bg-card py-4 text-xs font-bold text-primary"
        >
          <iconify-icon icon="lucide:users-round" class="text-base"></iconify-icon>
          {t('home.joinOrCreateGroup')}
        </button>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto px-5 pb-2">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => navigate(`/grup/${group.id}`)}
              className="min-w-[210px] overflow-hidden rounded-theme border border-border bg-card text-left shadow-sm"
            >
              {group.cover_image_url && (
                <div className="h-20 w-full overflow-hidden bg-muted">
                  <img src={group.cover_image_url} alt={group.name} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <Chip>{group.category?.toUpperCase()}</Chip>
                <h3 className="mt-3 font-heading text-[16px] font-bold">{group.name}</h3>
                {group.description && (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{group.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export default function Anasayfa() {
  const { t } = useTranslation()
  const location = useLocation()
  // Keşfet's "Popüler alanlar" tiles land here with a category already
  // chosen — someone tapping "Ekonomi" there wants Ekonomi predictions,
  // not to land on the "all" tab and have to find the tab themselves.
  const [activeCategory, setActiveCategory] = useState(() => location.state?.category || 'all')
  const { settings } = useUserSettings()
  // Already-satisfied by the state above when arriving with a category —
  // the interest-based default below is a fallback for a plain visit, not
  // something that should override an explicit choice just made in Keşfet.
  const appliedInterestDefault = useRef(!!location.state?.category)

  // Land people with a single declared interest straight on that tab. Only
  // applies once, and only before the user has touched the tabs themselves.
  // Interests are still stored as Turkish labels (Uygulama Ayarları isn't
  // migrated to slugs yet), so lowercasing one gives back the matching DB
  // slug — the exact same coupling feedRanking.js already relies on.
  useEffect(() => {
    if (appliedInterestDefault.current) return
    const interests = settings.content.interests
    if (interests.length === 0) return
    appliedInterestDefault.current = true
    const slug = interests[0].toLowerCase()
    if (interests.length === 1 && CATEGORY_SLUGS.includes(slug)) {
      setActiveCategory(slug)
    }
  }, [settings.content.interests])

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <Header />
      <main className="pt-5">
        <ComposeCard />
        <OpeningTodayBanner />
        <CategoryTabs active={activeCategory} onSelect={setActiveCategory} />
        <StatsBanner />
        {/* RightRail (AppShell) carries its own "Sana önerilen kişiler" at
            xl+ — a standing widget beats one more scroll stop, so skip the
            duplicate there. Placed here rather than after PredictionFeed
            (its old spot): "kaydırdıktan sonra" — a BIT of scroll, not
            however long the whole ~15-card feed runs — so it sits right
            before the feed starts instead of after it ends. */}
        <div className="xl:hidden">
          <SuggestedPeople />
        </div>
        <section className="mt-7">
          <div className="flex items-center justify-between px-5">
            <div>
              <h1 className="font-heading text-xl font-extrabold tracking-[-0.045em]">{t('home.feedTitle')}</h1>
              <p className="mt-1 text-xs text-muted-foreground">{t('home.feedSubtitle')}</p>
            </div>
          </div>
          <PredictionFeed category={activeCategory} />
        </section>
        <FollowedGroups />
      </main>
    </div>
  )
}
