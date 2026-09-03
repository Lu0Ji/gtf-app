import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, queryWithGroupIdFallback } from '../lib/supabase.js'
import { fallbackAvatarFor } from '../lib/images.js'
import { formatTimeUntil } from '../lib/format.js'
import { CATEGORY_META } from '../lib/categories.js'
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
      const [rankedRes, openingRes, followingRes, blockedRes] = await Promise.all([
        supabase.from('profiles').select('id, display_name, points, avatar_url').order('points', { ascending: false }).limit(3),
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
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase.rpc('blocked_user_ids'),
      ])
      if (cancelled) return

      const excludeSet = new Set((followingRes.data || []).map((f) => f.following_id))
      excludeSet.add(user.id)
      for (const row of blockedRes.data || []) excludeSet.add(row.blocked_user_ids ?? row)
      const { data: candidates } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .order('created_at', { ascending: false })
        .limit(20)
      if (cancelled) return

      setTopRanked(rankedRes.data || [])
      setOpeningSoon(openingRes.data || [])
      setPeople((candidates || []).filter((p) => !excludeSet.has(p.id)).slice(0, 3))
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
      showToast('Takip edilemedi, tekrar dene.')
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
            <h2 className="text-base font-bold tracking-[-0.04em] text-foreground">Yaklaşan açılışlar</h2>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {openingSoon.map((p) => {
              const meta = CATEGORY_META[p.category] || { icon: 'lucide:tag', label: p.category }
              return (
                <button
                  key={p.id}
                  onClick={() => navigate('/tahmin-kaydi', { state: { prediction: p } })}
                  className="rounded-theme text-left transition-colors duration-150 active:bg-muted"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-accent">
                    <iconify-icon icon="lucide:hourglass" class="text-xs"></iconify-icon>
                    {formatTimeUntil(p.event_date)}
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold leading-5 text-foreground">{p.title}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-primary">
                    <iconify-icon icon={meta.icon} class="text-[10px]"></iconify-icon>
                    {meta.label}
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
              <h2 className="text-base font-bold tracking-[-0.04em] text-foreground">Sana önerilen kişiler</h2>
              <p className="text-[11px] text-muted-foreground">GTF'e yeni katılanlar</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            {people.map((person) => (
              <div key={person.id} className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/kullanici/${person.id}`)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                    <img
                      src={person.avatar_url || fallbackAvatarFor(person.id)}
                      alt={person.display_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {person.display_name}
                  </span>
                </button>
                <button
                  onClick={() => handleFollow(person.id)}
                  className="shrink-0 rounded-theme bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground transition-transform duration-150 active:scale-95"
                >
                  Takip et
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
              <h2 className="text-base font-bold tracking-[-0.04em] text-foreground">Liderlik tablosu</h2>
            </div>
            <button onClick={() => navigate('/liderlik-tablosu')} className="text-xs font-bold text-primary">
              Tümü
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            {topRanked.map((p, i) => (
              <button
                key={p.id}
                onClick={() => navigate(`/kullanici/${p.id}`)}
                className="flex w-full items-center gap-3 rounded-theme text-left transition-colors duration-150 active:bg-muted"
              >
                <span className={`w-5 shrink-0 font-heading text-sm font-extrabold ${i === 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                  {i + 1}
                </span>
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                  <img
                    src={p.avatar_url || fallbackAvatarFor(p.id)}
                    alt={p.display_name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {p.display_name}
                </span>
                <span className="shrink-0 text-xs font-bold text-muted-foreground">{p.points} puan</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  )
}
