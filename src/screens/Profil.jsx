import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { formatDateLong, sealLabel, timeAgo } from '../lib/format.js'
import BadgeShowcase from '../components/BadgeShowcase.jsx'
import DifficultyChip from '../components/DifficultyChip.jsx'
import ScreenHeader from '../components/ui/ScreenHeader.jsx'


const CATEGORY_ICONS = {
  spor: 'lucide:trophy',
  teknoloji: 'lucide:cpu',
  bilim: 'lucide:flask-conical',
  kültür: 'lucide:book-open',
  ekonomi: 'lucide:landmark',
  dünya: 'lucide:globe-2',
  genel: 'lucide:sparkles',
}

function OwnPredictionCard({ prediction }) {
  const isVerified = prediction.status === 'verified_correct' || prediction.status === 'verified_incorrect'
  const isCorrect = prediction.status === 'verified_correct'

  if (isVerified) {
    return (
      <div className="mx-5 mt-3 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
        <div
          className={`flex items-center justify-between px-4 py-2 text-[11px] font-bold ${
            isCorrect ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <iconify-icon icon={isCorrect ? 'lucide:badge-check' : 'lucide:x-circle'} class="text-sm"></iconify-icon>
            {isCorrect ? 'Doğrulandı' : 'Gerçekleşmedi'}
          </span>
          <span>{formatDateLong(prediction.verified_at)}</span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
              {prediction.category?.toUpperCase()}
            </span>
            <DifficultyChip tier={prediction.difficulty_tier} />
            {prediction.is_private && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
                <iconify-icon icon="lucide:archive" class="text-xs"></iconify-icon>
                Zaman kapsülü
              </span>
            )}
          </div>
          <p className="mt-3 text-[15px] font-semibold leading-6">&ldquo;{prediction.sealed_content}&rdquo;</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-5 mt-3 rounded-theme border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
            {prediction.category?.toUpperCase()}
          </span>
          <DifficultyChip tier={prediction.difficulty_tier} />
        </div>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
          <iconify-icon icon={prediction.is_private ? 'lucide:archive' : 'lucide:clock-3'} class="text-xs"></iconify-icon>
          {prediction.is_private ? 'Zaman kapsülü' : 'Mühürlü'}
        </span>
      </div>
      <p className="mt-3 text-[15px] font-semibold leading-6">{prediction.title}</p>
      <div className="mt-3 flex items-center justify-between rounded-theme bg-muted px-3 py-2.5">
        <div className="flex items-center gap-2">
          <iconify-icon icon="lucide:calendar-days" class="text-base text-primary"></iconify-icon>
          <span className="text-[11px] font-semibold">{sealLabel(prediction.event_date)}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{timeAgo(prediction.created_at)}</span>
      </div>
    </div>
  )
}

function SavedPredictionCard({ prediction }) {
  const navigate = useNavigate()
  const author = prediction.profiles
  const isVerified = prediction.status === 'verified_correct' || prediction.status === 'verified_incorrect'
  const isCorrect = prediction.status === 'verified_correct'

  return (
    <button
      onClick={() => navigate('/tahmin-kaydi', { state: { prediction } })}
      className="mx-5 mt-3 flex w-[calc(100%-40px)] items-start gap-3 rounded-theme border border-border bg-card p-4 text-left shadow-sm"
    >
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
        <img src={author?.avatar_url || fallbackAvatarFor(prediction.author_id)} alt={author?.display_name} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{author?.display_name || 'Kullanıcı'}</p>
        <p className="mt-1 text-sm font-semibold leading-5">{prediction.title}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-secondary-foreground">
            {prediction.category?.toUpperCase()}
          </span>
          {isVerified && (
            <span className={`text-[10px] font-semibold ${isCorrect ? 'text-success' : 'text-destructive'}`}>
              {isCorrect ? 'Doğrulandı' : 'Gerçekleşmedi'}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// Header shortcuts, as one coherent grid instead of 5 wrapping inline text
// links crammed together (the "dağınık" complaint) — "Uygulama Ayarları" is
// dropped here since the header gear icon already opens the same screen.
const PROFILE_SHORTCUTS = [
  { label: 'Profil Ayarları', icon: 'lucide:user-cog', route: '/profil-ayarlari' },
  { label: 'Hareketler', icon: 'lucide:activity', route: '/hareketler' },
  { label: 'Rozetler', icon: 'lucide:award', route: '/rozetler' },
  { label: 'Beğeniler', icon: 'lucide:heart', route: '/begeniler' },
]

const PROFILE_TABS = ['Tahminlerin', 'Kaydedilenler']

export default function Profil() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const [activeTab, setActiveTab] = useState('Tahminlerin')
  const [predictions, setPredictions] = useState([])
  const [savedPredictions, setSavedPredictions] = useState([])
  const [followerCount, setFollowerCount] = useState(null)
  const [followingCount, setFollowingCount] = useState(null)
  const [newFollowerCount, setNewFollowerCount] = useState(0)
  const [sealedThisWeek, setSealedThisWeek] = useState(0)
  const [verifiedThisWeek, setVerifiedThisWeek] = useState(0)
  const [earnedBadgeCount, setEarnedBadgeCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const [predictionsRes, followersRes, followingRes, savesRes, newFollowersRes, earnedBadgesRes] = await Promise.all([
        supabase.from('predictions').select('*').eq('author_id', user.id).order('created_at', { ascending: false }),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id).eq('status', 'accepted'),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id).eq('status', 'accepted'),
        supabase
          .from('prediction_saves')
          .select('created_at, predictions(*, profiles:author_id(display_name, username, avatar_url))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id)
          .eq('status', 'accepted')
          .gte('created_at', weekAgo),
        // earned_badges may not exist yet (see supabase/schema.sql) —
        // count just stays 0 until the migration runs.
        supabase.from('earned_badges').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      if (cancelled) return
      const allPredictions = predictionsRes.data || []
      setPredictions(allPredictions)
      setFollowerCount(followersRes.count ?? 0)
      setFollowingCount(followingRes.count ?? 0)
      setSavedPredictions((savesRes.data || []).map((s) => s.predictions).filter(Boolean))
      setNewFollowerCount(newFollowersRes.count ?? 0)
      setEarnedBadgeCount(earnedBadgesRes.count ?? 0)
      setSealedThisWeek(allPredictions.filter((p) => p.sealed_at && p.sealed_at >= weekAgo).length)
      setVerifiedThisWeek(allPredictions.filter((p) => p.verified_at && p.verified_at >= weekAgo).length)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const hasWeeklyActivity = sealedThisWeek > 0 || verifiedThisWeek > 0 || newFollowerCount > 0

  const sealedCount = predictions.filter((p) => p.status === 'sealed').length
  const verifiedCorrect = predictions.filter((p) => p.status === 'verified_correct')
  const verifiedIncorrect = predictions.filter((p) => p.status === 'verified_incorrect')
  const verifiedTotal = verifiedCorrect.length + verifiedIncorrect.length
  const accuracyPct = verifiedTotal > 0 ? Math.round((verifiedCorrect.length / verifiedTotal) * 100) : null

  const avgDurationDays = (() => {
    const durations = [...verifiedCorrect, ...verifiedIncorrect]
      .filter((p) => p.sealed_at && p.verified_at)
      .map((p) => (new Date(p.verified_at) - new Date(p.sealed_at)) / (1000 * 60 * 60 * 24))
    if (durations.length === 0) return null
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  })()

  const categoryAccuracy = (() => {
    const byCategory = new Map()
    for (const p of [...verifiedCorrect, ...verifiedIncorrect]) {
      const entry = byCategory.get(p.category) || { correct: 0, total: 0 }
      entry.total += 1
      if (p.status === 'verified_correct') entry.correct += 1
      byCategory.set(p.category, entry)
    }
    return Array.from(byCategory.entries()).map(([category, { correct, total }]) => ({
      category,
      pct: Math.round((correct / total) * 100),
      total,
    }))
  })()

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <ScreenHeader
        eyebrow="Profil"
        title="Kayıt defterin"
        action={
          <button
            aria-label="Uygulama ayarları"
            onClick={() => navigate('/uygulama-ayarlari')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:settings-2" class="text-[19px]"></iconify-icon>
          </button>
        }
      />

      {profile?.cover_photo_url && (
        <div className="mt-4 h-32 w-full overflow-hidden">
          <img src={profile.cover_photo_url} alt="Kapak fotoğrafı" className="h-full w-full object-cover" />
        </div>
      )}

      <main className={profile?.cover_photo_url ? '-mt-8' : 'pt-5'}>
        <section className="mx-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="h-[86px] w-[86px] overflow-hidden rounded-full border-4 border-card bg-muted shadow-md">
                <img
                  src={profile?.avatar_url || fallbackAvatarFor(profile?.id)}
                  alt={profile?.display_name || 'Profil'}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                <iconify-icon icon="lucide:badge-check" class="text-[14px]"></iconify-icon>
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-heading text-[21px] font-extrabold tracking-[-0.05em]">
                  {profile?.display_name || 'Yükleniyor…'}
                </h2>
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">
                  {profile?.points ?? 0} puan
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">@{profile?.username}</p>
            </div>
          </div>

          <p className="mt-4 max-w-[340px] text-[14px] leading-5 text-foreground">
            {profile?.bio || 'Henüz bir biyografi eklenmedi.'}
          </p>

          <div className="mt-5 flex items-center gap-5">
            <div>
              <p className="font-heading text-lg font-extrabold tracking-[-0.05em]">{followerCount ?? '—'}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Takipçi</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="font-heading text-lg font-extrabold tracking-[-0.05em]">{followingCount ?? '—'}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Takip edilen</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="font-heading text-lg font-extrabold tracking-[-0.05em]">{predictions.length}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Tahmin</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {PROFILE_SHORTCUTS.map((s, i) => (
              <button
                key={s.route}
                onClick={() => navigate(s.route)}
                className={`flex flex-col items-center gap-1.5 py-3.5 ${i > 0 ? 'border-l border-border' : ''}`}
              >
                <iconify-icon icon={s.icon} class="text-lg text-primary"></iconify-icon>
                <span className="text-[10px] font-semibold leading-tight text-foreground">{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        <BadgeShowcase slugs={profile?.showcase_badges} totalEarned={earnedBadgeCount} isOwn />

        <section className="mx-5 mt-6 overflow-hidden rounded-theme bg-primary text-primary-foreground shadow-sm">
          <div className="flex items-start justify-between px-5 pt-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary-foreground/75">
                Kalıcı performans
              </p>
              <div className="mt-1 flex items-end gap-2">
                <span className="font-heading text-[42px] font-extrabold leading-none tracking-[-0.08em]">
                  {accuracyPct !== null ? `%${accuracyPct}` : '—'}
                </span>
                <span className="mb-1 text-xs font-semibold text-primary-foreground/80">isabet oranı</span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary-foreground/25 bg-primary-foreground/10">
              <iconify-icon icon="lucide:chart-no-axes-combined" class="text-xl"></iconify-icon>
            </div>
          </div>
          <div className="mx-5 mt-5 h-px bg-primary-foreground/20" />
          <div className="grid grid-cols-3 gap-2 px-5 py-4">
            <div>
              <p className="text-[10px] font-medium text-primary-foreground/70">Açık kayıt</p>
              <p className="mt-1 text-sm font-bold">{sealedCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-primary-foreground/70">Doğrulanan</p>
              <p className="mt-1 text-sm font-bold">{verifiedTotal}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-primary-foreground/70">Ort. süre</p>
              <p className="mt-1 text-sm font-bold">{avgDurationDays !== null ? `${avgDurationDays} gün` : '—'}</p>
            </div>
          </div>
        </section>

        {hasWeeklyActivity && (
          <section className="mx-5 mt-4 rounded-theme border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-primary">
                <iconify-icon icon="lucide:calendar-clock" class="text-base"></iconify-icon>
              </span>
              <h2 className="text-sm font-bold text-foreground">Bu hafta</h2>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <p className="font-heading text-lg font-extrabold tracking-[-0.03em] text-primary">
                  {newFollowerCount}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Yeni takipçi</p>
              </div>
              <div>
                <p className="font-heading text-lg font-extrabold tracking-[-0.03em] text-primary">
                  {sealedThisWeek}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Mühürlenen</p>
              </div>
              <div>
                <p className="font-heading text-lg font-extrabold tracking-[-0.03em] text-primary">
                  {verifiedThisWeek}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Açılan</p>
              </div>
            </div>
          </section>
        )}

        {categoryAccuracy.length > 0 && (
          <section className="mt-7">
            <div className="flex items-end justify-between px-5">
              <div>
                <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Kategori doğruluğu</h2>
                <p className="mt-1 text-xs text-muted-foreground">Sonuçlanan kayıtlara göre</p>
              </div>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto px-5 pb-1">
              {categoryAccuracy.map((cat) => (
                <article key={cat.category} className="min-w-[150px] rounded-theme border border-border bg-card p-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-theme bg-secondary text-primary">
                      <iconify-icon icon={CATEGORY_ICONS[cat.category] || 'lucide:tag'} class="text-lg"></iconify-icon>
                    </span>
                    <span className="text-xs font-bold text-success">%{cat.pct}</span>
                  </div>
                  <p className="mt-4 text-sm font-bold capitalize">{cat.category}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{cat.total} sonuçlanan kayıt</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${cat.pct}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="border-b border-border px-5">
            <div className="flex items-center gap-6">
              {PROFILE_TABS.map((tab) => {
                const isActive = tab === activeTab
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm ${
                      isActive ? 'border-b-2 border-primary font-bold text-primary' : 'font-semibold text-muted-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>
          </div>

          {loading ? (
            <p className="mx-5 mt-4 text-xs text-muted-foreground">Yükleniyor…</p>
          ) : activeTab === 'Tahminlerin' ? (
            predictions.length === 0 ? (
              <div className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-6 text-center">
                <p className="text-sm font-bold text-foreground">Henüz tahminin yok</p>
                <p className="mt-1 text-xs text-muted-foreground">İlk tahminini oluştur, buradan takip et.</p>
              </div>
            ) : (
              predictions.map((p) => <OwnPredictionCard key={p.id} prediction={p} />)
            )
          ) : savedPredictions.length === 0 ? (
            <div className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-6 text-center">
              <p className="text-sm font-bold text-foreground">Henüz kaydettiğin bir kayıt yok</p>
              <p className="mt-1 text-xs text-muted-foreground">Beğendiğin tahminleri kaydet, buradan bul.</p>
            </div>
          ) : (
            savedPredictions.map((p) => <SavedPredictionCard key={p.id} prediction={p} />)
          )}
        </section>
      </main>
    </div>
  )
}
