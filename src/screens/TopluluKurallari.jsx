import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext.jsx'

export default function TopluluKurallari() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(`GTF Topluluk Kuralları — ${window.location.href}`)
      setCopied(true)
      showToast('Bağlantı kopyalandı, dilediğin yere yapıştır.', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Kopyalanamadı.')
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body">
      <div className="fixed inset-x-0 top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <header className="flex h-[76px] items-end justify-between px-5 pb-3">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <p className="font-heading text-sm font-extrabold tracking-[-0.02em]">Topluluk Kuralları</p>
          <button
            aria-label="Kuralları paylaş"
            onClick={handleShare}
            className="flex h-10 w-10 items-center justify-center rounded-theme text-muted-foreground"
          >
            <iconify-icon icon={copied ? 'lucide:check' : 'lucide:share-2'} class="text-[18px]"></iconify-icon>
          </button>
        </header>
      </div>

      <main className="px-5 pb-28 pt-[104px]">
        <section>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-primary">
              <iconify-icon icon="lucide:book-open-check" class="text-sm"></iconify-icon>
            </span>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">GTF topluluğu</p>
          </div>
          <h1 className="mt-4 font-heading text-[28px] font-extrabold leading-[1.1] tracking-[-0.05em]">
            Açık fikirler,
            <br />
            adil bir kayıt
          </h1>
          <p className="mt-4 max-w-[350px] text-sm leading-6 text-muted-foreground">
            GTF, geleceğe dair fikirlerin zaman damgalı ve saygılı biçimde paylaşıldığı bir topluluktur. Buradaki
            kurallar, herkese güvenli bir alan sağlamak içindir.
          </p>
          <div className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <iconify-icon icon="lucide:calendar-clock" class="text-sm text-primary"></iconify-icon>
            <span>Son güncelleme: 30 Ağustos 2026</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>v1.0</span>
          </div>
        </section>

        <section className="mt-9">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-primary text-xs font-extrabold text-primary-foreground">01</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">Tahmin dürüstlüğü</h2>
          </div>
          <div className="mt-4 border-l-2 border-primary pl-4">
            <p className="text-sm leading-6 text-foreground">
              Tahminler, gelecekte doğrulanabilir bir olay hakkında kendi gerçek görüşünü yansıtmalıdır.
            </p>
          </div>
          <ol className="mt-4 space-y-3 text-[13px] leading-5 text-muted-foreground">
            <li className="flex gap-3"><span className="font-bold text-primary">1.</span><span>Mühürlenmiş bir tahminin içeriğini açılmadan önce değiştirmeye, silmeye veya başkasının tahminini kendininmiş gibi göstermeye çalışma.</span></li>
            <li className="flex gap-3"><span className="font-bold text-primary">2.</span><span>Kesin bilgi gibi sunulan tahminlerde kaynak, bağlam ve belirsizlikleri açıkça belirt.</span></li>
            <li className="flex gap-3"><span className="font-bold text-primary">3.</span><span>Sonuç değerlendirmesinde kanıtlanabilir kaynaklara dayan; anlaşmazlıkları nazikçe ve gerekçeyle ele al. Şüphelendiğin bir sonuca itiraz edebilirsin.</span></li>
          </ol>
        </section>

        <div className="my-8 h-px bg-border" />

        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-xs font-extrabold text-secondary-foreground">02</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">Saygılı iletişim</h2>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
            Fikir ayrılığı GTF'nin doğal parçasıdır; kişilere yönelik saldırılar değildir. Herkesin güvenle katkı
            verebildiği bir dil kullan.
          </p>
          <div className="mt-4 rounded-theme bg-muted p-4">
            <div className="flex items-start gap-3">
              <iconify-icon icon="lucide:heart-handshake" class="mt-0.5 text-lg text-primary"></iconify-icon>
              <p className="text-[12px] leading-5 text-secondary-foreground">
                Taciz, tehdit, hedef gösterme, nefret söylemi ve korunan özelliklere dayalı aşağılayıcı içerik
                GTF'de kabul edilmez.
              </p>
            </div>
          </div>
        </section>

        <div className="my-8 h-px bg-border" />

        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-xs font-extrabold text-secondary-foreground">03</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">Spam ve yanıltıcı içerik</h2>
          </div>
          <ul className="mt-4 space-y-3 text-[13px] leading-5 text-muted-foreground">
            <li className="flex gap-3"><iconify-icon icon="lucide:x" class="mt-0.5 shrink-0 text-base text-destructive"></iconify-icon><span>Tekrarlayan paylaşımlar, ilgisiz bağlantılar ve takipçi kazanmak için otomatik etkileşim oluşturma.</span></li>
            <li className="flex gap-3"><iconify-icon icon="lucide:x" class="mt-0.5 shrink-0 text-base text-destructive"></iconify-icon><span>Başkasını yanıltacak biçimde düzenlenmiş veri, sahte kaynak veya bağlamından koparılmış içerik.</span></li>
            <li className="flex gap-3"><iconify-icon icon="lucide:x" class="mt-0.5 shrink-0 text-base text-destructive"></iconify-icon><span>Maddi kayıp riski taşıyan yatırım, bahis ya da sağlık tavsiyelerini kesin sonuç olarak sunmak.</span></li>
          </ul>
        </section>

        <div className="my-8 h-px bg-border" />

        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-xs font-extrabold text-secondary-foreground">04</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">Gizlilik ve telif</h2>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
            Kendine veya başkalarına ait özel bilgileri izinsiz paylaşma. Telefon numarası, adres, kimlik bilgisi,
            özel yazışma ve benzeri veriler toplulukta yer alamaz.
          </p>
          <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
            Paylaştığın görsel, metin ve bağlantılar için gerekli kullanım hakkına sahip olmalısın.
          </p>
        </section>

        <div className="my-8 h-px bg-border" />

        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-xs font-extrabold text-secondary-foreground">05</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">Grup davranışı</h2>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
            Her grubun konusu ve ek ilkeleri olabilir. Grup kurucusunun ve yöneticilerinin, bu kurallarla
            çelişmediği sürece kendi alanlarında aldığı kararlara saygı göster.
          </p>
          <div className="mt-4 flex gap-3 rounded-theme border border-border bg-card p-4">
            <iconify-icon icon="lucide:messages-square" class="mt-0.5 shrink-0 text-lg text-primary"></iconify-icon>
            <p className="text-[12px] leading-5 text-muted-foreground">
              Bir tartışma geriliyorsa yanıt vermeden önce dur, bağlamı yeniden oku ve gerekirse bildir.
            </p>
          </div>
        </section>

        <div className="my-8 h-px bg-border" />

        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-xs font-extrabold text-secondary-foreground">06</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">Yaptırımlar</h2>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
            İhlalin niteliğine ve tekrarına göre içeriğin kaldırılması, özelliklerin geçici olarak
            sınırlandırılması, grup erişiminin kaldırılması veya hesabın askıya alınması uygulanabilir.
          </p>
          <div className="mt-5 rounded-theme border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <iconify-icon icon="lucide:scale" class="text-base"></iconify-icon>
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Kararlara itiraz edebilirsin</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  Bir işlem hakkında ek bilgi veya yeniden inceleme isteği için Yardım Merkezi'nden bize ulaş.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-9 rounded-theme bg-muted p-5 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-card text-primary shadow-sm">
            <iconify-icon icon="lucide:flag" class="text-lg"></iconify-icon>
          </span>
          <h2 className="mt-3 font-heading text-base font-extrabold tracking-[-0.025em]">Bir ihlal mi gördün?</h2>
          <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
            Bildirimler gizli incelenir. Acil tehlike durumlarında yerel acil yardım hizmetleriyle iletişime geç.
          </p>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-5 pb-5 pt-3 backdrop-blur-md">
        <a
          href="mailto:aliyusufbusiness1@gmail.com?subject=GTF%20%C4%B0hlal%20Bildirimi"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:flag" class="text-base"></iconify-icon>
          İhlal bildir
        </a>
      </div>
    </div>
  )
}
