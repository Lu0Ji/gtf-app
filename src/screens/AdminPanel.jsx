import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useOnlineUsers } from '../contexts/PresenceContext.jsx'
import { fallbackAvatarFor } from '../lib/images.js'
import { CATEGORY_META } from '../lib/categories.js'
import { timeAgo } from '../lib/format.js'
import DetailHeader from '../components/ui/DetailHeader.jsx'

// Kullanıcı geri bildirimi: "admin paneli de lazım şimdi kaç kişi
// kullanıyor anlık online kaç kişi, şikayet, istek falan var mı gibi bir
// şeyler." Şikayet/istek tarafı şu an tek gerçek veri kaynağı
// prediction_disputes (bir tahminin doğrulama sonucuna itiraz) — genel bir
// "raporla" veya geri bildirim gönderme mekanizması henüz yok, o yüzden
// burada yalnızca gerçekten var olan veri gösteriliyor.
//
// Erişim: profiles.is_admin (yeni, global — group_members.role='admin' ile
// karıştırılmasın, o sadece bir grubun içinde geçerli). Bu bayrak normal
// bir profil güncellemesiyle asla değişemez (protect_profile_integrity
// tetikleyicisi engelliyor, bkz. schema.sql) — yalnızca doğrudan SQL ile
// tanımlanabiliyor. Route App.jsx'te herkese açık ama içerik tamamen bu
// kontrole bağlı; profile yüklenene kadar kısa bir yükleniyor durumu var.
export default function AdminPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()
  const onlineIds = useOnlineUsers()
  const [stats, setStats] = useState(null)
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.is_admin) return
    let cancelled = false

    async function load() {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)

      const [
        totalUsersRes,
        newTodayRes,
        totalPredictionsRes,
        sealedRes,
        verifiedRes,
        totalGroupsRes,
        recentSignupsRes,
        disputesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('predictions').select('*', { count: 'exact', head: true }),
        supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('status', 'sealed'),
        supabase.from('predictions').select('*', { count: 'exact', head: true }).in('status', ['verified_correct', 'verified_incorrect']),
        supabase.from('groups').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('prediction_disputes')
          .select('prediction_id, user_id, created_at, disputer:user_id(display_name, username, avatar_url), prediction:prediction_id(id, title, status, category, event_date, author:author_id(display_name, username))')
          .order('created_at', { ascending: false })
          .limit(50),
      ])
      if (cancelled) return

      // Last 7 days, bucketed by local day — same client-side aggregation
      // shape peopleSuggestions.js already uses instead of a DB-side
      // group-by, since the row count here is always small.
      const dayBuckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(todayStart.getTime() - (6 - i) * 86400000)
        return { date: d, count: 0 }
      })
      for (const row of recentSignupsRes.data || []) {
        const rowDate = new Date(row.created_at)
        rowDate.setHours(0, 0, 0, 0)
        const bucket = dayBuckets.find((b) => b.date.getTime() === rowDate.getTime())
        if (bucket) bucket.count++
      }

      setStats({
        totalUsers: totalUsersRes.count || 0,
        newToday: newTodayRes.count || 0,
        totalPredictions: totalPredictionsRes.count || 0,
        sealed: sealedRes.count || 0,
        verified: verifiedRes.count || 0,
        totalGroups: totalGroupsRes.count || 0,
        dayBuckets,
      })
      setDisputes(disputesRes.data || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profile])

  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background font-body text-foreground">
        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!profile?.is_admin) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-background px-8 text-center font-body text-foreground">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <iconify-icon icon="lucide:shield-off" class="text-xl"></iconify-icon>
        </span>
        <p className="text-sm font-bold">{t('admin.notAuthorizedTitle')}</p>
        <button onClick={() => navigate('/')} className="rounded-theme bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          {t('admin.backHomeCta')}
        </button>
      </div>
    )
  }

  const maxDayCount = Math.max(1, ...(stats?.dayBuckets.map((b) => b.count) || [1]))

  return (
    <div className="min-h-screen w-full bg-background pb-10 text-foreground font-body">
      <DetailHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />

      <main className="px-5 pb-8 pt-6">
        {loading || !stats ? (
          <p className="text-center text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-theme border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <iconify-icon icon="lucide:users" class="text-sm"></iconify-icon>
                  <p className="text-[11px] font-semibold">{t('admin.totalUsers')}</p>
                </div>
                <p className="mt-2 font-heading text-2xl font-extrabold tracking-[-0.04em]">{stats.totalUsers}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{t('admin.newToday', { count: stats.newToday })}</p>
              </div>
              <div className="rounded-theme border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <p className="text-[11px] font-semibold text-muted-foreground">{t('admin.onlineNow')}</p>
                </div>
                <p className="mt-2 font-heading text-2xl font-extrabold tracking-[-0.04em]">{onlineIds.size}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{t('admin.onlineNowHint')}</p>
              </div>
              <div className="rounded-theme border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <iconify-icon icon="lucide:lock-keyhole" class="text-sm"></iconify-icon>
                  <p className="text-[11px] font-semibold">{t('admin.totalPredictions')}</p>
                </div>
                <p className="mt-2 font-heading text-2xl font-extrabold tracking-[-0.04em]">{stats.totalPredictions}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t('admin.sealedVerifiedBreakdown', { sealed: stats.sealed, verified: stats.verified })}
                </p>
              </div>
              <div className="rounded-theme border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <iconify-icon icon="lucide:users-round" class="text-sm"></iconify-icon>
                  <p className="text-[11px] font-semibold">{t('admin.totalGroups')}</p>
                </div>
                <p className="mt-2 font-heading text-2xl font-extrabold tracking-[-0.04em]">{stats.totalGroups}</p>
              </div>
            </section>

            <section className="mt-6 rounded-theme border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-bold">{t('admin.signupsLast7Days')}</h2>
              <div className="mt-4 flex items-end justify-between gap-2">
                {stats.dayBuckets.map((bucket, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-foreground">{bucket.count}</span>
                    <div
                      className="w-full rounded-theme bg-primary"
                      style={{ height: `${Math.max(6, (bucket.count / maxDayCount) * 64)}px` }}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {bucket.date.toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-primary">
                  <iconify-icon icon="lucide:flag" class="text-base"></iconify-icon>
                </span>
                <div>
                  <h2 className="text-base font-bold tracking-[-0.02em]">{t('admin.disputesTitle')}</h2>
                  <p className="text-[11px] text-muted-foreground">{t('admin.disputesSubtitle')}</p>
                </div>
              </div>

              {disputes.length === 0 ? (
                <div className="mt-3 rounded-theme border border-dashed border-border bg-muted/60 p-6 text-center">
                  <p className="text-xs text-muted-foreground">{t('admin.disputesEmpty')}</p>
                </div>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {disputes.map((d) => {
                    const p = d.prediction
                    const categoryMeta = p ? CATEGORY_META[p.category] : null
                    return (
                      <button
                        key={`${d.prediction_id}-${d.user_id}`}
                        onClick={() => p && navigate('/tahmin-kaydi', { state: { prediction: p } })}
                        disabled={!p}
                        className="flex w-full flex-col gap-2 rounded-theme border border-border bg-card p-3.5 text-left shadow-sm disabled:opacity-60"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
                            <img
                              src={d.disputer?.avatar_url || fallbackAvatarFor(d.user_id)}
                              alt={d.disputer?.display_name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">
                            {t('admin.disputedBy', { name: d.disputer?.display_name || t('common.unknownUser') })} · {timeAgo(d.created_at)}
                          </p>
                        </div>
                        {p ? (
                          <>
                            <p className="text-sm font-bold leading-5">{p.title}</p>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              {categoryMeta && (
                                <span className="rounded-full bg-muted px-2 py-0.5 font-bold text-primary">
                                  {t(categoryMeta.labelKey).toUpperCase()}
                                </span>
                              )}
                              <span>
                                {t('admin.byAuthor', { name: p.author?.display_name || t('common.unknownUser') })}
                              </span>
                              <span
                                className={p.status === 'verified_correct' ? 'font-bold text-success' : 'font-bold text-destructive'}
                              >
                                {p.status === 'verified_correct' ? t('home.verified') : t('home.notRealized')}
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs italic text-muted-foreground">{t('admin.disputedPredictionDeleted')}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
