import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'
import { supabase, queryWithGroupIdFallback } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useUserSettings } from '../hooks/useUserSettings.js'
import { formatDateLong, timeAgo } from '../lib/format.js'
import { CATEGORIES as PREDICTION_CATEGORIES } from '../lib/categories.js'

const CATEGORIES = ['Tümü', ...PREDICTION_CATEGORIES]
const DEFAULT_AVATAR = IMG('fc4eb4df-87ce-4cd9-bdd3-80a434cd8ddd')

function Header() {
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
              Gelecek Tahmin Fonu
            </p>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">
              Herkese açık akış
            </p>
          </div>
        </div>
        <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-card shadow-sm">
          <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="Profilin" className="h-full w-full object-cover" />
        </div>
      </div>
    </header>
  )
}

function ComposeCard() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  return (
    <section className="mx-5 rounded-theme border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
          <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="Profilin" className="h-full w-full object-cover" />
        </div>
        <button
          onClick={() => navigate('/tahmin-olustur')}
          className="flex h-11 flex-1 items-center rounded-theme bg-muted px-4 text-left text-sm text-muted-foreground"
        >
          Ne tahmin ediyorsun?
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/tahmin-olustur')}
            className="flex items-center gap-1.5 rounded-theme bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"
          >
            <iconify-icon icon="lucide:pen-line" class="text-sm text-primary"></iconify-icon>
            Tahmin
          </button>
          <button
            onClick={() => navigate('/tahmin-olustur')}
            className="flex items-center gap-1.5 rounded-theme bg-muted px-3 py-2 text-xs font-bold text-muted-foreground"
          >
            <iconify-icon icon="lucide:archive" class="text-sm"></iconify-icon>
            Zaman kapsülü
          </button>
        </div>
        <button
          aria-label="Yeni tahmin oluştur"
          onClick={() => navigate('/tahmin-olustur')}
          className="flex h-9 w-9 items-center justify-center rounded-theme bg-primary text-primary-foreground"
        >
          <iconify-icon icon="lucide:plus" class="text-lg"></iconify-icon>
        </button>
      </div>
    </section>
  )
}

// Personal hook: your own sealed predictions whose reveal date has arrived
// are the one thing only you can act on right now, so surface them above
// everything else instead of leaving them to be found on your profile.
function OpeningTodayBanner() {
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
        <p className="text-sm font-bold">
          {pending.length === 1 ? 'Bir mührün açılmaya hazır!' : `${pending.length} mührün açılmaya hazır!`}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          "{pending[0].title}" — sonucu şimdi işaretle.
        </p>
      </div>
      <iconify-icon icon="lucide:chevron-right" class="shrink-0 text-lg text-muted-foreground"></iconify-icon>
    </button>
  )
}

