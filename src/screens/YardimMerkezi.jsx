import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TOPICS = [
  { key: 'hesap', icon: 'lucide:circle-user-round', iconTone: 'bg-secondary text-primary', title: 'Hesabın', desc: 'Erişim ve güvenlik' },
  { key: 'tahmin', icon: 'lucide:pen-line', iconTone: 'bg-secondary text-primary', title: 'Tahminler', desc: 'Oluşturma ve düzenleme' },
  { key: 'muhur', icon: 'lucide:stamp', iconTone: 'bg-[#F4E8D8] text-[#A76522]', title: 'Mühürlü kayıtlar', desc: 'Zaman damgası ve açılma' },
  { key: 'dogrulama', icon: 'lucide:badge-check', iconTone: 'bg-muted text-success', title: 'Doğrulama', desc: 'Sonuç ve itiraz' },
  { key: 'grup', icon: 'lucide:users-round', iconTone: 'bg-secondary text-primary', title: 'Gruplar', desc: 'Katılım ve kurallar' },
  { key: 'mesaj', icon: 'lucide:message-circle', iconTone: 'bg-secondary text-primary', title: 'Mesajlar', desc: 'İstekler ve sohbetler' },
]

const FAQS = [
  { topic: 'muhur', icon: 'lucide:clock-3', q: 'Tahminimi ne zaman açabilirim?', a: 'Belirlediğin açılış tarihi geçtiğinde, mühürlü kaydına gidip "Doğru çıktı" veya "Yanlış çıktı" diyerek sonucu sen işaretlersin. Tarih gelmeden içerik kimseye — sana bile — görünmez.' },
  { topic: 'dogrulama', icon: 'lucide:check-check', q: 'Bir sonucu nasıl doğrulatırım?', a: 'Şu an doğrulama tamamen beyana dayalı: yalnızca tahminin sahibi işaretler, bağımsız bir denetim yok. Başkası bir sonuca şüpheyle yaklaşırsa, kayıtta "İtiraz et" diyebilir; itiraz sayısı herkese açık şekilde gösterilir.' },
  { topic: 'tahmin', icon: 'lucide:eye-off', q: 'Tahminimi kimler görebilir?', a: 'Ayarlar → Gizlilik → Tahmin görünürlüğü\'nden "Herkese açık" veya "Yalnızca takipçilerim" seçebilirsin. Bir tahmini kimseyle paylaşmak istemiyorsan, oluştururken "Zaman kapsülü" modunu seç.' },
  { topic: 'tahmin', icon: 'lucide:archive', q: 'Zaman kapsülü ile mühürlü tahmin arasındaki fark ne?', a: 'Zaman kapsülü tamamen kişiseldir, hiç kimseyle paylaşılmaz ve kalıcı başarı istatistiklerini etkilemez. Mühürlü tahmin ise görünürlük tercihine göre başkalarıyla paylaşılır ve doğruluk oranına dahil olur.' },
  { topic: 'tahmin', icon: 'lucide:coins', q: 'Puanlarım nasıl hesaplanıyor?', a: 'Doğru çıkan bir tahmin +50 puan kazandırır, yanlış çıkan ama dürüstçe kapatılan bir tahmin +5 puan kazandırır. Doğru bir davet koduyla katılan biri hem kendine hem seni davet edene +100 puan kazandırır.' },
  { topic: 'hesap', icon: 'lucide:award', q: 'Rozetleri nasıl kazanırım?', a: 'Rozetler; tahmin sayın, doğruluk oranın, takipçi sayın, aldığın beğeni, yorum sayın ve grup etkinliğine göre otomatik hesaplanır. Profil → Rozetler\'den ilerlemeni görebilirsin.' },
  { topic: 'hesap', icon: 'lucide:trash-2', q: 'Hesabımı nasıl silerim?', a: 'Uygulama Ayarları → Tehlikeli bölge → Hesabımı sil yoluyla, hiçbir onay beklemeden, anında ve kalıcı olarak hesabını silebilirsin. Bunun yerine geçici bir ara vermek istersen, "Hesabı geçici olarak dondur" seçeneğini kullanabilirsin.' },
  { topic: 'grup', icon: 'lucide:plus', q: 'Bir grup nasıl kurulur?', a: 'Gruplar sekmesinden "Yeni grup kur"a dokun, ad/açıklama/kategori gir. Grup içinden oluşturduğun tahminler yalnızca o grubun üyelerine görünür, herkese açık akışta yer almaz.' },
  { topic: 'mesaj', icon: 'lucide:mail-check', q: 'Kim bana mesaj gönderebilir?', a: 'Ayarlar → Gizlilik → Mesaj istekleri\'nden "Herkes", "Yalnızca takip ettiklerim" veya "Hiç kimse" seçebilirsin. Bu tercih dışındaki biri sana mesaj gönderemez.' },
]

