import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

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
  const { user } = useAuth()
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const [{ data: predictions }, { count: groupCount }] = await Promise.all([
        supabase.from('predictions').select('category, status').eq('author_id', user.id),
        supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      if (cancelled) return

      const total = predictions?.length || 0
      const categories = new Set((predictions || []).map((p) => p.category)).size
      const verifiedCorrect = (predictions || []).filter((p) => p.status === 'verified_correct').length
      const verifiedIncorrect = (predictions || []).filter((p) => p.status === 'verified_incorrect').length
      const verifiedTotal = verifiedCorrect + verifiedIncorrect
      const accuracy = verifiedTotal > 0 ? (verifiedCorrect / verifiedTotal) * 100 : 0
      const groups = groupCount || 0

      setBadges([
        {
          icon: 'lucide:pen-line',
          title: 'İlk Kayıt',
          desc: 'İlk mühürlü tahminini yayımla.',
          earned: total >= 1,
          progressCurrent: Math.min(total, 1),
          progressTarget: 1,
        },
        {
          icon: 'lucide:layers-3',
          title: 'Beş Tahmin',
          desc: '5 tahmin oluştur.',
          earned: total >= 5,
          progressCurrent: Math.min(total, 5),
          progressTarget: 5,
        },
        {
          icon: 'lucide:trending-up',
          title: 'On Tahmin',
          desc: '10 tahmin oluştur.',
          earned: total >= 10,
          progressCurrent: Math.min(total, 10),
          progressTarget: 10,
        },
        {
          icon: 'lucide:badge-check',
          title: 'İlk Doğrulama',
          desc: 'İlk tahminin sonuçlansın.',
          earned: verifiedTotal >= 1,
          progressCurrent: Math.min(verifiedTotal, 1),
          progressTarget: 1,
        },
        {
          icon: 'lucide:target',
          title: 'Keskin Göz',
          desc: 'En az 5 sonuçlanan tahminde %70+ doğruluk oranına ulaş.',
          earned: verifiedTotal >= 5 && accuracy >= 70,
          progressCurrent: Math.min(verifiedTotal, 5),
          progressTarget: 5,
        },
        {
          icon: 'lucide:compass',
          title: 'Geniş Açı',
          desc: '3 farklı kategoride tahmin yayımla.',
          earned: categories >= 3,
          progressCurrent: Math.min(categories, 3),
          progressTarget: 3,
        },
        {
          icon: 'lucide:users-round',
          title: 'Topluluk Üyesi',
          desc: 'Bir gruba katıl.',
          earned: groups >= 1,
          progressCurrent: Math.min(groups, 1),
          progressTarget: 1,
        },
        {
          icon: 'lucide:handshake',
          title: 'Sosyal Kelebek',
          desc: '3 farklı gruba katıl.',
          earned: groups >= 3,
          progressCurrent: Math.min(groups, 3),
          progressTarget: 3,
        },
      ])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

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
              <p className="mt-1 text-xs text-muted-foreground">Gerçek tahmin ve grup etkinliğinden türetilir</p>

              <div className="mt-4 space-y-3">
                {badges.map((badge) => (
                  <BadgeCard key={badge.title} badge={badge} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
