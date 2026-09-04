import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import Card from '../components/ui/Card.jsx'
import { formatDateLong, formatTime, sealLabel, timeAgo } from '../lib/format.js'
import DetailHeader from '../components/ui/DetailHeader.jsx'


function groupByDay(rows, t) {
  const todayKey = new Date().toDateString()
  const yesterdayKey = new Date(Date.now() - 86400000).toDateString()
  const groups = new Map()
  for (const row of rows) {
    const dayKey = new Date(row.created_at).toDateString()
    const label =
      dayKey === todayKey ? t('settings.searchHistory.today') : dayKey === yesterdayKey ? t('settings.searchHistory.yesterday') : formatDateLong(row.created_at)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(row)
  }
  return Array.from(groups.entries())
}

export default function Begeniler() {
  const { t } = useTranslation()
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
    if (error) showToast(t('likes.unlikeFailed'))
  }

  const filtered = rows.filter((r) => r.predictions.title?.toLowerCase().includes(query.trim().toLowerCase()))
  const grouped = groupByDay(filtered, t)

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 pb-3 backdrop-blur-md">
        <DetailHeader title={t('likes.title')} subtitle={t('likes.subtitle')} centered sticky={false} />

        <div className="mx-5 mt-4 flex h-11 items-center rounded-theme border border-border bg-input px-3">
          <iconify-icon icon="lucide:search" class="mr-2 text-[18px] text-muted-foreground"></iconify-icon>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('likes.searchPlaceholder')}
            aria-label={t('likes.searchAria')}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <main className="px-5 pb-10 pt-5">
        {loading ? (
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : grouped.length === 0 ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            {query ? t('likes.noMatches') : t('likes.emptyBody')}
          </p>
        ) : (
          grouped.map(([label, group]) => (
            <section key={label} className="mt-2 first:mt-0">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                <p className="text-[11px] font-medium text-muted-foreground">{t('likes.likeCount', { count: group.length })}</p>
              </div>

              {group.map(({ created_at, predictions: p }) => {
                const author = p.profiles
                const isVerified = p.status === 'verified_correct' || p.status === 'verified_incorrect'
                return (
                  <Card
                    as="article"
                    key={p.id}
                    onClick={() => navigate('/tahmin-kaydi', { state: { prediction: p } })}
                    className="mt-3 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary">
                        <img src={author?.avatar_url || fallbackAvatarFor(p.author_id)} alt={author?.display_name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h2 className="text-sm font-bold text-foreground">{author?.display_name || t('common.unknownUser')}</h2>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              @{author?.username || t('common.unknownUsername')} · {formatTime(created_at)}
                            </p>
                          </div>
                          <button
                            aria-label={t('likes.unlikeAria')}
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
                            {isVerified ? t('home.verified') : t('home.sealedPrediction')}
                          </span>
                        </div>
                        <p className="mt-2 text-[14px] font-semibold leading-5 text-foreground">
                          {isVerified ? `"${p.sealed_content}"` : p.title}
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[11px] font-medium text-muted-foreground">
                          <span>{isVerified ? formatDateLong(p.verified_at) : sealLabel(p.event_date)}</span>
                          <span>{timeAgo(p.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </section>
          ))
        )}
      </main>
    </div>
  )
}