export default function YardimMerkezi() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeTopic, setActiveTopic] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)

  const filtered = FAQS.filter((f) => {
    const matchesTopic = !activeTopic || f.topic === activeTopic
    const matchesQuery = !query.trim() || f.q.toLowerCase().includes(query.trim().toLowerCase())
    return matchesTopic && matchesQuery
  })

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="border-b border-border bg-background px-5 pb-4 pt-12">
        <div className="flex items-center justify-between">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">GTF DESTEK</p>
          <h1 className="mt-1 font-heading text-[27px] font-extrabold tracking-[-0.05em]">Yardım Merkezi</h1>
          <p className="mt-2 max-w-[335px] text-[13px] leading-5 text-muted-foreground">
            Tahmin kayıtların ve topluluğunla ilgili cevaplara hızlıca ulaş.
          </p>
        </div>

        <div className="mt-5 flex h-12 items-center gap-3 rounded-theme border border-border bg-input px-4 shadow-sm">
          <iconify-icon icon="lucide:search" class="text-[19px] text-muted-foreground"></iconify-icon>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bir konu ara"
            aria-label="Yardım konularında ara"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </header>

      <main className="px-5 pt-6">
        <section>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-[-0.035em]">Konular</h2>
              <p className="mt-1 text-xs text-muted-foreground">Bir konuya dokunarak ilgili soruları gör</p>
            </div>
            {activeTopic && (
              <button onClick={() => setActiveTopic(null)} className="text-xs font-bold text-primary">
                Tümünü gör
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {TOPICS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTopic(activeTopic === t.key ? null : t.key)}
                className={`min-h-[104px] rounded-theme border p-4 text-left shadow-sm ${
                  activeTopic === t.key ? 'border-2 border-primary bg-secondary/40' : 'border-border bg-card'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${t.iconTone}`}>
                  <iconify-icon icon={t.icon} class="text-[17px]"></iconify-icon>
                </div>
                <p className="mt-3 text-[13px] font-bold text-foreground">{t.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold tracking-[-0.035em]">Sık sorulanlar</h2>
            <iconify-icon icon="lucide:book-open-check" class="text-xl text-primary"></iconify-icon>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">Eşleşen bir soru bulunamadı.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
              {filtered.map((f, i) => {
                const isOpen = openFaq === f.q
                return (
                  <div key={f.q}>
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : f.q)}
                      className="flex w-full items-start gap-3 px-4 py-4 text-left"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                        <iconify-icon icon={f.icon} class="text-sm"></iconify-icon>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold text-foreground">{f.q}</span>
                        {isOpen && <span className="mt-1.5 block text-[12px] leading-5 text-muted-foreground">{f.a}</span>}
                      </span>
                      <iconify-icon
                        icon={isOpen ? 'lucide:chevron-up' : 'lucide:chevron-right'}
                        class="mt-0.5 text-base text-muted-foreground"
                      ></iconify-icon>
                    </button>
                    {i < filtered.length - 1 && <div className="mx-4 h-px bg-border" />}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-theme border border-border bg-muted p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
              <iconify-icon icon="lucide:messages-square" class="text-lg"></iconify-icon>
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-foreground">Aradığın cevabı bulamadın mı?</h2>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Bize doğrudan e-posta at, en kısa sürede döneriz.
              </p>
              <a
                href="mailto:aliyusufbusiness1@gmail.com"
                className="mt-3 inline-block text-xs font-bold text-primary"
              >
                aliyusufbusiness1@gmail.com
              </a>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-5 pb-5 pt-3 backdrop-blur-md">
        <a
          href="mailto:aliyusufbusiness1@gmail.com?subject=GTF%20Destek%20Talebi"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:circle-help" class="text-[18px]"></iconify-icon>
          Destek talebi oluştur
        </a>
      </div>
    </div>
  )
}
