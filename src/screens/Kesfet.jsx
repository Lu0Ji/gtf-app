import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'
import { supabase, queryWithGroupIdFallback } from '../lib/supabase.js'
import { timeAgo } from '../lib/format.js'
import { CATEGORY_META } from '../lib/categories.js'

function SearchResults({ query, navigate }) {
  const [profiles, setProfiles] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const handle = setTimeout(async () => {
      const term = query.trim()
      const [{ data: blockedRows }, { data: profileRows }, { data: predictionRows }] = await Promise.all([
        supabase.rpc('blocked_user_ids'),
        supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
          .limit(15),
        queryWithGroupIdFallback((filterGroupId) => {
          let q = supabase
            .from('predictions')
            .select('*, profiles:author_id(display_name, username, avatar_url)')
            .eq('is_private', false)
            .ilike('title', `%${term}%`)
            .order('created_at', { ascending: false })
            .limit(15)
          if (filterGroupId) q = q.is('group_id', null)
          return q
        }),
      ])
      if (cancelled) return
      const blockedSet = new Set((blockedRows || []).map((row) => row.blocked_user_ids ?? row))
      setProfiles((profileRows || []).filter((p) => !blockedSet.has(p.id)))
      setPredictions((predictionRows || []).filter((p) => !blockedSet.has(p.author_id)))
      setLoading(false)
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query])

  if (loading) {
    return <p className="px-5 text-xs text-muted-foreground">Aranıyor…</p>
  }

  if (profiles.length === 0 && predictions.length === 0) {
    return (
      <p className="mx-5 rounded-theme border border-dashed border-border bg-muted/60 p-4 text-center text-xs text-muted-foreground">
        "{query}" için sonuç bulunamadı.
      </p>
    )
  }

  return (
    <div>
      {profiles.length > 0 && (
        <section className="mb-6">
          <h2 className="px-5 font-heading text-sm font-bold tracking-tight">Kullanıcılar</h2>
          <div className="mt-3 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {profiles.map((p, i) => (
              <button
                key={p.id}
                onClick={() => navigate(`/kullanici/${p.id}`)}
                className={`flex w-full items-center gap-3 p-4 text-left ${i < profiles.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                  <img src={p.avatar_url || DEFAULT_AVATAR} alt={p.display_name} className="h-full w-full object-cover" />
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
          <h2 className="px-5 font-heading text-sm font-bold tracking-tight">Tahminler</h2>
          <div className="mt-3 space-y-3 px-5">
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate('/tahmin-kaydi', { state: { prediction: p } })}
                className="block w-full rounded-theme border border-border bg-card p-4 text-left shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                    {p.category?.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</span>
                </div>
                <h3 className="mt-3 text-sm font-bold leading-5">{p.title}</h3>
                <p className="mt-2 text-[11px] text-muted-foreground">{p.profiles?.display_name || 'Kullanıcı'}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

const DEFAULT_AVATAR = IMG('e5c6a2fd-2700-478a-a8f3-1ed0f5acfc3e')

function CategoryTile({ category, count, variant }) {
  const meta = CATEGORY_META[category] || { icon: 'lucide:tag', label: category }
  const variantClass =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'border border-border bg-card text-card-foreground shadow-sm'

  return (
    <div className={`rounded-theme p-4 text-left ${variantClass}`}>
      <div className="flex items-start justify-between">
        {variant === 'primary' ? (
          <iconify-icon icon={meta.icon} class="text-xl"></iconify-icon>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
            <iconify-icon icon={meta.icon} class="text-lg"></iconify-icon>
          </span>
        )}
      </div>
      <p className={`font-heading text-base font-bold ${variant === 'primary' ? 'mt-7' : 'mt-5'}`}>{meta.label}</p>
      <p className={`mt-1 text-[11px] ${variant === 'primary' ? 'text-white/70' : 'text-muted-foreground'}`}>
        {count} tahmin
      </p>
    </div>
  )
}

export default function Kesfet() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [categoryCounts, setCategoryCounts] = useState([])
  const [topRanked, setTopRanked] = useState([])
  const [recentPredictions, setRecentPredictions] = useState([])
  const [trending, setTrending] = useState([])
  const [openingSoon, setOpeningSoon] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      const [predictionsRes, profilesRes, openingSoonRes] = await Promise.all([
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
        supabase.from('profiles').select('id, display_name, points, avatar_url').order('points', { ascending: false }).limit(3),
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
      setTopRanked(profilesRes.data || [])
      setRecentPredictions((predictionsRes.data || []).slice(0, 6))
      setTrending(trendingList)
      const now = Date.now()
      setOpeningSoon(
        (openingSoonRes.data || []).map((p) => ({
          ...p,
          hoursLeft: Math.max(1, Math.round((new Date(p.event_date) - now) / 3600000)),
        }))
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="px-5 pt-12 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Keşfet</p>
          <h1 className="mt-1 font-heading text-[27px] font-extrabold tracking-[-0.06em] text-primary">
            Geleceğin izinde
          </h1>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-theme border border-border bg-card px-4 py-3 shadow-sm">
          <iconify-icon icon="lucide:search" class="text-lg text-muted-foreground"></iconify-icon>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kullanıcı veya tahmin ara…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button aria-label="Aramayı temizle" onClick={() => setQuery('')} className="text-muted-foreground">
              <iconify-icon icon="lucide:x" class="text-lg"></iconify-icon>
            </button>
          )}
        </div>
      </header>

      <main>
        {query.trim() ? (
          <SearchResults query={query.trim()} navigate={navigate} />
        ) : loading ? (
          <p className="px-5 text-xs text-muted-foreground">Yükleniyor…</p>
        ) : (
          <>
            {openingSoon.length > 0 && (
              <section className="mb-8">
                <div className="px-5">
                  <h2 className="font-heading text-lg font-bold tracking-tight">Yakında açılacaklar</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Önümüzdeki 48 saatte mührü açılacaklar</p>
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
                  {openingSoon.map((p) => {
                    const meta = CATEGORY_META[p.category] || { icon: 'lucide:tag', label: p.category }
                    const { hoursLeft } = p
                    return (
                      <div
                        key={p.id}
                        className="min-w-[190px] rounded-theme border border-border bg-card p-3.5 shadow-sm"
                      >
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent">
                          <iconify-icon icon="lucide:hourglass" class="text-xs"></iconify-icon>
                          {hoursLeft < 24 ? `${hoursLeft} saat sonra` : `${Math.round(hoursLeft / 24)} gün sonra`}
                        </div>
                        <p className="mt-2 text-sm font-bold leading-5">{p.title}</p>
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-primary">
                          <iconify-icon icon={meta.icon} class="text-xs"></iconify-icon>
                          {meta.label}
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
                    Trend olanlar
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Şu an en çok konuşulanlar</p>
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
                          src={prediction.profiles?.avatar_url || DEFAULT_AVATAR}
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
                  <h2 className="font-heading text-lg font-bold tracking-tight">Popüler alanlar</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Kategoriye göre tahmin sayısı</p>
                </div>
              </div>

              {categoryCounts.length === 0 ? (
                <p className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-4 text-center text-xs text-muted-foreground">
                  Henüz kategorilere ayrılmış tahmin yok.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 px-5">
                  {categoryCounts.map((c, i) => (
                    <CategoryTile key={c.category} category={c.category} count={c.count} variant={i === 0 ? 'primary' : 'card'} />
                  ))}
                </div>
              )}
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
                  <p className="mt-2 text-xs text-muted-foreground">Puana göre en iyi 3</p>
                </div>
                <button
                  aria-label="Liderlik tablosunu aç"
                  onClick={() => navigate('/liderlik-tablosu')}
                  className="rounded-full bg-muted p-2 text-primary"
                >
                  <iconify-icon icon="lucide:arrow-up-right" class="text-base"></iconify-icon>
                </button>
              </div>

              {topRanked.length === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">Henüz kimse yok.</p>
              ) : (
                <div className="mt-4 divide-y divide-border">
                  {topRanked.map((entry, i) => (
                    <button
                      key={entry.id}
                      onClick={() => navigate(`/kullanici/${entry.id}`)}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span className={`w-5 font-heading text-sm font-extrabold ${i === 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <div className="h-9 w-9 overflow-hidden rounded-full bg-muted">
                        <img src={entry.avatar_url || DEFAULT_AVATAR} alt={entry.display_name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{entry.display_name}</p>
                      </div>
                      <span className="font-heading text-sm font-extrabold text-primary">{entry.points}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-5">
              <div className="flex items-end justify-between px-5">
                <div>
                  <h2 className="font-heading text-lg font-bold tracking-tight">Son eklenenler</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">En yeni kayıtlar</p>
                </div>
              </div>

              {recentPredictions.length === 0 ? (
                <p className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-4 text-center text-xs text-muted-foreground">
                  Henüz kayıt yok.
                </p>
              ) : (
                <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
                  {recentPredictions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate('/tahmin-kaydi', { state: { prediction: p } })}
                      className="min-w-[240px] rounded-theme border border-border bg-card p-4 text-left shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                          {p.category?.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</span>
                      </div>
                      <h3 className="mt-3 font-heading text-sm font-bold leading-5">{p.title}</h3>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {p.profiles?.display_name || 'Kullanıcı'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
