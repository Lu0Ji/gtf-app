import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SLIDES = [
  {
    icon: 'lucide:circle-plus',
    eyebrow: 'Başlangıç',
    title: 'Tahminini oluştur',
    desc: 'Geleceğe dair fikrini kayda geçir. Bir kategori seç, ne zaman açılacağını belirle ve tahminini kendi zamanına bırak.',
    note: { icon: 'lucide:folder-kanban', title: 'Konuya yer aç', desc: '12 kategoriden biriyle düzenli bir kayıt tut — spor, teknoloji, ekonomi ve daha fazlası.' },
  },
  {
    icon: 'lucide:lock-keyhole',
    eyebrow: 'Mühürleme',
    title: 'İçerik açılışa kadar gizli kalır',
    desc: 'Mühürlediğin an, tahminin başlığı görünür ama içeriği kimseye — sana bile — açılış tarihine kadar görünmez.',
    note: { icon: 'lucide:badge-check', title: 'Sonucu sen işaretlersin', desc: 'Açılış tarihi geldiğinde "Doğru çıktı" veya "Yanlış çıktı" diyerek kaydı kapatırsın.' },
  },
  {
    icon: 'lucide:users-round',
    eyebrow: 'Topluluk',
    title: 'Gruplara katıl',
    desc: 'İlgi alanına göre bir gruba katıl ya da kendi grubunu kur — orada paylaştığın tahminler yalnızca grup üyelerine görünür.',
    note: { icon: 'lucide:award', title: 'Rozet ve puan kazan', desc: 'Doğru tahminler, takipçi, beğeni ve grup etkinliğinle ilerleme kaydedersin.' },
  },
]

export default function IlkKullanimRehberi() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1

  function finish() {
    try {
      localStorage.setItem('gtf-onboarding-seen', '1')
    } catch {
      // localStorage unavailable — worst case the guide shows again next time.
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground font-body">
      <div className="pointer-events-none absolute -right-20 top-20 h-56 w-56 rounded-full bg-secondary/55 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-[380px] h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-12">
        <button
          aria-label="Geri dön"
          onClick={() => (step === 0 ? finish() : setStep((s) => s - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-extrabold tracking-[-0.08em]">GTF</span>
          <span className="h-4 w-px bg-border" />
          <span className="text-[11px] font-bold text-muted-foreground">{step + 1} / {SLIDES.length}</span>
        </div>

        <button onClick={finish} className="min-w-10 text-right text-sm font-bold text-primary">
          Atla
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-5 pb-44 pt-7">
        <div className="flex items-center gap-2" aria-label="Rehber ilerlemesi">
          {SLIDES.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>

        <section className="relative mt-8 flex min-h-[280px] items-center justify-center rounded-[28px] border border-border bg-card shadow-sm">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary text-primary">
            <iconify-icon icon={slide.icon} class="text-5xl"></iconify-icon>
          </div>
        </section>

        <section className="mt-9">
          <div className="flex h-10 w-10 items-center justify-center rounded-theme bg-secondary text-primary">
            <iconify-icon icon={slide.icon} class="text-xl"></iconify-icon>
          </div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">{slide.eyebrow}</p>
          <h1 className="mt-2 font-heading text-[27px] font-extrabold leading-[1.1] tracking-[-0.055em]">
            {slide.title}
          </h1>
          <p className="mt-3 max-w-[342px] text-[14px] leading-6 text-muted-foreground">{slide.desc}</p>
        </section>

        <section className="mt-7 rounded-theme border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
              <iconify-icon icon={slide.note.icon} class="text-base"></iconify-icon>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{slide.note.title}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{slide.note.desc}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-5 pb-7 pt-4 backdrop-blur-md">
        <button
          onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm"
        >
          {isLast ? 'Başla' : 'İleri'}
          {!isLast && <iconify-icon icon="lucide:arrow-right" class="text-[18px]"></iconify-icon>}
        </button>
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="mt-3 flex h-8 w-full items-center justify-center text-sm font-bold text-muted-foreground"
          >
            Geri
          </button>
        )}
      </footer>
    </div>
  )
}
