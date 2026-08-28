import { useNavigate } from 'react-router-dom'

function Toggle({ on }) {
  return (
    <span className={`flex h-6 w-11 items-center rounded-full p-1 ${on ? 'justify-end bg-primary' : 'bg-muted'}`}>
      <span className={`h-4 w-4 rounded-full shadow-sm ${on ? 'bg-primary-foreground' : 'bg-card'}`} />
    </span>
  )
}

function Row({ icon, iconTone = 'bg-muted text-primary', title, subtitle, right, last, badge, onClick }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`flex w-full items-center gap-3 p-4 text-left ${last ? '' : 'border-b border-border'}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-theme ${iconTone}`}>
        <iconify-icon icon={icon} class="text-lg"></iconify-icon>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-bold">
          {title}
          {badge && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold text-success">{badge}</span>
          )}
        </span>
        {subtitle && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{subtitle}</span>}
      </span>
      {right}
    </Comp>
  )
}

const ACCOUNT_ROWS = [
  { icon: 'lucide:mail', title: 'E-posta ve telefon', subtitle: 'ayse.kaya@gtf.app · +90 532 418 20 76', chevron: true },
  { icon: 'lucide:key-round', title: 'Şifre değiştir', subtitle: 'Son güncelleme 18 gün önce', chevron: true },
  { icon: 'lucide:badge-check', iconTone: 'bg-success/10 text-success', title: 'İki aşamalı doğrulama', badge: 'Açık', subtitle: 'Girişlerde ek güvenlik doğrulaması', chevron: true },
  { icon: 'lucide:monitor-smartphone', title: 'Aktif oturumlar', subtitle: '2 cihaz şu anda giriş yapmış', tag: '2', chevron: true },
  { icon: 'lucide:pause-circle', iconTone: 'bg-muted text-muted-foreground', title: 'Hesabı geçici olarak dondur', subtitle: 'Profilini ve kayıtlarını gizle', chevron: true },
]

const PRIVACY_ROWS = [
  { icon: 'lucide:user-round-lock', title: 'Gizli hesap', subtitle: 'Yalnızca onayladığın kişiler seni takip eder', toggle: false },
  { icon: 'lucide:eye', title: 'Tahminlerin görünürlüğü', subtitle: 'Herkese açık', chevron: true },
  { icon: 'lucide:radio', title: 'Çevrimiçi durumunu göster', subtitle: 'Mesajlarda aktif olduğun görünür', toggle: true },
  { icon: 'lucide:message-square-more', title: 'Mesaj istekleri', subtitle: 'Takip etmediklerinden izin iste', chevron: true },
  { icon: 'lucide:at-sign', title: 'Etiketleme', subtitle: 'Herkes seni etiketleyebilir', chevron: true },
  { icon: 'lucide:ban', title: 'Engellenen hesaplar', subtitle: '3 hesap engellendi', chevron: true },
]

const NOTIFICATION_ROWS = [
  { icon: 'lucide:heart', title: 'Beğeniler', subtitle: 'Tahmin ve yorum beğenileri', toggle: true },
  { icon: 'lucide:message-circle', title: 'Yorumlar', subtitle: 'Kayıtlarına gelen yanıtlar', toggle: true },
  { icon: 'lucide:user-plus', title: 'Yeni takipçiler', subtitle: 'Takip istekleri ve yeni bağlantılar', toggle: true },
  { icon: 'lucide:users-round', title: 'Grup etkinlikleri', subtitle: 'Takip ettiğin gruplardaki hareketler', toggle: false },
  { icon: 'lucide:send', title: 'Mesajlar', subtitle: 'Yeni mesajlar ve istekler', toggle: true },
  { icon: 'lucide:stamp', iconTone: 'bg-secondary text-accent', title: 'Mühür açılmaları', subtitle: 'Tahminlerin sonuç zamanı geldiğinde', toggle: true },
]

const CONTENT_ROWS = [
  { icon: 'lucide:tags', title: 'İlgi alanların', subtitle: 'Futbol, teknoloji, ekonomi +4', chevron: true },
  { icon: 'lucide:volume-x', title: 'Sessize alınan kelimeler', subtitle: '2 kelime gizleniyor', chevron: true },
  { icon: 'lucide:shield-alert', title: 'Hassas içerik kontrolü', subtitle: 'Sınırlandırılmış içerikleri filtrele', chevron: true },
]

const APPEARANCE_ROWS = [
  { icon: 'lucide:sun-moon', title: 'Tema', subtitle: 'Sistem ayarını kullan', chevron: true },
  { icon: 'lucide:align-left', title: 'Yazı boyutu', subtitle: 'Varsayılan', chevron: true },
  { icon: 'lucide:circle-off', title: 'Hareketleri azalt', subtitle: 'Geçiş ve animasyonları sadeleştir', toggle: false },
]

const DATA_ROWS = [
  { icon: 'lucide:download', title: 'Verilerini indir', subtitle: 'Tahminlerin ve hesap bilgilerin', chevron: true },
  { icon: 'lucide:search-x', title: 'Arama geçmişini temizle', subtitle: 'Son aramalarını kaldır', chevron: true },
  { icon: 'lucide:trash-2', title: 'Önbelleği temizle', subtitle: "Cihazında 86 MB alan aç", chevron: true },
]