function CategoryTabs({ active, onSelect }) {
  return (
    <section className="mt-5">
      <div className="flex gap-2 overflow-x-auto px-5 pb-1">
        {CATEGORIES.map((category) => {
          const isActive = category === active
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelect(category)}
              className={
                isActive
                  ? 'shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground'
                  : 'shrink-0 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-secondary-foreground'
              }
            >
              {category}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function StatsBanner() {
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
    <section className="mx-5 mt-5 rounded-theme border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
          <iconify-icon icon="lucide:activity" class="text-lg"></iconify-icon>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground">Platformda şu an</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.sealed}</span> açılmayı bekleyen mühürlü kayıt ·{' '}
            <span className="font-semibold text-foreground">{stats.verified}</span> doğrulanmış sonuç
          </p>
        </div>
      </div>
    </section>
  )
}

function PredictionCard({ prediction, social, onToggleLike, onToggleSave }) {
  const navigate = useNavigate()
  const author = prediction.profiles
  const isVerified = prediction.status === 'verified_correct' || prediction.status === 'verified_incorrect'
  const isCorrect = prediction.status === 'verified_correct'
  const { liked, likeCount, saved, commentCount } = social

  return (
    <article
      onClick={() => navigate('/tahmin-kaydi', { state: { prediction } })}
      className="mx-5 mt-4 cursor-pointer rounded-theme border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/kullanici/${prediction.author_id}`)
          }}
          className="h-11 w-11 shrink-0 overflow-hidden rounded-full"
        >
          <img
            src={author?.avatar_url || DEFAULT_AVATAR}
            alt={author?.display_name || 'Kullanıcı'}
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
              className="text-left"
            >
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold">{author?.display_name || 'Kullanıcı'}</h2>
                <iconify-icon icon="lucide:badge-check" class="text-sm text-primary"></iconify-icon>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                @{author?.username || 'kullanici'} · {timeAgo(prediction.created_at)}
              </p>
            </button>
          </div>
          <p className="mt-3 text-[15px] font-medium leading-6 text-foreground">{prediction.title}</p>

          {isVerified ? (
            <div className="mt-3 overflow-hidden rounded-theme border border-border">
              <div
                className={`flex items-center justify-between px-3 py-2 text-[11px] font-bold ${
                  isCorrect ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <iconify-icon icon={isCorrect ? 'lucide:badge-check' : 'lucide:x-circle'} class="text-sm"></iconify-icon>
                  {isCorrect ? 'Doğrulandı' : 'Gerçekleşmedi'}
                </span>
                <span>{formatDateLong(prediction.verified_at)}</span>
              </div>
              <div className="bg-muted p-3">
                <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-bold text-primary">
                  {prediction.category?.toUpperCase()}
                </span>
                <p className="mt-3 text-sm font-bold leading-5">&ldquo;{prediction.sealed_content}&rdquo;</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-theme border border-border bg-muted p-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-bold text-primary">
                  {prediction.category?.toUpperCase()}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
                  <iconify-icon icon="lucide:stamp" class="text-xs"></iconify-icon>
                  Mühürlü tahmin
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-primary">
                  <iconify-icon icon="lucide:calendar-days" class="text-base"></iconify-icon>
                </div>
                <div>
                  <p className="text-xs font-bold">{formatDateLong(prediction.event_date)}'da açılacak</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Kayıt sabit; içerik açılana kadar gizli.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-muted-foreground">
              <button
                aria-label="Beğen"
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
                aria-label="Yorum yap"
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
              aria-label="Kaydet"
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
    </article>
  )
}

const EMPTY_SOCIAL = { liked: false, likeCount: 0, saved: false, commentCount: 0 }

function PredictionFeed({ category }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { settings } = useUserSettings()
  const [predictions, setPredictions] = useState([])
  const [socialById, setSocialById] = useState({})
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    async function load() {
      const [{ data, error }, { data: blockedRows }] = await Promise.all([
        queryWithGroupIdFallback((filterGroupId) => {
          let q = supabase
            .from('predictions')
            .select('*, profiles:author_id(display_name, username, avatar_url)')
            .eq('is_private', false)
            .order('created_at', { ascending: false })
            .limit(30)
          if (filterGroupId) q = q.is('group_id', null)
          if (category !== 'Tümü') q = q.eq('category', category.toLowerCase())
          return q
        }),
        user ? supabase.rpc('blocked_user_ids') : Promise.resolve({ data: [] }),
      ])
      if (cancelled) return
      const blockedSet = new Set((blockedRows || []).map((row) => row.blocked_user_ids ?? row))
      const mutedWords = (settings.content.mutedWords || []).map((w) => w.toLowerCase()).filter(Boolean)
      const list = error
        ? []
        : (data || []).filter(
            (p) => !blockedSet.has(p.author_id) && !mutedWords.some((w) => p.title?.toLowerCase().includes(w))
          )
      setPredictions(list)
      const social = await loadSocial(list.map((p) => p.id))
      if (!cancelled) {
        setSocialById(social)
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, user, settings.content.mutedWords])

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
      showToast('Beğeni kaydedilemedi, tekrar dene.')
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
      showToast('Kaydetme işlemi başarısız oldu, tekrar dene.')
    }
  }

  if (loading) {
    return <p className="mx-5 mt-4 text-xs text-muted-foreground">Kayıtlar yükleniyor…</p>
  }

  if (predictions.length === 0) {
    return (
      <div className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-card p-6 text-center">
        <p className="text-sm font-bold text-foreground">Henüz kayıt yok</p>
        <p className="mt-1 text-xs text-muted-foreground">İlk tahminini oluşturarak akışı başlat.</p>
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
    </>
  )
}

function SuggestedPeople() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const [{ data: following }, { data: blockedIds }] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
      supabase.rpc('blocked_user_ids'),
    ])
    const excludeSet = new Set((following || []).map((f) => f.following_id))
    excludeSet.add(user.id)
    for (const row of blockedIds || []) excludeSet.add(row.blocked_user_ids ?? row)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .order('created_at', { ascending: false })
      .limit(20)

    setPeople((profiles || []).filter((p) => !excludeSet.has(p.id)).slice(0, 5))
    setLoading(false)
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (loading || people.length === 0) return null

  return (
    <section className="mt-7">
      <div className="flex items-end justify-between px-5">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight">Sana önerilen kişiler</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">GTF'e yeni katılanlar</p>
        </div>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto px-5 pb-1">
        {people.map((person) => (
          <article key={person.id} className="min-w-[166px] rounded-theme border border-border bg-card p-3 shadow-sm">
            <button onClick={() => navigate(`/kullanici/${person.id}`)} className="block text-left">
              <div className="h-11 w-11 overflow-hidden rounded-full">
                <img src={person.avatar_url || DEFAULT_AVATAR} alt={person.display_name} className="h-full w-full object-cover" />
              </div>
              <h3 className="mt-3 text-sm font-bold">{person.display_name}</h3>
              <p className="mt-1 text-[10px] text-muted-foreground">@{person.username}</p>
            </button>
            <button
              onClick={() => handleFollow(person.id)}
              className="mt-3 w-full rounded-theme bg-secondary py-2 text-xs font-bold text-secondary-foreground"
            >
              Takip et
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function FollowedGroups() {
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
          <h2 className="font-heading text-lg font-bold tracking-tight">Gruplarından</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {groups.length === 0 ? 'Henüz bir gruba katılmadın' : 'Üyesi olduğun topluluklar'}
          </p>
        </div>
        <button onClick={() => navigate('/gruplar')} className="text-xs font-bold text-primary">
          Gruplar
        </button>
      </div>

      {groups.length === 0 ? (
        <button
          onClick={() => navigate('/gruplar')}
          className="mx-5 mt-4 flex w-[calc(100%-40px)] items-center justify-center gap-2 rounded-theme border border-dashed border-border bg-card py-4 text-xs font-bold text-primary"
        >
          <iconify-icon icon="lucide:users-round" class="text-base"></iconify-icon>
          Bir gruba katıl veya yeni grup kur
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
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                  {group.category?.toUpperCase()}
                </span>
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
  const [activeCategory, setActiveCategory] = useState('Tümü')
  const { settings } = useUserSettings()
  const appliedInterestDefault = useRef(false)

  // Land people with a single declared interest straight on that tab. Only
  // applies once, and only before the user has touched the tabs themselves.
  useEffect(() => {
    if (appliedInterestDefault.current) return
    const interests = settings.content.interests
    if (interests.length === 0) return
    appliedInterestDefault.current = true
    if (interests.length === 1 && CATEGORIES.includes(interests[0])) {
      setActiveCategory(interests[0])
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
        <section className="mt-7">
          <div className="flex items-center justify-between px-5">
            <div>
              <h1 className="font-heading text-xl font-extrabold tracking-[-0.045em]">Akış</h1>
              <p className="mt-1 text-xs text-muted-foreground">Herkese açık mühürlü ve doğrulanmış kayıtlar</p>
            </div>
          </div>
          <PredictionFeed category={activeCategory} />
        </section>
        <SuggestedPeople />
        <FollowedGroups />
      </main>
    </div>
  )
}
