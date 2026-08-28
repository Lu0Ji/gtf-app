import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'

const FILTERS = ['Tümü', 'Beğeniler', 'Yorumlar', 'Kaydedilenler', 'Takipler', 'Gruplar', 'Tahminler']

function DayDivider({ label }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</h2>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

function AvatarNode({ imageId, alt }) {
  return (
    <div className="relative z-10 h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-card shadow-sm">
      <img src={IMG(imageId)} alt={alt} className="h-full w-full object-cover" />
    </div>
  )
}

function IconNode({ icon, tone }) {
  return (
    <div className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-theme shadow-sm ${tone}`}>
      <iconify-icon icon={icon} class="text-xl"></iconify-icon>
    </div>
  )
}

export default function Hareketler() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen w-full bg-background pb-10 text-foreground font-body">
      <header className="border-b border-border bg-background px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <div className="text-center">
            <h1 className="font-heading text-xl font-extrabold tracking-[-0.05em]">Hareketler</h1>
            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Kalıcı etkinlik kaydın</p>
          </div>
          <button
            aria-label="Hareketleri filtrele"
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:sliders-horizontal" class="text-[19px]"></iconify-icon>
          </button>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-card py-3">
          <div className="flex gap-2 overflow-x-auto px-5 pb-1">
            {FILTERS.map((f, i) => (
              <button
                key={f}
                className={`shrink-0 rounded-full px-4 py-2 text-xs ${
                  i === 0
                    ? 'bg-primary font-bold text-primary-foreground'
                    : 'border border-border bg-background font-semibold text-secondary-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        <section className="px-5 pt-6">
          <DayDivider label="Bugün" />

          <div className="mt-4">
            <article className="relative flex gap-3 pb-5">
              <AvatarNode imageId="33414019-cca4-4124-bd30-95b304244291" alt="Derya Aras" />
              <div className="absolute left-[21px] top-11 h-[calc(100%-27px)] w-px bg-border" />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] leading-5 text-foreground">
                    <span className="font-bold">Derya Aras</span> tahminini beğendi.
                  </p>
                  <time className="shrink-0 text-[10px] text-muted-foreground">10:42</time>
                </div>
                <div className="mt-2 rounded-theme border border-border bg-card p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-secondary px-2 py-1 text-[9px] font-bold text-secondary-foreground">EKONOMİ</span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                      <iconify-icon icon="lucide:badge-check" class="text-xs"></iconify-icon>
                      Doğrulandı
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] font-semibold leading-5">
                    &ldquo;TCMB politika faizini ocak sonunda sabit tutacak.&rdquo;
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">28 gün önce mühürlendi · Sonuç eşleşti</p>
                </div>
              </div>
            </article>

            <article className="relative flex gap-3 pb-5">
              <IconNode icon="lucide:bookmark-check" tone="bg-secondary text-primary" />
              <div className="absolute left-[21px] top-11 h-[calc(100%-27px)] w-px bg-border" />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] leading-5 text-foreground">
                    <span className="font-bold">Bir tahmini kaydettin.</span>
                  </p>
                  <time className="shrink-0 text-[10px] text-muted-foreground">09:18</time>
                </div>
                <div className="mt-2 rounded-theme border border-border bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-card px-2 py-1 text-[9px] font-bold text-primary">TEKNOLOJİ</span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
                      <iconify-icon icon="lucide:stamp" class="text-xs"></iconify-icon>
                      Mühürlü
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] font-semibold leading-5">
                    Yapay zekâ destekli ilk telefon asistanı bu yıl içinde Türkçe çalışacak.
                  </p>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <p className="text-[10px] text-muted-foreground">12 Mart 2026'da açılacak</p>
                    <button className="flex items-center gap-1 text-[10px] font-bold text-destructive">
                      <iconify-icon icon="lucide:bookmark-minus" class="text-sm"></iconify-icon>
                      Kaldır
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <article className="relative flex gap-3 pb-5">
              <AvatarNode imageId="ce3f5180-4305-4784-b83c-757267de5e41" alt="Emir Can" />
              <div className="absolute left-[21px] top-11 h-[calc(100%-27px)] w-px bg-border" />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] leading-5 text-foreground">
                    <span className="font-bold">Emir Can'ın</span> tahminine yorum yaptın.
                  </p>
                  <time className="shrink-0 text-[10px] text-muted-foreground">08:56</time>
                </div>
                <div className="mt-2 rounded-theme border border-border bg-card p-3 shadow-sm">
                  <p className="text-[11px] leading-4 text-muted-foreground">Yorumun</p>
                  <p className="mt-1 text-[12px] font-medium leading-5 text-foreground">
                    &ldquo;İkinci yarı vurgusu bence de belirleyici olacak.&rdquo;
                  </p>
                  <div className="mt-2 border-t border-border pt-2">
                    <p className="line-clamp-1 text-[10px] text-muted-foreground">
                      Bu akşamki derbide ilk golün ikinci yarıda geleceğini düşünüyorum.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <article className="relative flex gap-3 pb-1">
              <IconNode icon="lucide:stamp" tone="bg-primary text-primary-foreground" />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] leading-5 text-foreground">
                    <span className="font-bold">Tahminini mühürledin.</span>
                  </p>
                  <time className="shrink-0 text-[10px] text-muted-foreground">08:31</time>
                </div>
                <div className="mt-2 rounded-theme border border-border bg-muted p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-primary">
                      <iconify-icon icon="lucide:calendar-days" class="text-sm"></iconify-icon>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold">26 Şubat 2026'da açılacak</p>
                      <p className="text-[10px] text-muted-foreground">Kayıt oluşturuldu · İçerik gizli</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="px-5 pt-7">
          <DayDivider label="Dün" />

          <div className="mt-4">
            <article className="relative flex gap-3 pb-5">
              <AvatarNode imageId="69b4851e-c268-4eb9-8840-9bbd50538a80" alt="İpek Akın" />
              <div className="absolute left-[21px] top-11 h-[calc(100%-27px)] w-px bg-border" />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] leading-5 text-foreground">
                    <span className="font-bold">İpek Akın'ı</span> takip etmeye başladın.
                  </p>
                  <time className="shrink-0 text-[10px] text-muted-foreground">Dün · 18:24</time>
                </div>
                <div className="mt-2 flex items-center gap-3 rounded-theme border border-border bg-card p-3 shadow-sm">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                    <img src={IMG('de817413-223f-4c96-b588-1e579641e944')} alt="İpek Akın" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold">İpek Akın</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Teknoloji · %74 isabet</p>
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-1.5 text-[10px] font-bold text-secondary-foreground">Takipte</span>
                </div>
              </div>
            </article>

            <article className="relative flex gap-3 pb-5">
              <IconNode icon="lucide:users-round" tone="bg-secondary text-primary" />
              <div className="absolute left-[21px] top-11 h-[calc(100%-27px)] w-px bg-border" />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] leading-5 text-foreground">
                    <span className="font-bold">Derbi Odası</span> grubuna katıldın.
                  </p>
                  <time className="shrink-0 text-[10px] text-muted-foreground">Dün · 15:10</time>
                </div>
                <div className="mt-2 flex items-center gap-3 rounded-theme border border-border bg-card p-3 shadow-sm">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-theme">
                    <img src={IMG('6e7c5d6e-6d48-4e1e-bf17-14fe96029c9b')} alt="Derbi Odası" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold">Derbi Odası</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Futbol · 1.248 üye</p>
                    <p className="mt-1 text-[10px] font-medium text-primary">34 yeni yorum seni bekliyor</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="relative flex gap-3 pb-1">
              <IconNode icon="lucide:check-circle-2" tone="bg-success text-success-foreground" />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] leading-5 text-foreground">
                    <span className="font-bold">Bir tahminin doğrulandı.</span>
                  </p>
                  <time className="shrink-0 text-[10px] text-muted-foreground">Dün · 11:05</time>
                </div>
                <div className="mt-2 rounded-theme border border-border bg-card shadow-sm">
                  <div className="flex items-center justify-between bg-success px-3 py-2 text-success-foreground">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold">
                      <iconify-icon icon="lucide:badge-check" class="text-sm"></iconify-icon>Sonuç eşleşti
                    </span>
                    <span className="text-[10px] font-semibold">+1 isabet</span>
                  </div>
                  <div className="p-3">
                    <p className="text-[12px] font-semibold leading-5">&ldquo;Ocak sonunda politika faizi sabit kalacak.&rdquo;</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">28 gün önce mühürlendi · Açıldı</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="px-5 pt-7">
          <DayDivider label="14 Şubat 2026" />

          <article className="mt-4 flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-muted text-muted-foreground">
              <iconify-icon icon="lucide:message-circle" class="text-xl"></iconify-icon>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] leading-5 text-foreground">
                  <span className="font-bold">Geleceğin Teknolojisi</span> grubunda bir sohbete yanıt verdin.
                </p>
                <time className="shrink-0 text-[10px] text-muted-foreground">14 Şub · 21:17</time>
              </div>
              <div className="mt-2 rounded-theme bg-muted px-3 py-2.5">
                <p className="text-[11px] font-semibold text-foreground">
                  &ldquo;Cihaz üzerindeki modeller gizlilik açısından daha güçlü olacak.&rdquo;
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">Yapay zekâ cihazları başlığı</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mx-5 mt-8 border-t border-border pt-5">
          <button className="flex w-full items-center justify-between rounded-theme border border-border bg-card px-4 py-3 text-left shadow-sm">
            <span>
              <span className="block text-xs font-bold text-foreground">Hareket kayıtlarını temizle</span>
              <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
                Bu işlem önce onayını ister; tahmin kayıtların korunur.
              </span>
            </span>
            <iconify-icon icon="lucide:trash-2" class="ml-3 shrink-0 text-lg text-destructive"></iconify-icon>
          </button>
          <p className="px-2 pt-3 text-center text-[10px] leading-4 text-muted-foreground">
            Tahmin oluşturma, mühürleme ve sonuç kayıtların GTF geçmişinde kalıcıdır.
          </p>
        </section>
      </main>
    </div>
  )
}
