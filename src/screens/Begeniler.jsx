import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatDateLong, formatTime, timeAgo } from '../lib/format.js'

const DEFAULT_AVATAR = IMG('fc4eb4df-87ce-4cd9-bdd3-80a434cd8ddd')

function groupByDay(rows) {
  const todayKey = new Date().toDateString()
  const yesterdayKey = new Date(Date.now() - 86400000).toDateString()
  const groups = new Map()
  for (const row of rows) {
    const dayKey = new Date(row.created_at).toDateString()
    const label = dayKey === todayKey ? 'Bugün' : dayKey === yesterdayKey ? 'Dün' : formatDateLong(row.created_at)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(row)
  }
  return Array.from(groups.entries())
}

export default function Begeniler() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('prediction_likes')
      .select('created_at, predictions(*, profiles:author_id(display_name, username, avatar_url))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setRows((data || []).filter((r) => r.predictions))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  async function handleUnlike(predictionId) {
    setRows((prev) => prev.filter((r) => r.predictions.id !== predictionId))
    const { error } = await supabase
      .from('prediction_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('prediction_id', predictionId)
    if (error) showToast('Beğeni geri alınamadı, tekrar dene.')
  }

  const filtered = rows.filter((r) => r.predictions.title?.toLowerCase().includes(query.trim().toLowerCase()))
  const grouped = groupByDay(filtered)

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 pb-3 pt-12 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <div className="text-center">
            <p className="font-heading text-lg font-extrabold tracking-[-0.04em]">Beğeniler</p>
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Beğendiğin tahminler</p>
          </div>
          <div className="h-10 w-10" />
        </div>

        <div className="mt-4 flex h-11 items-center rounded-theme border border-border bg-input px-3">
          <iconify-icon icon="lucide:search" class="mr-2 text-[18px] text-muted-foreground"></iconify-icon>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Beğenilerinde ara"
            aria-label="Beğenilerde ara"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </header>

      <main className="px-5 pb-10 pt-5">
        {loading ? (
          <p className="text-xs text-muted-foreground">Yükleniyor…</p>
        ) : grouped.length === 0 ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            {query ? 'Eşleşen bir beğeni yok.' : 'Henüz bir tahmin beğenmedin.'}
          </p>
        ) : (
          grouped.map(([label, group]) => (
            <section key={label} className="mt-2 first:mt-0">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                <p className="text-[11px] font-medium text-muted-foreground">{group.length} beğeni</p>
              </div>

              {group.map(({ created_at, predictions: p }) => {
                const author = p.profiles
                const isVerified = p.status === 'verified_correct' || p.status === 'verified_incorrect'
                const isCorrect = p.status === 'verified_correct'
                return (
                  <article
                    key={p.id}
                    onClick={() => navigate('/tahmin-kaydi', { state: { prediction: p } })}
                    className="mt-3 cursor-pointer rounded-theme border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary">
                        <img src={author?.avatar_url || DEFAULT_AVATAR} alt={author?.display_name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h2 className="text-sm font-bold text-foreground">{author?.display_name || 'Kullanıcı'}</h2>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              @{author?.username || 'kullanici'} · {formatTime(created_at)}
                            </p>
                          </div>
                          <button
                            aria-label="Beğeniyi geri al"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUnlike(p.id)
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
                          >
                            <iconify-icon icon="lucide:heart" class="text-[16px]"></iconify-icon>
                          </button>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">
                            {p.category?.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {isVerified ? 'Doğrulandı' : 'Mühürlü tahmin'}
                          </span>
                        </div>
                        <p className="mt-2 text-[14px] font-semibold leading-5 text-foreground">
                          {isVerified ? `"${p.sealed_content}"` : p.title}
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[11px] font-medium text-muted-foreground">
                          <span>{isVerified ? formatDateLong(p.verified_at) : `${formatDateLong(p.event_date)}'da açılacak`}</span>
                          <span>{timeAgo(p.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          ))
        )}
      </main>
    </div>
  )
}
