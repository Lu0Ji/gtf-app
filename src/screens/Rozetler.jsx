import { useNavigate } from 'react-router-dom'

const SHOWCASE = [
  { icon: 'lucide:pen-line', iconTone: 'text-primary', title: 'İlk Kayıt', desc: 'İlk mühürlü tahminini yayımla.', date: '06 Oca 2026' },
  { icon: 'lucide:crosshair', iconTone: 'text-accent', title: 'İsabetli Başlangıç', desc: 'İlk doğrulanmış tahmininle eşleş.', date: '02 Şub 2026' },
  { icon: 'lucide:messages-square', iconTone: 'text-primary', title: 'Sohbete Katılan', desc: 'Bir grup tartışmasına ilk yorumunu yaz.', date: '08 Şub 2026' },
]

const GROUPS = [
  {
    key: 'baslangic',
    dot: 'bg-accent',
    title: 'Başlangıç',
    subtitle: 'Temel sosyal adımlar',
    progress: '4 / 12',
    accentClass: 'text-accent',
    badges: [
      { icon: 'lucide:pen-line', title: 'İlk Kayıt', desc: 'İlk mühürlü tahminini yayımla.', state: 'earned', date: '06 Oca 2026', showcased: true },
      { icon: 'lucide:user-plus', title: 'İlk Takip', desc: 'Bir tahminciyi takip ederek akışını oluştur.', state: 'earned', date: '06 Oca 2026', showcased: false },
      { icon: 'lucide:users-round', title: 'İlk Halka', desc: 'İlgi duyduğun bir gruba katıl.', state: 'earned', date: '07 Oca 2026', showcased: false },
      { icon: 'lucide:message-circle', title: 'İlk Yorum', desc: 'Bir tahmin veya grup sohbetine yorum yaz.', state: 'earned', date: '08 Şub 2026', showcased: true },
    ],
  },
  {
    key: 'istikrar',
    dot: 'bg-primary',
    title: 'İstikrar',
    subtitle: 'Düzenli ve güvenilir katılım',
    progress: '3 / 48',
    accentClass: 'text-primary',
    badges: [
      { icon: 'lucide:trending-up', title: 'Üçte Üç', desc: 'Arka arkaya 3 doğrulanmış tahmin yap.', state: 'earned', date: '12 Şub 2026', showcased: false },
      { icon: 'lucide:calendar-range', title: 'Düzenli Notlar', desc: '4 hafta boyunca her hafta en az bir tahmin yap.', state: 'locked', progressLabel: '2 / 4 hafta', progressNote: 'Son kayıt: bu hafta', progressPct: 50, bar: 'bg-primary' },
      { icon: 'lucide:layers-3', title: 'Geniş Açı', desc: '5 farklı kategoride tahmin yayımla.', state: 'locked', progressLabel: '3 / 5 kategori', progressNote: 'Spor · Ekonomi · Teknoloji', progressPct: 60, bar: 'bg-primary' },
    ],
  },
  {
    key: 'ustalik',
    dot: 'bg-chart2',
    title: 'Ustalık',
    subtitle: 'Derinlik, doğruluk ve uzmanlık',
    progress: '1 / 96',
    accentClass: 'text-chart2',
    badges: [
      { icon: 'lucide:target', title: 'Keskin Göz', desc: 'En az 10 kayıtta %70 doğruluk oranına ulaş.', state: 'earned', date: "14 Şub 2026 · %72 doğruluk", showcased: false },
      { icon: 'lucide:hourglass', title: 'Uzun Vade', desc: '90 gün veya daha uzun vadeli 10 tahmin aç.', state: 'locked', progressLabel: '2 / 10 tahmin', progressNote: 'En uzunu 64 gün', progressPct: 20, bar: 'bg-chart2' },
      { icon: 'lucide:circle-gauge', title: 'Kategori Uzmanı', desc: 'Tek kategoride 25 doğrulanmış kayıt biriktir.', state: 'locked', progressLabel: '8 / 25 kayıt', progressNote: 'Spor kategorisi', progressPct: 32, bar: 'bg-chart2' },
    ],
  },
  {
    key: 'efsane',
    dot: 'bg-chart4',
    title: 'Efsane',
    subtitle: 'Yıllara yayılan kalıcı başarı',
    progress: '0 / 84',
    progressMuted: true,
    accentClass: 'text-chart4',
    badges: [
      { icon: 'lucide:landmark', title: 'Zamanın Tanığı', desc: 'Üç farklı yılda doğrulanmış kayıtların olsun.', state: 'locked', progressLabel: '1 / 3 yıl', progressNote: '2026', progressPct: 33, bar: 'bg-chart4' },
      { icon: 'lucide:chart-no-axes-combined', title: 'Kalıcı Çizgi', desc: '12 ay boyunca kategori liderliğinde kal.', state: 'locked', progressLabel: '0 / 12 ay', progressNote: 'Liderlik bekliyor', progressPct: 0, bar: 'bg-chart4' },
      { icon: 'lucide:sparkles', title: 'Nadir İsabet', desc: 'Bir yıldan uzun vadeli tahminin doğrulansın.', state: 'locked', progressLabel: '0 / 1 tahmin', progressNote: 'En uzun vade: 64 gün', progressPct: 0, bar: 'bg-chart4' },
    ],
  },
]

const CATALOG_FILTERS = ['Tümü', 'Başlangıç', 'İstikrar', 'Ustalık', 'Efsane', 'Tahminler', 'Doğruluk', 'Topluluk', 'Kategoriler']

