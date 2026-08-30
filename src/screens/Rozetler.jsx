import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const BADGE_GROUPS = ['Üretkenlik', 'Doğruluk', 'Sosyal', 'Topluluk']

function BadgeCard({ badge }) {
  return (
    <article className="rounded-theme border border-border bg-card p-3.5 shadow-sm">
      <div className="flex gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-theme text-xl ${
            badge.earned ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
          }`}
        >
          <iconify-icon icon={badge.icon}></iconify-icon>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">{badge.title}</h3>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{badge.desc}</p>
            </div>
            {badge.earned ? (
              <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-success">
                <iconify-icon icon="lucide:check-circle-2" class="text-sm"></iconify-icon>Kazanıldı
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                <iconify-icon icon="lucide:lock-keyhole" class="text-sm"></iconify-icon>Kilitli
              </span>
            )}
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-foreground">
                {badge.progressCurrent} / {badge.progressTarget}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${badge.earned ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, (badge.progressCurrent / badge.progressTarget) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function Rozetler() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !profile) return
    let cancelled = false

    async function load() {
      const [
        { data: predictions },
        { count: groupCount },
        { count: groupsCreated },
        { count: followerCount },
        { count: commentCount },
        { count: earlierSignups },
      ] = await Promise.all([
        supabase.from('predictions').select('id, category, status, verified_at').eq('author_id', user.id),
        supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('groups').select('*', { count: 'exact', head: true }).eq('created_by', user.id),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id)
          .eq('status', 'accepted'),
        supabase.from('prediction_comments').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).lt('created_at', profile.created_at),
      ])
      if (cancelled) return

      const predictionIds = (predictions || []).map((p) => p.id)
      const { count: likesReceived } =
        predictionIds.length > 0
          ? await supabase
              .from('prediction_likes')
              .select('*', { count: 'exact', head: true })
              .in('prediction_id', predictionIds)
          : { count: 0 }
      if (cancelled) return

      const total = predictions?.length || 0
      const categories = new Set((predictions || []).map((p) => p.category)).size
      const verifiedCorrect = (predictions || []).filter((p) => p.status === 'verified_correct').length
      const verifiedIncorrect = (predictions || []).filter((p) => p.status === 'verified_incorrect').length
      const verifiedTotal = verifiedCorrect + verifiedIncorrect
      const accuracy = verifiedTotal > 0 ? (verifiedCorrect / verifiedTotal) * 100 : 0
      const groups = groupCount || 0
      const followers = followerCount || 0
      const comments = commentCount || 0
      const likes = likesReceived || 0
      const groupsFounded = groupsCreated || 0
      const isEarlyMember = (earlierSignups || 0) < 100

      // Longest run of consecutive "doğru" verifications, in resolution order.
      const resolved = (predictions || [])
        .filter((p) => p.status === 'verified_correct' || p.status === 'verified_incorrect')
        .sort((a, b) => new Date(a.verified_at) - new Date(b.verified_at))
      let bestStreak = 0
      let currentStreak = 0
      for (const p of resolved) {
        currentStreak = p.status === 'verified_correct' ? currentStreak + 1 : 0
        bestStreak = Math.max(bestStreak, currentStreak)
      }

      setBadges([
        // Üretkenlik
        {
          group: 'Üretkenlik',
          icon: 'lucide:pen-line',
          title: 'İlk Kayıt',
          desc: 'İlk mühürlü tahminini yayımla.',
          earned: total >= 1,
          progressCurrent: Math.min(total, 1),
          progressTarget: 1,
        },
        {
          group: 'Üretkenlik',
          icon: 'lucide:layers-3',
          title: 'Beş Tahmin',
          desc: '5 tahmin oluştur.',
          earned: total >= 5,
          progressCurrent: Math.min(total, 5),
          progressTarget: 5,
        },
        {
          group: 'Üretkenlik',
          icon: 'lucide:trending-up',
          title: 'On Tahmin',
          desc: '10 tahmin oluştur.',
          earned: total >= 10,
          progressCurrent: Math.min(total, 10),
          progressTarget: 10,
        },
        {
          group: 'Üretkenlik',
          icon: 'lucide:layers',
          title: 'Elli Tahmin',
          desc: '50 tahmin oluştur.',
          earned: total >= 50,
          progressCurrent: Math.min(total, 50),
          progressTarget: 50,
        },
        {
          group: 'Üretkenlik',
          icon: 'lucide:compass',
          title: 'Geniş Açı',
          desc: '3 farklı kategoride tahmin yayımla.',
          earned: categories >= 3,
          progressCurrent: Math.min(categories, 3),
          progressTarget: 3,
        },
        // Doğruluk
        {
          group: 'Doğruluk',
          icon: 'lucide:badge-check',
          title: 'İlk Doğrulama',
          desc: 'İlk tahminin sonuçlansın.',
          earned: verifiedTotal >= 1,
          progressCurrent: Math.min(verifiedTotal, 1),
          progressTarget: 1,
        },
        {
          group: 'Doğruluk',
          icon: 'lucide:target',
          title: 'Keskin Göz',
          desc: 'En az 5 sonuçlanan tahminde %70+ doğruluk oranına ulaş.',
          earned: verifiedTotal >= 5 && accuracy >= 70,
          progressCurrent: Math.min(verifiedTotal, 5),
          progressTarget: 5,
        },
        {
          group: 'Doğruluk',
          icon: 'lucide:sparkles',
          title: 'Kahin',
          desc: 'En az 10 sonuçlanan tahminde %90+ doğruluk oranına ulaş.',
          earned: verifiedTotal >= 10 && accuracy >= 90,
          progressCurrent: Math.min(verifiedTotal, 10),
          progressTarget: 10,
        },
        {
          group: 'Doğruluk',
          icon: 'lucide:flame',
          title: 'Seri Kahin',
          desc: 'Üst üste 5 tahminini doğru çıkar.',
          earned: bestStreak >= 5,
          progressCurrent: Math.min(bestStreak, 5),
          progressTarget: 5,
        },
        // Sosyal
        {
          group: 'Sosyal',
          icon: 'lucide:user-plus',
          title: 'İlk Takipçi',
          desc: 'En az bir takipçin olsun.',
          earned: followers >= 1,
          progressCurrent: Math.min(followers, 1),
          progressTarget: 1,
        },
        {
          group: 'Sosyal',
          icon: 'lucide:star',
          title: 'Tanınan İsim',
          desc: '25 takipçiye ulaş.',
          earned: followers >= 25,
          progressCurrent: Math.min(followers, 25),
          progressTarget: 25,
        },
        {
          group: 'Sosyal',
          icon: 'lucide:heart',
          title: 'Beğenilen',
          desc: 'Tahminlerine toplam 25 beğeni topla.',
          earned: likes >= 25,
          progressCurrent: Math.min(likes, 25),
          progressTarget: 25,
        },
        {
          group: 'Sosyal',
          icon: 'lucide:message-circle',
          title: 'Sohbetçi',
          desc: '10 yorum yaz.',
          earned: comments >= 10,
          progressCurrent: Math.min(comments, 10),
          progressTarget: 10,
        },
        // Topluluk
        {
          group: 'Topluluk',
          icon: 'lucide:users-round',
          title: 'Topluluk Üyesi',
          desc: 'Bir gruba katıl.',
          earned: groups >= 1,
          progressCurrent: Math.min(groups, 1),
          progressTarget: 1,
        },
        {
          group: 'Topluluk',
          icon: 'lucide:handshake',
          title: 'Sosyal Kelebek',
          desc: '3 farklı gruba katıl.',
          earned: groups >= 3,
          progressCurrent: Math.min(groups, 3),
          progressTarget: 3,
        },
        {
          group: 'Topluluk',
          icon: 'lucide:crown',
          title: 'Kurucu',
          desc: 'Kendi grubunu kur.',
          earned: groupsFounded >= 1,
          progressCurrent: Math.min(groupsFounded, 1),
          progressTarget: 1,
        },
        {
          group: 'Topluluk',
          icon: 'lucide:rocket',
          title: 'Öncü Üye',
          desc: "GTF'e katılan ilk 100 kişiden biri ol.",
          earned: isEarlyMember,
          progressCurrent: isEarlyMember ? 1 : 0,
          progressTarget: 1,
        },
      ])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, profile])

  const earnedCount = badges.filter((b) => b.earned).length

  return (
    <div className="min-h-screen w-full bg-background pb-10 text-foreground font-body">
      <header className="border-b border-border bg-background px-5 pb-5 pt-12">
        <div className="flex items-center justify-between">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <div className="text-center">
            <p className="font-heading text-lg font-extrabold tracking-[-0.045em]">Rozetler</p>
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Kalıcı başarı kayıtların</p>
          </div>
          <div className="h-10 w-10" />
        </div>
      </header>

      <main>
        {loading ? (
          <p className="px-5 py-6 text-xs text-muted-foreground">Yükleniyor…</p>
        ) : (
          <>
            <section className="mx-5 mt-5 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
              <div className="relative overflow-hidden px-5 pb-5 pt-5">
                <div className="absolute right-6 top-7 flex h-14 w-14 items-center justify-center rounded-theme border border-border bg-card text-accent shadow-sm">
                  <iconify-icon icon="lucide:badge-check" class="text-[28px]"></iconify-icon>
                </div>
                <p className="relative text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground">Koleksiyonun</p>
                <div className="relative mt-2 flex items-end gap-2">
                  <span className="font-heading text-[42px] font-extrabold leading-none tracking-[-0.07em] text-primary">
                    {earnedCount}
                  </span>
                  <span className="mb-1 text-base font-semibold text-muted-foreground">/ {badges.length} rozet</span>
                </div>
                <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(earnedCount / badges.length) * 100}%` }}
                  />
                </div>
              </div>
            </section>

            <section className="mt-8 px-5 pb-8">
              <h2 className="font-heading text-xl font-extrabold tracking-[-0.045em]">Rozet kataloğu</h2>
              <p className="mt-1 text-xs text-muted-foreground">Gerçek tahmin, sosyal ve grup etkinliğinden türetilir</p>

              {BADGE_GROUPS.map((group) => {
                const groupBadges = badges.filter((b) => b.group === group)
                if (groupBadges.length === 0) return null
                return (
                  <div key={group} className="mt-6 first:mt-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">{group}</h3>
                    <div className="mt-3 space-y-3">
                      {groupBadges.map((badge) => (
                        <BadgeCard key={badge.title} badge={badge} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
