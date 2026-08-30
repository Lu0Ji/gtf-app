import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useUserSettings } from '../hooks/useUserSettings.js'
import { formatDateLong } from '../lib/format.js'

function dayLabel(dateStr) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a, b) => a.toDateString() === b.toDateString()

  if (sameDay(date, today)) return 'Bugün'
  if (sameDay(date, yesterday)) return 'Dün'
  return formatDateLong(dateStr)
}

function DayDivider({ label }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</h2>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

function IconNode({ icon, tone }) {
  return (
    <div className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-theme shadow-sm ${tone}`}>
      <iconify-icon icon={icon} class="text-xl"></iconify-icon>
    </div>
  )
}

const STATUS_META = {
  open: { icon: 'lucide:pen-line', tone: 'bg-muted text-muted-foreground', text: 'Tahmin oluşturdun.' },
  sealed: { icon: 'lucide:stamp', tone: 'bg-primary text-primary-foreground', text: 'Tahminini mühürledin.' },
  verified_correct: { icon: 'lucide:check-circle-2', tone: 'bg-success text-success-foreground', text: 'Bir tahminin doğrulandı.' },
  verified_incorrect: { icon: 'lucide:x-circle', tone: 'bg-destructive text-destructive-foreground', text: 'Bir tahminin gerçekleşmedi.' },
}

function EventRow({ icon, tone, text, timestamp, isLast, onClick, children }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp onClick={onClick} className={`relative flex w-full gap-3 text-left ${isLast ? 'pb-1' : 'pb-5'}`}>
      <IconNode icon={icon} tone={tone} />
      {!isLast && <div className="absolute left-[21px] top-11 h-[calc(100%-27px)] w-px bg-border" />}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] leading-5 text-foreground">{text}</p>
          <time className="shrink-0 text-[10px] text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
        {children}
      </div>
    </Comp>
  )
}

export default function Hareketler() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings } = useUserSettings()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const [
        { data: predictions },
        { data: memberships },
        { data: saves },
        { data: comments },
        { data: likesReceived },
        { data: commentsReceived },
        { data: newFollowers },
      ] = await Promise.all([
        supabase
          .from('predictions')
          .select('*, profiles:author_id(display_name, username, avatar_url)')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('group_members')
          .select('joined_at, groups(id, name, category)')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false }),
        supabase
          .from('prediction_saves')
          .select('created_at, predictions(*, profiles:author_id(display_name, username, avatar_url))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('prediction_comments')
          .select('created_at, content, predictions(*, profiles:author_id(display_name, username, avatar_url))')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('prediction_likes')
          .select(
            'created_at, predictions!inner(*, profiles:author_id(display_name, username, avatar_url)), profiles:user_id(id, display_name)'
          )
          .eq('predictions.author_id', user.id)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('prediction_comments')
          .select(
            'created_at, content, predictions!inner(*, profiles:author_id(display_name, username, avatar_url)), commenter:author_id(id, display_name, username, avatar_url)'
          )
          .eq('predictions.author_id', user.id)
          .neq('author_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('follows')
          .select('created_at, profiles:follower_id(id, display_name, username, avatar_url)')
          .eq('following_id', user.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false }),
      ])
      if (cancelled) return

      const merged = [
        ...(predictions || []).map((p) => ({ type: 'prediction', timestamp: p.created_at, data: p })),
        ...(memberships || []).map((m) => ({ type: 'group', timestamp: m.joined_at, data: m })),
        ...(saves || [])
          .filter((s) => s.predictions)
          .map((s) => ({ type: 'save', timestamp: s.created_at, data: s })),
        ...(comments || [])
          .filter((c) => c.predictions)
          .map((c) => ({ type: 'comment', timestamp: c.created_at, data: c })),
        ...(likesReceived || [])
          .filter((l) => l.predictions)
          .map((l) => ({ type: 'like_received', timestamp: l.created_at, data: l })),
        ...(commentsReceived || [])
          .filter((c) => c.predictions)
          .map((c) => ({ type: 'comment_received', timestamp: c.created_at, data: c })),
        ...(newFollowers || [])
          .filter((f) => f.profiles)
          .map((f) => ({ type: 'new_follower', timestamp: f.created_at, data: f })),
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      setEvents(merged)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  // What you did yourself always stays in your history; activity from
  // others is gated by the Bildirimler preferences in Ayarlar.
  const visibleEvents = events.filter((event) => {
    if (event.type === 'like_received') return settings.notifications.likes
    if (event.type === 'comment_received') return settings.notifications.comments
    if (event.type === 'new_follower') return settings.notifications.newFollowers
    if (event.type === 'group') return settings.notifications.groupActivity
    if (event.type === 'prediction' && event.data.status !== 'open') return settings.notifications.sealOpenings
    return true
  })

  const groupedByDay = []
  for (const event of visibleEvents) {
    const label = dayLabel(event.timestamp)
    let group = groupedByDay.find((g) => g.label === label)
    if (!group) {
      group = { label, events: [] }
      groupedByDay.push(group)
    }
    group.events.push(event)
  }

  return (
    <div className="min-h-screen w-full bg-background pb-10 text-foreground font-body">
      <header className="border-b border-border bg-background px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <div className="text-center">
            <h1 className="font-heading text-xl font-extrabold tracking-[-0.05em]">Hareketler</h1>
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Kalıcı etkinlik kaydın</p>
          </div>
          <div className="h-10 w-10" />
        </div>
      </header>

      <main>
        {loading ? (
          <p className="px-5 py-6 text-xs text-muted-foreground">Yükleniyor…</p>
        ) : groupedByDay.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-muted-foreground">
            Henüz bir hareketin yok. Bir tahmin oluştur veya bir gruba katıl.
          </p>
        ) : (
          groupedByDay.map((group) => (
            <section key={group.label} className="px-5 pt-6">
              <DayDivider label={group.label} />
              <div className="mt-4">
                {group.events.map((event, i) => {
                  const isLast = i === group.events.length - 1

                  if (event.type === 'prediction') {
                    const meta = STATUS_META[event.data.status] || STATUS_META.open
                    return (
                      <EventRow
                        key={`p-${event.data.id}`}
                        icon={meta.icon}
                        tone={meta.tone}
                        text={<span className="font-bold">{meta.text}</span>}
                        timestamp={event.timestamp}
                        isLast={isLast}
                        onClick={() => navigate('/tahmin-kaydi', { state: { prediction: event.data } })}
                      >
                        <div className="mt-2 rounded-theme border border-border bg-card p-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-secondary px-2 py-1 text-[9px] font-bold text-secondary-foreground">
                              {event.data.category?.toUpperCase()}
                            </span>
                            {event.data.is_private && (
                              <span className="text-[9px] font-semibold text-accent">Zaman kapsülü</span>
                            )}
                          </div>
                          <p className="mt-2 text-[12px] font-semibold leading-5">{event.data.title}</p>
                          {event.data.event_date && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {formatDateLong(event.data.event_date)}'da açılacak
                            </p>
                          )}
                        </div>
                      </EventRow>
                    )
                  }

                  if (event.type === 'group') {
                    return (
                      <EventRow
                        key={`g-${event.timestamp}`}
                        icon="lucide:users-round"
                        tone="bg-secondary text-primary"
                        text={
                          <>
                            <span className="font-bold">{event.data.groups?.name}</span> grubuna katıldın.
                          </>
                        }
                        timestamp={event.timestamp}
                        isLast={isLast}
                        onClick={event.data.groups?.id ? () => navigate(`/grup/${event.data.groups.id}`) : undefined}
                      />
                    )
                  }

                  if (event.type === 'save') {
                    return (
                      <EventRow
                        key={`s-${event.timestamp}`}
                        icon="lucide:bookmark-check"
                        tone="bg-secondary text-primary"
                        text={<span className="font-bold">Bir tahmini kaydettin.</span>}
                        timestamp={event.timestamp}
                        isLast={isLast}
                        onClick={() => navigate('/tahmin-kaydi', { state: { prediction: event.data.predictions } })}
                      >
                        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{event.data.predictions?.title}</p>
                      </EventRow>
                    )
                  }

                  if (event.type === 'comment') {
                    const target = event.data.predictions
                    return (
                      <EventRow
                        key={`c-${event.timestamp}`}
                        icon="lucide:message-circle"
                        tone="bg-secondary text-primary"
                        text={
                          <>
                            <span className="font-bold">{target?.profiles?.display_name || 'Bir kullanıcının'}</span> tahminine
                            yorum yaptın.
                          </>
                        }
                        timestamp={event.timestamp}
                        isLast={isLast}
                        onClick={() => navigate('/tahmin-kaydi', { state: { prediction: target } })}
                      >
                        <div className="mt-2 rounded-theme border border-border bg-card p-3 shadow-sm">
                          <p className="text-[11px] leading-4 text-muted-foreground">Yorumun</p>
                          <p className="mt-1 text-[12px] font-medium leading-5 text-foreground">{event.data.content}</p>
                        </div>
                      </EventRow>
                    )
                  }

                  if (event.type === 'comment_received') {
                    return (
                      <EventRow
                        key={`cr-${event.timestamp}`}
                        icon="lucide:message-circle"
                        tone="bg-primary text-primary-foreground"
                        text={
                          <>
                            <span className="font-bold">{event.data.commenter?.display_name || 'Biri'}</span> tahminine yorum
                            yaptı.
                          </>
                        }
                        timestamp={event.timestamp}
                        isLast={isLast}
                        onClick={() => navigate('/tahmin-kaydi', { state: { prediction: event.data.predictions } })}
                      >
                        <div className="mt-2 rounded-theme border border-border bg-card p-3 shadow-sm">
                          <p className="text-[12px] leading-5 text-foreground">{event.data.content}</p>
                        </div>
                      </EventRow>
                    )
                  }

                  if (event.type === 'new_follower') {
                    const p = event.data.profiles
                    return (
                      <EventRow
                        key={`nf-${event.timestamp}`}
                        icon="lucide:user-plus"
                        tone="bg-primary text-primary-foreground"
                        text={
                          <>
                            <span className="font-bold">{p?.display_name || 'Biri'}</span> seni takip etmeye başladı.
                          </>
                        }
                        timestamp={event.timestamp}
                        isLast={isLast}
                        onClick={p?.id ? () => navigate(`/kullanici/${p.id}`) : undefined}
                      />
                    )
                  }

                  // like_received
                  return (
                    <EventRow
                      key={`l-${event.timestamp}`}
                      icon="lucide:heart"
                      tone="bg-destructive text-destructive-foreground"
                      text={
                        <>
                          <span className="font-bold">{event.data.profiles?.display_name || 'Biri'}</span> tahminini beğendi.
                        </>
                      }
                      timestamp={event.timestamp}
                      isLast={isLast}
                      onClick={() => navigate('/tahmin-kaydi', { state: { prediction: event.data.predictions } })}
                    >
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{event.data.predictions?.title}</p>
                    </EventRow>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
