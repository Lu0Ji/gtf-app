import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatDateLong, sealLabel, timeAgo } from '../lib/format.js'
import { CATEGORY_META } from '../lib/categories.js'
import BadgeShowcase from '../components/BadgeShowcase.jsx'
import TopCategoriesShowcase from '../components/TopCategoriesShowcase.jsx'
import DifficultyChip from '../components/DifficultyChip.jsx'
import Chip from '../components/ui/Chip.jsx'
import DetailHeader from '../components/ui/DetailHeader.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'


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
  const { t } = useTranslation()
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
            {isCorrect ? t('home.verified') : t('home.notRealized')}
          </span>
          <span>{formatDateLong(prediction.verified_at)}</span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <Chip>{prediction.category?.toUpperCase()}</Chip>
            <DifficultyChip tier={prediction.difficulty_tier} />
          </div>
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
        <div className="flex items-center gap-1.5">
          <Chip>{prediction.category?.toUpperCase()}</Chip>
          <DifficultyChip tier={prediction.difficulty_tier} />
        </div>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
          <iconify-icon icon="lucide:clock-3" class="text-xs"></iconify-icon>
          {t('profile.sealedShort')}
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
    </button>
  )
}

export default function KullaniciProfili() {
  const { t } = useTranslation()
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
  const [earnedBadgeCount, setEarnedBadgeCount] = useState(0)
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
      const [profileRes, predictionsRes, followersRes, followingRes, followingMeRes, blockedRes, earnedBadgesRes] = await Promise.all([
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
        // earned_badges may not exist yet (see supabase/schema.sql) — count
        // just stays 0 until the migration runs.
        supabase.from('earned_badges').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ])
      if (cancelled) return
      setProfile(profileRes.data || null)
      setPredictions(predictionsRes.data || [])
      setFollowerCount(followersRes.count ?? 0)
      setFollowingCount(followingRes.count ?? 0)
      setIsFollowing(followingMeRes.data?.status === 'accepted')
      setFollowPending(followingMeRes.data?.status === 'pending')
      setIsBlocked((blockedRes.count ?? 0) > 0)
      setEarnedBadgeCount(earnedBadgesRes.count ?? 0)
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
        showToast(t('userProfile.actionFailed'))
      }
    } else if (followPending) {
      setFollowPending(false)
      const { error } = await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId)
      if (error) {
        setFollowPending(true)
        showToast(t('userProfile.actionFailed'))
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
        showToast(t('userProfile.actionFailed'))
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
      showToast(t('userProfile.actionFailed'))
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
        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-background px-8 text-center font-body text-foreground">
        <p className="text-sm font-bold">{t('userProfile.userNotFound')}</p>
        <button onClick={() => navigate(-1)} className="rounded-theme bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          {t('common.backAria')}
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
      <div className="relative">
        <DetailHeader
          title={profile.display_name}
          action={
            <button
              aria-label={t('userProfile.optionsAria')}
              onClick={() => setShowMenu((v) => !v)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
            >
              <iconify-icon icon="lucide:ellipsis" class="text-[19px]"></iconify-icon>
            </button>
          }
        />
        {showMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
            <div className="absolute right-5 top-[92px] z-40 w-48 overflow-hidden rounded-theme border border-border bg-card shadow-lg">
              <button
                onClick={handleToggleBlock}
                disabled={blockBusy}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-destructive disabled:opacity-60"
              >
                <iconify-icon icon="lucide:ban" class="text-base"></iconify-icon>
                {isBlocked ? t('userProfile.unblock') : t('userProfile.block')}
              </button>
            </div>
          </>
        )}
      </div>

      {isBlocked ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 pt-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-destructive/10 text-destructive">
            <iconify-icon icon="lucide:ban" class="text-2xl"></iconify-icon>
          </div>
          <p className="text-sm font-bold">{t('userProfile.blockedTitle', { name: profile.display_name })}</p>
          <p className="text-xs leading-5 text-muted-foreground">{t('userProfile.blockedBody')}</p>
          <button
            onClick={handleToggleBlock}
            disabled={blockBusy}
            className="mt-2 rounded-theme border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground disabled:opacity-60"
          >
            {t('userProfile.unblock')}
          </button>
        </div>
      ) : (
        <>
      {profile.cover_photo_url && (
        <div className="mt-4 h-32 w-full overflow-hidden">
          <img src={profile.cover_photo_url} alt={t('profile.coverAlt')} className="h-full w-full object-cover" />
        </div>
      )}

      <main className={profile.cover_photo_url ? '-mt-8' : 'pt-5'}>
        <section className="mx-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="h-[86px] w-[86px] overflow-hidden rounded-full border-4 border-card bg-muted shadow-md">
                <img src={profile.avatar_url || fallbackAvatarFor(userId)} alt={profile.display_name} className="h-full w-full object-cover" />
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
                  {isFollowing ? t('userProfile.following') : followPending ? t('userProfile.requestSent') : t('home.followAction')}
                </button>
                <button
                  onClick={() => navigate('/sohbet', { state: { partner: profile } })}
                  className="flex items-center gap-1.5 rounded-theme border border-border bg-card px-4 py-2 text-xs font-bold text-foreground shadow-sm"
                >
                  <iconify-icon icon="lucide:send" class="text-sm"></iconify-icon>
                  {t('userProfile.message')}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-[340px] text-[14px] leading-5 text-foreground">
            {profile.bio || t('profile.noBio')}
          </p>

          <div className="mt-5 flex items-center gap-5">
            <div>
              <p className="font-heading text-lg font-extrabold tracking-[-0.05em]">{followerCount ?? '—'}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t('profile.followers')}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="font-heading text-lg font-extrabold tracking-[-0.05em]">{followingCount ?? '—'}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t('profile.following')}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="font-heading text-lg font-extrabold tracking-[-0.05em]">{predictions.length}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t('profile.predictionsCount')}</p>
            </div>
          </div>
        </section>

        <BadgeShowcase slugs={profile.showcase_badges} totalEarned={earnedBadgeCount} isOwn={false} />

        <TopCategoriesShowcase predictions={predictions} />

        {accuracyPct !== null && (
          <section className="mx-5 mt-6 overflow-hidden rounded-theme bg-primary text-primary-foreground shadow-sm">
            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary-foreground/75">
                  {t('profile.permanentPerformance')}
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="font-heading text-[42px] font-extrabold leading-none tracking-[-0.08em]">
                    %{accuracyPct}
                  </span>
                  <span className="mb-1 text-xs font-semibold text-primary-foreground/80">{t('profile.accuracyRate')}</span>
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
              <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">{t('profile.categoryAccuracyTitle')}</h2>
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
                  <p className="mt-4 text-sm font-bold capitalize">{CATEGORY_META[cat.category] ? t(CATEGORY_META[cat.category].labelKey) : cat.category}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{t('profile.resolvedRecords', { count: cat.total })}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="border-b border-border px-5 pb-3">
            <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">{t('userProfile.predictionsTitle')}</h2>
          </div>

          {profile.is_private && !isFollowing ? (
            <EmptyState
              className="mx-5 mt-4"
              icon="lucide:lock"
              title={t('userProfile.privateAccountTitle')}
              description={t('userProfile.privateAccountBody')}
            />
          ) : predictions.length === 0 ? (
            <EmptyState className="mx-5 mt-4" title={t('userProfile.noPredictionsTitle')} />
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
