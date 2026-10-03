import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatDateLong } from '../lib/format.js'
import { TIERS, computeBadgeStats, evaluateBadges } from '../lib/badges.js'
import { SEAL_STYLES, isSealStyleUnlocked } from '../lib/seal-styles.js'
import BadgeMedallion from '../components/BadgeMedallion.jsx'
import BadgeTierLabel from '../components/BadgeTierLabel.jsx'
import DetailHeader from '../components/ui/DetailHeader.jsx'
import Card from '../components/ui/Card.jsx'

const INITIAL_PER_TIER = 6

async function safeCount(promise) {
  try {
    const { count, error } = await promise
    return error ? 0 : count || 0
  } catch {
    return 0
  }
}

function ProgressRing({ percent }) {
  const r = 17
  const circumference = 2 * Math.PI * r
  const filled = (percent / 100) * circumference
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 44 44" className="h-16 w-16 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="var(--color-chart2)"
          strokeLinecap="round"
          strokeWidth="4"
          strokeDasharray={`${filled} ${circumference - filled}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-foreground">
        {Math.round(percent)}%
      </span>
    </div>
  )
}

function BadgeCard({ badge, tier, earnedAt, showcased, editingShowcase, onToggleShowcase }) {
  const { t } = useTranslation()
  return (
    <article className="relative rounded-theme border border-border bg-card p-3 shadow-sm">
      {editingShowcase && badge.earned && (
        <button
          onClick={() => onToggleShowcase(badge.slug)}
          aria-label={showcased ? t('badges.removeFromShowcaseAria') : t('badges.addToShowcaseAria')}
          className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full ${
            showcased ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          <iconify-icon icon={showcased ? 'lucide:star' : 'lucide:plus'} class="text-xs"></iconify-icon>
        </button>
      )}
      <div className="flex items-start justify-between">
        <BadgeMedallion icon={badge.icon} tier={tier} earned={badge.earned} size="sm" />
        {!editingShowcase && (
          <iconify-icon
            icon={badge.earned ? 'lucide:check-circle-2' : 'lucide:lock-keyhole'}
            class={`text-base ${badge.earned ? 'text-success' : 'text-muted-foreground'}`}
          ></iconify-icon>
        )}
      </div>
      <h3 className="mt-3 text-sm font-extrabold leading-4">{t(`badges.items.${badge.slug}.title`)}</h3>
      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{t(`badges.items.${badge.slug}.desc`)}</p>
      <BadgeTierLabel tier={tier} className="mt-2" />
      {badge.earned ? (
        <p className="mt-1 text-[10px] font-medium text-muted-foreground">
          {earnedAt ? formatDateLong(earnedAt) : t('badges.earnedAt')}
        </p>
      ) : (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(badge.progressCurrent / badge.progressTarget) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-bold text-muted-foreground">
            {badge.progressCurrent} / {badge.progressTarget}
          </p>
        </>
      )}
    </article>
  )
}

export default function Rozetler() {
  const { t } = useTranslation()
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [badges, setBadges] = useState([])
  const [earnedAtBySlug, setEarnedAtBySlug] = useState({})
  const [earnedThisMonth, setEarnedThisMonth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | earned | locked
  const [tierFilter, setTierFilter] = useState(null)
  const [expandedTiers, setExpandedTiers] = useState(() => new Set())
  // Mirrors profile.showcase_badges — server-persisted (see
  // supabase/schema.sql) so it actually shows up on this profile for other
  // viewers, not just this device.
  const [showcase, setShowcase] = useState([])
  const [editingShowcase, setEditingShowcase] = useState(false)
  // docs/designs/seal-customization-strategy.md — showcase_badges'le aynı
  // desen: profile'dan aynalanır, sunucuya yazılır.
  const [equippedSealStyle, setEquippedSealStyle] = useState('basic')
  const [equippingStyle, setEquippingStyle] = useState(false)

  useEffect(() => {
    setShowcase(profile?.showcase_badges || [])
  }, [profile?.showcase_badges])

  useEffect(() => {
    setEquippedSealStyle(profile?.equipped_seal_style || 'basic')
  }, [profile?.equipped_seal_style])

  useEffect(() => {
    if (!user || !profile) return
    let cancelled = false

    async function load() {
      const [predictionsRes, followersCount, followingCount, likesGivenCount, commentsGivenCount, savesCountRes, groupsJoinedCount, groupsCreatedCount, disputesRaisedCount, referralsCountRes, mentionsReceivedCount] =
        await Promise.all([
          supabase
            .from('predictions')
            .select('id, category, status, created_at, event_date, verified_at, is_private, is_sensitive, media_url, evidence_note, evidence_url, group_id')
            .eq('author_id', user.id),
          safeCount(supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id).eq('status', 'accepted')),
          safeCount(supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id).eq('status', 'accepted')),
          safeCount(supabase.from('prediction_likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id)),
          safeCount(supabase.from('prediction_comments').select('*', { count: 'exact', head: true }).eq('author_id', user.id)),
          safeCount(supabase.from('prediction_saves').select('*', { count: 'exact', head: true }).eq('user_id', user.id)),
          safeCount(supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id)),
          safeCount(supabase.from('groups').select('*', { count: 'exact', head: true }).eq('created_by', user.id)),
          safeCount(supabase.from('prediction_disputes').select('*', { count: 'exact', head: true }).eq('user_id', user.id)),
          safeCount(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', user.id)),
          safeCount(supabase.from('mentions').select('*', { count: 'exact', head: true }).eq('mentioned_user_id', user.id)),
        ])
      if (cancelled) return

      const predictions = predictionsRes.data || []
      const predictionIds = predictions.map((p) => p.id)
      const [likesReceivedCount, commentsReceivedCount] = await Promise.all([
        predictionIds.length > 0
          ? safeCount(supabase.from('prediction_likes').select('*', { count: 'exact', head: true }).in('prediction_id', predictionIds))
          : 0,
        predictionIds.length > 0
          ? safeCount(supabase.from('prediction_comments').select('*', { count: 'exact', head: true }).in('prediction_id', predictionIds))
          : 0,
      ])
      if (cancelled) return

      const stats = computeBadgeStats({
        predictions,
        profile,
        counts: {
          followers: followersCount,
          following: followingCount,
          likesGiven: likesGivenCount,
          likesReceived: likesReceivedCount,
          commentsGiven: commentsGivenCount,
          commentsReceived: commentsReceivedCount,
          savesCount: savesCountRes,
          groupsJoined: groupsJoinedCount,
          groupsCreated: groupsCreatedCount,
          disputesRaised: disputesRaisedCount,
          referralsCount: referralsCountRes,
          mentionsReceived: mentionsReceivedCount,
        },
      })

      const evaluated = evaluateBadges(stats)
      setBadges(evaluated)
      setLoading(false)

      // earned_badges is the newest migration section — table may not
      // exist yet (PGRST205), in which case dates/"bu ay" just stay empty
      // rather than blocking the rest of the screen.
      const { data: earnedRows, error: earnedError } = await supabase
        .from('earned_badges')
        .select('badge_slug, earned_at')
        .eq('user_id', user.id)
      if (cancelled || earnedError) return

      const known = new Map((earnedRows || []).map((r) => [r.badge_slug, r.earned_at]))
      const newlyEarned = evaluated.filter((b) => b.earned && !known.has(b.slug)).map((b) => b.slug)
      if (newlyEarned.length > 0) {
        await supabase
          .from('earned_badges')
          .insert(newlyEarned.map((badge_slug) => ({ user_id: user.id, badge_slug })))
          .then(() => {}, () => {})
      }

      const nowMap = { ...Object.fromEntries(known) }
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      let thisMonth = 0
      for (const slug of known.keys()) {
        if (new Date(known.get(slug)) >= startOfMonth) thisMonth++
      }
      for (const slug of newlyEarned) {
        nowMap[slug] = new Date().toISOString()
        thisMonth++
      }
      if (!cancelled) {
        setEarnedAtBySlug(nowMap)
        setEarnedThisMonth(thisMonth)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, profile])

  async function toggleShowcase(slug) {
    const prev = showcase
    if (!prev.includes(slug) && prev.length >= 3) {
      showToast(t('badges.showcaseMax'))
      return
    }
    const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    setShowcase(next)
    const { error } = await supabase.from('profiles').update({ showcase_badges: next }).eq('id', user.id)
    if (error) {
      setShowcase(prev)
      showToast(error.code === 'PGRST204' ? t('badges.showcaseFeatureDisabled') : t('badges.showcaseUpdateFailed'))
      return
    }
    refreshProfile()
  }

  async function equipSealStyle(slug) {
    if (equippingStyle || equippedSealStyle === slug) return
    const prev = equippedSealStyle
    setEquippingStyle(true)
    setEquippedSealStyle(slug)
    const { error } = await supabase.from('profiles').update({ equipped_seal_style: slug }).eq('id', user.id)
    if (error) {
      setEquippedSealStyle(prev)
      showToast(error.code === 'PGRST204' ? t('sealStyles.featureDisabled') : t('sealStyles.updateFailed'))
      setEquippingStyle(false)
      return
    }
    refreshProfile()
    setEquippingStyle(false)
  }

  const earnedCount = badges.filter((b) => b.earned).length
  const percent = badges.length > 0 ? (earnedCount / badges.length) * 100 : 0
  const showcaseBadges = showcase.map((slug) => badges.find((b) => b.slug === slug)).filter(Boolean)
  const earnedSlugSet = new Set(Object.keys(earnedAtBySlug))

  const trimmedQuery = query.trim().toLowerCase()
  const filtered = badges.filter((b) => {
    if (statusFilter === 'earned' && !b.earned) return false
    if (statusFilter === 'locked' && b.earned) return false
    if (tierFilter && b.tier !== tierFilter) return false
    if (
      trimmedQuery &&
      !t(`badges.items.${b.slug}.title`).toLowerCase().includes(trimmedQuery) &&
      !t(`badges.items.${b.slug}.desc`).toLowerCase().includes(trimmedQuery)
    )
      return false
    return true
  })
  const isFiltering = statusFilter !== 'all' || !!tierFilter || !!trimmedQuery

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body">
      <div className="pb-28">
        <DetailHeader
          title={t('badges.title')}
          subtitle={t('badges.subtitle')}
          centered
          trailing={
            <button
              aria-label={t('badges.helpAria')}
              onClick={() => showToast(t('badges.helpBody'))}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-muted-foreground shadow-sm"
            >
              <iconify-icon icon="lucide:circle-help" class="text-[19px]"></iconify-icon>
            </button>
          }
        />

        {loading ? (
          <p className="px-5 py-6 text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <main className="px-5">
            <section className="pt-5">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{t('badges.collectionSummary')}</p>
                    <h1 className="mt-1 font-heading text-[27px] font-extrabold tracking-[-0.055em]">
                      {t('badges.earnedHeading', { count: earnedCount })}
                    </h1>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t('badges.percentVerified', { total: badges.length, percent: Math.round(percent) })}
                    </p>
                  </div>
                  <ProgressRing percent={percent} />
                </div>
                <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-theme bg-muted py-3">
                  <div className="px-3">
                    <p className="text-lg font-extrabold tracking-[-0.04em]">{earnedCount}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">{t('badges.earned')}</p>
                  </div>
                  <div className="px-3">
                    <p className="text-lg font-extrabold tracking-[-0.04em]">{showcase.length}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">{t('badges.showcased')}</p>
                  </div>
                  <div className="px-3">
                    <p className="text-lg font-extrabold tracking-[-0.04em]">{earnedThisMonth}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">{t('badges.thisMonth')}</p>
                  </div>
                </div>
              </Card>
            </section>

            <section className="mt-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{t('badges.profileShowcase')}</p>
                  <h2 className="mt-1 font-heading text-xl font-extrabold tracking-[-0.04em]">{t('badges.featuredBadges')}</h2>
                </div>
                <button onClick={() => setEditingShowcase((v) => !v)} className="text-xs font-bold text-primary">
                  {editingShowcase ? t('badges.done') : t('badges.edit')}
                </button>
              </div>
              {showcaseBadges.length === 0 && !editingShowcase ? (
                <p className="mt-3 rounded-theme border border-dashed border-border bg-muted/60 p-4 text-center text-xs text-muted-foreground">
                  {t('badges.showcaseEmpty')}
                </p>
              ) : (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2 pr-5">
                  {showcaseBadges.map((badge) => {
                    const tier = TIERS.find((tr) => tr.key === badge.tier)
                    return (
                      <Card as="article" key={badge.slug} className="min-w-[202px]">
                        <div className="flex items-start justify-between">
                          <BadgeMedallion icon={badge.icon} tier={tier} earned size="md" />
                          <button aria-label={t('badges.removeFromShowcaseAria')} onClick={() => toggleShowcase(badge.slug)} className="text-muted-foreground">
                            <iconify-icon icon="lucide:x" class="text-base"></iconify-icon>
                          </button>
                        </div>
                        <p className="mt-4 font-heading text-sm font-extrabold">{t(`badges.items.${badge.slug}.title`)}</p>
                        <p className="mt-1 text-[10px] font-bold" style={{ color: tier.ink }}>
                          {t(tier.labelKey)}
                        </p>
                      </Card>
                    )
                  })}
                </div>
              )}
              {editingShowcase && (
                <p className="mt-2 text-[11px] text-muted-foreground">{t('badges.showcaseEditHint')}</p>
              )}
            </section>

            <section className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{t('sealStyles.sectionEyebrow')}</p>
              <h2 className="mt-1 font-heading text-xl font-extrabold tracking-[-0.04em]">{t('sealStyles.sectionTitle')}</h2>
              <div className="mt-3 flex gap-2.5 overflow-x-auto pb-2 pr-5">
                {SEAL_STYLES.map((style) => {
                  const unlocked = isSealStyleUnlocked(style, earnedSlugSet)
                  const isEquipped = equippedSealStyle === style.slug
                  return (
                    <button
                      key={style.slug}
                      onClick={() => unlocked && equipSealStyle(style.slug)}
                      disabled={!unlocked || equippingStyle}
                      className={`flex min-w-[128px] flex-col items-center gap-2 rounded-theme border px-4 py-3.5 text-center disabled:cursor-default ${
                        isEquipped ? 'border-primary bg-secondary' : 'border-border bg-card'
                      } ${!unlocked ? 'opacity-50' : ''}`}
                    >
                      <span className={`flex h-11 w-11 items-center justify-center rounded-theme ${style.containerClassName}`}>
                        <iconify-icon icon={unlocked ? style.lockIcon : 'lucide:lock'} class="text-lg"></iconify-icon>
                      </span>
                      <p className="text-xs font-bold">{t(style.titleKey)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground">
                        {isEquipped
                          ? t('sealStyles.equipped')
                          : unlocked
                            ? t('sealStyles.tapToEquip')
                            : t('sealStyles.lockedWithBadge', { badge: t(`badges.items.${style.unlockBadgeSlug}.title`) })}
                      </p>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="mt-6">
              <div className="flex h-12 items-center rounded-theme border border-border bg-input px-3">
                <iconify-icon icon="lucide:search" class="mr-2 text-lg text-muted-foreground"></iconify-icon>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label={t('badges.searchAria')}
                  placeholder={t('badges.searchPlaceholder')}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {[
                  { key: 'all', label: t('badges.filterAll', { count: badges.length }) },
                  { key: 'earned', label: t('badges.filterEarned', { count: earnedCount }) },
                  { key: 'locked', label: t('badges.filterLocked', { count: badges.length - earnedCount }) },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-bold ${
                      statusFilter === f.key ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-secondary-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setTierFilter(null)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${
                    !tierFilter ? 'bg-secondary text-secondary-foreground' : 'border border-border bg-card text-muted-foreground'
                  }`}
                >
                  {t('badges.allTiers')}
                </button>
                {TIERS.map((tier, rank) => (
                  <button
                    key={tier.key}
                    onClick={() => setTierFilter(tier.key)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold ${
                      tierFilter === tier.key ? 'bg-secondary text-secondary-foreground' : 'border border-border bg-card text-muted-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-0.5" aria-hidden="true">
                      {TIERS.map((_, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: i <= rank ? tier.ink : 'var(--color-muted-foreground)', opacity: i <= rank ? 1 : 0.3 }}
                        />
                      ))}
                    </span>
                    {t(tier.labelKey)}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-6 pb-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{t('badges.catalogTitle')}</p>

              {isFiltering ? (
                filtered.length === 0 ? (
                  <p className="mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-4 text-center text-xs text-muted-foreground">
                    {t('badges.noMatches')}
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {filtered.map((badge) => (
                      <BadgeCard
                        key={badge.slug}
                        badge={badge}
                        tier={TIERS.find((t) => t.key === badge.tier)}
                        earnedAt={earnedAtBySlug[badge.slug]}
                        showcased={showcase.includes(badge.slug)}
                        editingShowcase={editingShowcase}
                        onToggleShowcase={toggleShowcase}
                      />
                    ))}
                  </div>
                )
              ) : (
                TIERS.map((tier) => {
                  const tierBadges = badges.filter((b) => b.tier === tier.key)
                  const expanded = expandedTiers.has(tier.key)
                  const visible = expanded ? tierBadges : tierBadges.slice(0, INITIAL_PER_TIER)
                  const remaining = tierBadges.length - visible.length
                  return (
                    <div key={tier.key} className="mt-6 first:mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]" style={{ color: tier.ink }}>
                            {t(tier.labelKey)}
                          </h2>
                          <span className="flex items-center gap-0.5" aria-hidden="true">
                            {TIERS.map((_, i) => (
                              <span
                                key={i}
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: i <= TIERS.indexOf(tier) ? tier.ink : 'var(--color-muted)' }}
                              />
                            ))}
                          </span>
                        </div>
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                          style={{ background: tier.tint, color: tier.ink }}
                        >
                          {t('badges.badgeCount', { count: tierBadges.length })}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {visible.map((badge) => (
                          <BadgeCard
                            key={badge.slug}
                            badge={badge}
                            tier={tier}
                            earnedAt={earnedAtBySlug[badge.slug]}
                            showcased={showcase.includes(badge.slug)}
                            editingShowcase={editingShowcase}
                            onToggleShowcase={toggleShowcase}
                          />
                        ))}
                      </div>
                      {remaining > 0 && (
                        <button
                          onClick={() => setExpandedTiers((prev) => new Set(prev).add(tier.key))}
                          className="mt-3 flex w-full items-center justify-between rounded-theme border border-border bg-card px-4 py-3 text-xs font-bold text-primary"
                        >
                          {t('badges.seeMoreOfTier', { count: remaining, tier: t(tier.labelKey) })}
                          <iconify-icon icon="lucide:chevron-down" class="text-base"></iconify-icon>
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </section>
          </main>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-5 py-3 backdrop-blur-md">
        <button
          onClick={() => setEditingShowcase(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-transform duration-150 active:scale-[0.98]"
        >
          <iconify-icon icon="lucide:sliders-horizontal" class="text-lg"></iconify-icon>
          {t('badges.editViewCta')}
        </button>
      </div>
    </div>
  )
}
