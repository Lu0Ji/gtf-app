import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IMG } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatDateLong, timeAgo } from '../lib/format.js'

const DEFAULT_AVATAR = IMG('a97f3f05-c665-4b5c-94c7-c83149118bc9')

const CATEGORY_ICONS = {
  spor: 'lucide:trophy',
  teknoloji: 'lucide:cpu',
  bilim: 'lucide:flask-conical',
  kültür: 'lucide:book-open',
  ekonomi: 'lucide:landmark',
  dünya: 'lucide:globe-2',
  genel: 'lucide:sparkles',
}

function PredictionCard({ prediction }) {
  const navigate = useNavigate()
  const isVerified = prediction.status === 'verified_correct' || prediction.status === 'verified_incorrect'
  const isCorrect = prediction.status === 'verified_correct'

  if (isVerified) {
    return (
      <button
        onClick={() => navigate('/tahmin-kaydi', { state: { prediction } })}
        className="mx-5 mt-3 block w-[calc(100%-40px)] overflow-hidden rounded-theme border border-border bg-card text-left shadow-sm"
      >
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
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
            {prediction.category?.toUpperCase()}
          </span>
          <p className="mt-3 text-[15px] font-semibold leading-6">&ldquo;{prediction.sealed_content}&rdquo;</p>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={() => navigate('/tahmin-kaydi', { state: { prediction } })}
      className="mx-5 mt-3 block w-[calc(100%-40px)] rounded-theme border border-border bg-card p-4 text-left shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
          {prediction.category?.toUpperCase()}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
          <iconify-icon icon="lucide:clock-3" class="text-xs"></iconify-icon>
          Mühürlü
        </span>
      </div>
      <p className="mt-3 text-[15px] font-semibold leading-6">{prediction.title}</p>
      <div className="mt-3 flex items-center justify-between rounded-theme bg-muted px-3 py-2.5">
        <div className="flex items-center gap-2">
          <iconify-icon icon="lucide:calendar-days" class="text-base text-primary"></iconify-icon>
          <span className="text-[11px] font-semibold">{formatDateLong(prediction.event_date)}'da açılacak</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{timeAgo(prediction.created_at)}</span>
      </div>
    </button>
  )
}

export default function KullaniciProfili() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const [profile, setProfile] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [followerCount, setFollowerCount] = useState(null)
  const [followingCount, setFollowingCount] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followPending, setFollowPending] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockBusy, setBlockBusy] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(true)

  // Viewing your own profile through this route just goes to the real tab.
  useEffect(() => {
    if (currentUser && userId === currentUser.id) {
      navigate('/profil', { replace: true })
    }
  }, [currentUser, userId, navigate])

  useEffect(() => {
    if (!userId || !currentUser) return
    let cancelled = false

    async function load() {
      const [profileRes, predictionsRes, followersRes, followingRes, followingMeRes, blockedRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('predictions').select('*').eq('author_id', userId).order('created_at', { ascending: false }),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted'),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId).eq('status', 'accepted'),
        supabase
          .from('follows')
          .select('status')
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId)
          .maybeSingle(),
        supabase
          .from('blocks')
          .select('*', { count: 'exact', head: true })
          .eq('blocker_id', currentUser.id)
          .eq('blocked_id', userId),
      ])
      if (cancelled) return
      setProfile(profileRes.data || null)
      setPredictions(predictionsRes.data || [])
      setFollowerCount(followersRes.count ?? 0)
      setFollowingCount(followingRes.count ?? 0)
      setIsFollowing(followingMeRes.data?.status === 'accepted')
      setFollowPending(followingMeRes.data?.status === 'pending')
      setIsBlocked((blockedRes.count ?? 0) > 0)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId, currentUser])

  async function handleToggleFollow() {
    if (followBusy) return
    setFollowBusy(true)

    if (isFollowing) {
      setIsFollowing(false)
      setFollowerCount((c) => (c ?? 0) - 1)
      const { error } = await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId)
      if (error) {
        setIsFollowing(true)
        setFollowerCount((c) => (c ?? 0) + 1)
        showToast('İşlem başarısız oldu, tekrar dene.')
      }
    } else if (followPending) {
      setFollowPending(false)
      const { error } = await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId)
      if (error) {
        setFollowPending(true)
        showToast('İşlem başarısız oldu, tekrar dene.')
      }
    } else {
      // Private accounts get force-set to 'pending' server-side by a
      // trigger, regardless of what we send here.
      const willBePending = !!profile.is_private
      if (willBePending) setFollowPending(true)
      else {
        setIsFollowing(true)
        setFollowerCount((c) => (c ?? 0) + 1)
      }
      const { error } = await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: userId })
      if (error) {
        if (willBePending) setFollowPending(false)
        else {
          setIsFollowing(false)
          setFollowerCount((c) => (c ?? 0) - 1)
        }
        showToast('İşlem başarısız oldu, tekrar dene.')
      }
    }

    setFollowBusy(false)
  }

  async function handleToggleBlock() {
    if (blockBusy) return
    setBlockBusy(true)
    setShowMenu(false)
    const nextBlocked = !isBlocked
    const { error } = nextBlocked
      ? await supabase.from('blocks').insert({ blocker_id: currentUser.id, blocked_id: userId })
      : await supabase.from('blocks').delete().eq('blocker_id', currentUser.id).eq('blocked_id', userId)
    if (error) {
      showToast('İşlem başarısız oldu, tekrar dene.')
      setBlockBusy(false)
      return
    }
    if (nextBlocked && isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId)
      setIsFollowing(false)
    }
    setIsBlocked(nextBlocked)
    setBlockBusy(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background font-body text-foreground">
        <p className="text-xs text-muted-foreground">Yükleniyor…</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-background px-8 text-center font-body text-foreground">
        <p className="text-sm font-bold">Kullanıcı bulunamadı</p>
        <button onClick={() => navigate(-1)} className="rounded-theme bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          Geri dön
        </button>
      </div>
    )
  }

  const verifiedCorrect = predictions.filter((p) => p.status === 'verified_correct')
  const verifiedIncorrect = predictions.filter((p) => p.status === 'verified_incorrect')
  const verifiedTotal = verifiedCorrect.length + verifiedIncorrect.length
  const accuracyPct = verifiedTotal > 0 ? Math.round((verifiedCorrect.length / verifiedTotal) * 100) : null

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
      <header className="relative flex items-center gap-3 px-5 pt-12">
        <button
          aria-label="Geri dön"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
        </button>
        <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-extrabold tracking-tight">
          {profile.display_name}
        </h1>
        <button
          aria-label="Seçenekler"
          onClick={() => setShowMenu((v) => !v)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:ellipsis" class="text-[19px]"></iconify-icon>
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
            <div className="absolute right-5 top-24 z-40 w-48 overflow-hidden rounded-theme border border-border bg-card shadow-lg">
              <button
                onClick={handleToggleBlock}
                disabled={blockBusy}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-destructive disabled:opacity-60"
              >
                <iconify-icon icon="lucide:ban" class="text-base"></iconify-icon>
                {isBlocked ? 'Engeli kaldır' : 'Engelle'}
              </button>
            </div>
          </>
        )}
      </header>

      {isBlocked ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 pt-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-destructive/10 text-destructive">
            <iconify-icon icon="lucide:ban" class="text-2xl"></iconify-icon>
          </div>
          <p className="text-sm font-bold">{profile.display_name} adlı hesabı engelledin</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Bu hesabın tahminlerini göremez, mesaj alamaz ve gönderemezsin.
          </p>
          <button
            onClick={handleToggleBlock}
            disabled={blockBusy}
            className="mt-2 rounded-theme border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground disabled:opacity-60"
          >
            Engeli kaldır
          </button>
        </div>
      ) : (
        <>
      {profile.cover_photo_url && (
        <div className="mt-4 h-32 w-full overflow-hidden">
          <img src={profile.cover_photo_url} alt="Kapak fotoğrafı" className="h-full w-full object-cover" />
        </div>
      )}

      <main className={profile.cover_photo_url ? '-mt-8' : 'pt-5'}>
        <section className="mx-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="h-[86px] w-[86px] overflow-hidden rounded-full border-4 border-card bg-muted shadow-md">
                <img src={profile.avatar_url || DEFAULT_AVATAR} alt={profile.display_name} className="h-full w-full object-cover" />
              </div>
              <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                <iconify-icon icon="lucide:badge-check" class="text-[14px]"></iconify-icon>
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-heading text-[21px] font-extrabold tracking-[-0.05em]">
                  {profile.display_name}
                </h2>
                {profile.is_private && (
                  <iconify-icon icon="lucide:lock" class="shrink-0 text-sm text-muted-foreground"></iconify-icon>
                )}
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">
                  {profile.points ?? 0} puan
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">@{profile.username}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleToggleFollow}
                  disabled={followBusy}
                  className={`rounded-theme px-4 py-2 text-xs font-bold disabled:opacity-60 ${
                    isFollowing || followPending ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {isFollowing ? 'Takipte' : followPending ? 'İstek gönderildi' : 'Takip et'}
                </button>
                <button
                  onClick={() => navigate('/sohbet', { state: { partner: profile } })}
                  className="flex items-center gap-1.5 rounded-theme border border-border bg-card px-4 py-2 text-xs font-bold text-foreground shadow-sm"
                >
                  <iconify-icon icon="lucide:send" class="text-sm"></iconify-icon>
                  Mesaj
                </button>
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-[340px] text-[14px] leading-5 text-foreground">
            {profile.bio || 'Henüz bir biyografi eklenmedi.'}
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
        </section>

        {accuracyPct !== null && (
          <section className="mx-5 mt-6 overflow-hidden rounded-theme bg-primary text-primary-foreground shadow-sm">
            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary-foreground/75">
                  Kalıcı performans
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="font-heading text-[42px] font-extrabold leading-none tracking-[-0.08em]">
                    %{accuracyPct}
                  </span>
                  <span className="mb-1 text-xs font-semibold text-primary-foreground/80">isabet oranı</span>
                </div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary-foreground/25 bg-primary-foreground/10">
                <iconify-icon icon="lucide:chart-no-axes-combined" class="text-xl"></iconify-icon>
              </div>
            </div>
          </section>
        )}

        {categoryAccuracy.length > 0 && (
          <section className="mt-7">
            <div className="flex items-end justify-between px-5">
              <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Kategori doğruluğu</h2>
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
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="border-b border-border px-5 pb-3">
            <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Tahminleri</h2>
          </div>

          {profile.is_private && !isFollowing ? (
            <div className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-6 text-center">
              <iconify-icon icon="lucide:lock" class="mx-auto block text-2xl text-muted-foreground"></iconify-icon>
              <p className="mt-3 text-sm font-bold text-foreground">Bu hesap gizli</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Tahminlerini görmek için takip isteği gönder.
              </p>
            </div>
          ) : predictions.length === 0 ? (
            <div className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-6 text-center">
              <p className="text-sm font-bold text-foreground">Henüz tahmini yok</p>
            </div>
          ) : (
            predictions.map((p) => <PredictionCard key={p.id} prediction={p} />)
          )}
        </section>
      </main>
        </>
      )}
    </div>
  )
}