function BadgeCard({ badge, accentClass, groupLabel }) {
  return (
    <article className="rounded-theme border border-border bg-card p-3.5 shadow-sm">
      <div className="flex gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-theme text-xl ${
            badge.state === 'earned' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
          }`}
        >
          <iconify-icon icon={badge.icon}></iconify-icon>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">{badge.title}</h3>
                <span className={`text-[10px] font-semibold ${accentClass}`}>{groupLabel}</span>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{badge.desc}</p>
            </div>
            {badge.state === 'earned' ? (
              <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-success">
                <iconify-icon icon="lucide:check-circle-2" class="text-sm"></iconify-icon>Kazanıldı
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                <iconify-icon icon="lucide:lock-keyhole" class="text-sm"></iconify-icon>Kilitli
              </span>
            )}
          </div>

          {badge.state === 'earned' ? (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{badge.date}</span>
              <button className="rounded-theme bg-secondary px-2.5 py-1.5 text-[10px] font-bold text-secondary-foreground">
                {badge.showcased ? 'Sergiden kaldır' : 'Profilde sergile'}
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-foreground">{badge.progressLabel}</span>
                <span className="text-muted-foreground">{badge.progressNote}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                {badge.progressPct > 0 && (
                  <div className={`h-full rounded-full ${badge.bar}`} style={{ width: `${badge.progressPct}%` }} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default function Rozetler() {
  const navigate = useNavigate()

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
          <button
            aria-label="Rozetler hakkında"
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-muted-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:circle-help" class="text-[19px]"></iconify-icon>
          </button>
        </div>
      </header>

      <main>
        <section className="mx-5 mt-5 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
          <div className="relative overflow-hidden px-5 pb-5 pt-5">
            <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-secondary opacity-70" />
            <div className="absolute right-6 top-7 flex h-14 w-14 items-center justify-center rounded-theme border border-border bg-card text-accent shadow-sm">
              <iconify-icon icon="lucide:badge-check" class="text-[28px]"></iconify-icon>
            </div>
            <p className="relative text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground">Koleksiyonun</p>
            <div className="relative mt-2 flex items-end gap-2">
              <span className="font-heading text-[42px] font-extrabold leading-none tracking-[-0.07em] text-primary">12</span>
              <span className="mb-1 text-base font-semibold text-muted-foreground">/ 240 rozet</span>
            </div>
            <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: '5%' }} />
            </div>
            <div className="relative mt-4 flex items-start gap-2.5 border-t border-border pt-4">
              <iconify-icon icon="lucide:frames" class="mt-0.5 text-lg text-accent"></iconify-icon>
              <p className="text-[11px] leading-5 text-muted-foreground">
                Profil vitrinin için en fazla <span className="font-bold text-foreground">üç rozet</span> seçebilirsin.
                Seçtiklerin profilinde herkese görünür.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="flex items-end justify-between px-5">
            <div>
              <h1 className="font-heading text-lg font-extrabold tracking-[-0.04em]">Profil vitrini</h1>
              <p className="mt-1 text-xs text-muted-foreground">Seçtiğin rozetler profilinde sergilenir</p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">3 / 3 seçili</span>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto px-5 pb-2">
            {SHOWCASE.map((item) => (
              <article key={item.title} className="min-w-[238px] rounded-theme border border-primary bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-theme bg-secondary ${item.iconTone}`}>
                    <iconify-icon icon={item.icon} class="text-xl"></iconify-icon>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success">
                    <iconify-icon icon="lucide:pin" class="text-xs"></iconify-icon>
                    Vitrinde
                  </span>
                </div>
                <p className="mt-4 font-heading text-[15px] font-bold">{item.title}</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.desc}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[10px] text-muted-foreground">Kazanıldı · {item.date}</span>
                  <button className="text-[10px] font-bold text-primary">Sergiden kaldır</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-border pt-6">
          <div className="px-5">
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.045em]">Rozet kataloğu</h2>
            <p className="mt-1 text-xs text-muted-foreground">Kolaydan efsaneye uzanan 240 kalıcı kayıt</p>
            <label className="mt-4 flex h-11 items-center gap-3 rounded-theme border border-border bg-input px-3 text-muted-foreground shadow-sm">
              <iconify-icon icon="lucide:search" class="text-lg"></iconify-icon>
              <input
                aria-label="Rozet ara"
                type="text"
                placeholder="Rozet ara"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto px-5 pb-2">
            {CATALOG_FILTERS.map((f, i) => (
              <button
                key={f}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs ${
                  i === 0 ? 'bg-primary font-bold text-primary-foreground' : 'border border-border bg-card font-semibold text-secondary-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {GROUPS.map((group) => (
          <section key={group.key} className="mt-8 border-t border-border pt-6 last:pb-8">
            <div className="flex items-center justify-between px-5">
              <div className="flex items-center gap-2.5">
                <div className={`h-2.5 w-2.5 rounded-full ${group.dot}`} />
                <div>
                  <h2 className="font-heading text-[17px] font-bold tracking-tight">{group.title}</h2>
                  <p className="text-[10px] text-muted-foreground">{group.subtitle}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  group.progressMuted ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {group.progress}
              </span>
            </div>

            <div className="mx-5 mt-4 space-y-3">
              {group.badges.map((badge) => (
                <BadgeCard key={badge.title} badge={badge} accentClass={group.accentClass} groupLabel={group.title} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