const SUPPORT_ROWS = [
  { icon: 'lucide:help-circle', title: 'Yardım merkezi' },
  { icon: 'lucide:scale', title: 'Topluluk kuralları' },
  { icon: 'lucide:shield', title: 'Gizlilik politikası' },
  { icon: 'lucide:file-text', title: 'Kullanım koşulları' },
]

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-theme bg-secondary text-primary">
        <iconify-icon icon={icon} class="text-sm"></iconify-icon>
      </div>
      <div>
        <h2 className="font-heading text-[15px] font-bold tracking-tight">{title}</h2>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

function RowList({ rows }) {
  return (
    <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
      {rows.map((row, i) => (
        <Row
          key={row.title}
          icon={row.icon}
          iconTone={row.iconTone}
          title={row.title}
          subtitle={row.subtitle}
          badge={row.badge}
          last={i === rows.length - 1}
          onClick={row.chevron ? () => {} : undefined}
          right={
            row.toggle !== undefined ? (
              <Toggle on={row.toggle} />
            ) : row.tag ? (
              <>
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">{row.tag}</span>
                <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>
              </>
            ) : row.chevron ? (
              <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>
            ) : null
          }
        />
      ))}
    </div>
  )
}

export default function UygulamaAyarlari() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen w-full bg-background pb-10 text-foreground font-body">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 pb-4 pt-12 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-extrabold tracking-[-0.05em]">Uygulama ayarları</h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Hesabın, deneyimin ve verilerin senin kontrolünde.</p>
          </div>
        </div>
      </header>

      <main className="px-5 pb-8 pt-6">
        <section>
          <SectionHeader icon="lucide:shield-check" title="Hesap ve güvenlik" subtitle="Giriş bilgilerin ve hesabının güvenliği" />
          <RowList rows={ACCOUNT_ROWS} />
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:lock-keyhole" title="Gizlilik" subtitle="Kimlerin seni ve kayıtlarını görebileceği" />
          <RowList rows={PRIVACY_ROWS} />
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:bell-ring" title="Bildirimler" subtitle="Önemli gelişmeleri kaçırma" />
          <RowList rows={NOTIFICATION_ROWS} />
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:sliders-horizontal" title="İçerik tercihleri" subtitle="Akışını ilgine göre şekillendir" />
          <RowList rows={CONTENT_ROWS} />
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:languages" title="Dil ve bölge" subtitle="Uygulamayı tercih ettiğin dilde kullan" />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <Row icon="lucide:globe-2" title="Uygulama dili" subtitle="Türkçe" right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>} onClick={() => {}} />
            <Row icon="lucide:map-pinned" title="Bölge ve tarih biçimi" subtitle="Türkiye · 24 saat" right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>} onClick={() => {}} />
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">Türkçe</span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">English</span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Deutsch</span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Español</span>
              <span className="text-[10px] font-semibold text-primary">+12 dil</span>
            </div>
            <p className="px-4 py-3 text-[10px] leading-4 text-muted-foreground">
              Dil değişikliği uygulama metinlerine uygulanır; tahmin ve kullanıcı içerikleri orijinal dilinde kalır.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:palette" title="Görünüm" subtitle="Ekranı kendine uygun hale getir" />
          <RowList rows={APPEARANCE_ROWS} />
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:database" title="Veri kullanımı" subtitle="Verilerin ve cihaz depolaman" />
          <RowList rows={DATA_ROWS} />
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:circle-help" title="Destek ve yasal" subtitle="GTF hakkında daha fazlası" />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {SUPPORT_ROWS.map((row, i) => (
              <button
                key={row.title}
                className={`flex w-full items-center gap-3 p-4 text-left ${i < SUPPORT_ROWS.length - 1 ? 'border-b border-border' : ''}`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-theme bg-muted text-primary">
                  <iconify-icon icon={row.icon} class="text-lg"></iconify-icon>
                </span>
                <span className="flex-1 text-sm font-bold">{row.title}</span>
                <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <button className="flex w-full items-center gap-3 rounded-theme border border-border bg-card p-4 text-left shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:log-out" class="text-lg"></iconify-icon>
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">Çıkış yap</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">Bu cihazdaki oturumunu kapat</span>
            </span>
            <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>
          </button>
        </section>

        <section className="mt-8 rounded-theme border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-destructive/10 text-destructive">
              <iconify-icon icon="lucide:triangle-alert" class="text-lg"></iconify-icon>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-[15px] font-bold text-destructive">Tehlikeli bölge</h2>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Hesabını silmek tüm tahmin geçmişini, bağlantılarını ve verilerini kalıcı olarak kaldırır.
              </p>
              <button className="mt-4 flex items-center gap-2 rounded-theme border border-destructive/40 bg-card px-3 py-2.5 text-xs font-bold text-destructive">
                <iconify-icon icon="lucide:trash-2" class="text-sm"></iconify-icon>
                Hesabımı sil
              </button>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-[10px] font-medium text-muted-foreground">GTF · Sürüm 2.6.1</p>
      </main>
    </div>
  )
}
