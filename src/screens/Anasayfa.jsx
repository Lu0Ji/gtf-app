import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'

const CATEGORIES = ['Senin akışın', 'Futbol', 'Teknoloji', 'Ekonomi', 'Kültür']

const SUGGESTED_PEOPLE = [
  {
    name: 'İpek Akın',
    tag: 'Teknoloji · %74 isabet',
    imageId: 'ab59d891-10d6-4a41-87c3-b2a58037bcbf',
  },
  {
    name: 'Bora Eren',
    tag: 'Piyasalar · %71 isabet',
    imageId: 'cddf8abb-4b13-4037-a4de-7e7cf40becac',
  },
]

function Header() {
  return (
    <header className="px-5 pt-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-theme bg-primary font-heading text-sm font-extrabold tracking-[-0.08em] text-primary-foreground">
            GTF
          </div>
          <div>
            <p className="font-heading text-[21px] font-extrabold leading-none tracking-[-0.06em] text-primary">
              Gelecek Tahmin Fonu
            </p>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">
              Takip ettiklerinden yeni kayıtlar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Ara"
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:search" class="text-[19px]"></iconify-icon>
          </button>
          <button
            aria-label="Bildirimler"
            className="relative flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:bell" class="text-[19px]"></iconify-icon>
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-card" />
          </button>
          <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-card shadow-sm">
            <img
              src={IMG('fc4eb4df-87ce-4cd9-bdd3-80a434cd8ddd')}
              alt="Profilin"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  )
}

function ComposeCard() {
  const navigate = useNavigate()

  return (
    <section className="mx-5 rounded-theme border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
          <img
            src={IMG('b7a3aceb-e89d-4839-aabd-5f89f4519b11')}
            alt="Profilin"
            className="h-full w-full object-cover"
          />
        </div>
        <button
          onClick={() => navigate('/tahmin-olustur')}
          className="flex h-11 flex-1 items-center rounded-theme bg-muted px-4 text-left text-sm text-muted-foreground"
        >
          Ne tahmin ediyorsun?
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/tahmin-olustur')}
            className="flex items-center gap-1.5 rounded-theme bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"
          >
            <iconify-icon icon="lucide:pen-line" class="text-sm text-primary"></iconify-icon>
            Tahmin
          </button>
          <button className="flex items-center gap-1.5 rounded-theme bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">
            <iconify-icon icon="lucide:archive" class="text-sm"></iconify-icon>
            Zaman kapsülü
          </button>
        </div>
        <button
          aria-label="Yeni tahmin oluştur"
          onClick={() => navigate('/tahmin-olustur')}
          className="flex h-9 w-9 items-center justify-center rounded-theme bg-primary text-primary-foreground"
        >
          <iconify-icon icon="lucide:plus" class="text-lg"></iconify-icon>
        </button>
      </div>
    </section>
  )
}

function CategoryTabs({ active, onSelect }) {
  return (
    <section className="mt-5">
      <div className="flex gap-2 overflow-x-auto px-5 pb-1">
        {CATEGORIES.map((category) => {
          const isActive = category === active
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelect(category)}
              className={
                isActive
                  ? 'shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground'
                  : 'shrink-0 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-secondary-foreground'
              }
            >
              {category}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function NearbyEventsCard() {
  return (
    <section className="mx-5 mt-5 rounded-theme border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
          <iconify-icon icon="lucide:map-pin" class="text-lg"></iconify-icon>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground">İstanbul'da yaklaşanlar</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Takip ettiklerin bu hafta sonu derbi ve teknoloji zirvesi için kayıt açıyor.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
              15 Şub · Kadıköy
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
              18 Şub · Şişli
            </span>
          </div>
        </div>
        <iconify-icon icon="lucide:chevron-right" class="mt-2 text-lg text-muted-foreground"></iconify-icon>
      </div>
    </section>
  )
}

function SealedPredictionPost() {
  const navigate = useNavigate()

  return (
    <article
      onClick={() => navigate('/tahmin-kaydi')}
      className="mx-5 mt-4 cursor-pointer rounded-theme border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full">
          <img
            src={IMG('720546f3-d053-4b76-a70c-e7017ed0f68c')}
            alt="Emir Can"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold">Emir Can</h2>
                <iconify-icon icon="lucide:badge-check" class="text-sm text-primary"></iconify-icon>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">@emircan · 18 dk</p>
            </div>
            <button className="rounded-theme bg-secondary px-2.5 py-1.5 text-[10px] font-bold text-secondary-foreground">
              Takipte
            </button>
          </div>
          <p className="mt-3 text-[15px] font-medium leading-6 text-foreground">
            Bu akşamki derbide ilk golün ikinci yarıda geleceğini düşünüyorum.
          </p>
          <div className="mt-3 rounded-theme border border-border bg-muted p-3">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-bold text-primary">SPOR</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
                <iconify-icon icon="lucide:stamp" class="text-xs"></iconify-icon>
                Mühürlü tahmin
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-primary">
                <iconify-icon icon="lucide:calendar-days" class="text-base"></iconify-icon>
              </div>
              <div>
                <p className="text-xs font-bold">19 Şubat 2026'da açılacak</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Kayıt sabit; içerik açılana kadar gizli.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-muted-foreground">
              <button aria-label="Beğen" className="flex items-center gap-1.5 text-xs font-semibold">
                <iconify-icon icon="lucide:heart" class="text-[18px]"></iconify-icon>
                48
              </button>
              <button aria-label="Yorum yap" className="flex items-center gap-1.5 text-xs font-semibold">
                <iconify-icon icon="lucide:message-circle" class="text-[18px]"></iconify-icon>
                12
              </button>
              <button aria-label="Paylaş" className="flex items-center">
                <iconify-icon icon="lucide:send" class="text-[18px]"></iconify-icon>
              </button>
            </div>
            <button aria-label="Kaydet" className="text-muted-foreground">
              <iconify-icon icon="lucide:bookmark" class="text-[18px]"></iconify-icon>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <div className="flex -space-x-2">
              <div className="h-5 w-5 overflow-hidden rounded-full border-2 border-card">
                <img
                  src={IMG('d017d967-cf31-4c33-bd50-b42767685f5c')}
                  alt="Takipçi"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="h-5 w-5 overflow-hidden rounded-full border-2 border-card">
                <img
                  src={IMG('53a0ac8e-c64c-44c1-acf7-1ebfff86ff06')}
                  alt="Takipçi"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Seda</span> ve 46 kişi beğendi
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}

function SuggestedPeople() {
  return (
    <section className="mt-7">
      <div className="flex items-end justify-between px-5">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight">Sana önerilen kişiler</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Benzer kayıtları takip ediyorlar</p>
        </div>
        <button className="text-xs font-bold text-primary">Tümü</button>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto px-5 pb-1">
        {SUGGESTED_PEOPLE.map((person) => (
          <article
            key={person.name}
            className="min-w-[166px] rounded-theme border border-border bg-card p-3 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 overflow-hidden rounded-full">
                <img src={IMG(person.imageId)} alt={person.name} className="h-full w-full object-cover" />
              </div>
              <iconify-icon icon="lucide:more-horizontal" class="text-muted-foreground"></iconify-icon>
            </div>
            <h3 className="mt-3 text-sm font-bold">{person.name}</h3>
            <p className="mt-1 text-[10px] text-muted-foreground">{person.tag}</p>
            <button className="mt-3 w-full rounded-theme bg-secondary py-2 text-xs font-bold text-secondary-foreground">
              Takip et
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function VerifiedResultPost() {
  return (
    <article className="mx-5 mt-7 rounded-theme border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full">
          <img
            src={IMG('a2aa2b58-b1a9-495f-a096-8c3e1dc9a86c')}
            alt="Derya Aras"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold">Derya Aras</h2>
                <iconify-icon icon="lucide:badge-check" class="text-sm text-success"></iconify-icon>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">@deryaaras · Dün</p>
            </div>
            <button aria-label="Gönderi seçenekleri" className="text-muted-foreground">
              <iconify-icon icon="lucide:ellipsis" class="text-lg"></iconify-icon>
            </button>
          </div>
          <p className="mt-3 text-[15px] font-medium leading-6">
            Ocak sonunda yaptığım faiz tahmini bugün açıldı. Beklediğim gibi sabit kaldı.
          </p>
          <div className="mt-3 overflow-hidden rounded-theme border border-border">
            <div className="flex items-center justify-between bg-success px-3 py-2 text-success-foreground">
              <span className="flex items-center gap-1.5 text-[11px] font-bold">
                <iconify-icon icon="lucide:badge-check" class="text-sm"></iconify-icon>
                Doğrulandı
              </span>
              <span className="text-[10px] font-semibold">Açıldı · Bugün</span>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                  EKONOMİ
                </span>
                <span className="text-[10px] text-muted-foreground">28 gün önce mühürlendi</span>
              </div>
              <p className="mt-3 text-sm font-bold leading-5">
                &ldquo;TCMB politika faizini ocak sonunda sabit tutacak.&rdquo;
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-success">
                <iconify-icon icon="lucide:check-circle-2" class="text-base"></iconify-icon>
                <span className="font-semibold">Sonuç, tahminle eşleşti</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-muted-foreground">
              <button className="flex items-center gap-1.5 text-xs font-semibold">
                <iconify-icon icon="lucide:heart" class="text-[18px]"></iconify-icon>
                126
              </button>
              <button className="flex items-center gap-1.5 text-xs font-semibold">
                <iconify-icon icon="lucide:message-circle" class="text-[18px]"></iconify-icon>
                19
              </button>
              <button aria-label="Paylaş" className="flex items-center">
                <iconify-icon icon="lucide:send" class="text-[18px]"></iconify-icon>
              </button>
            </div>
            <button aria-label="Kaydet" className="text-muted-foreground">
              <iconify-icon icon="lucide:bookmark" class="text-[18px]"></iconify-icon>
            </button>
          </div>
          <div className="mt-3 rounded-theme bg-muted px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Mehmet Y.</span> &ldquo;Gerekçen de çok
              yerindeydi.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}

function FollowedGroups() {
  return (
    <section className="mt-7">
      <div className="flex items-end justify-between px-5">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight">Takip ettiğin gruplardan</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Sohbete katıl, yeni kayıtları gör</p>
        </div>
        <button className="text-xs font-bold text-primary">Gruplar</button>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto px-5 pb-2">
        <article className="min-w-[248px] overflow-hidden rounded-theme border border-border bg-card shadow-sm">
          <div className="relative h-24 w-full overflow-hidden">
            <img
              src={IMG('db7bc3c4-2a6a-454e-849e-b413d1ef2154')}
              alt="Derbi Odası"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
            <div className="absolute bottom-3 left-3">
              <p className="font-heading text-sm font-bold text-white">Derbi Odası</p>
            </div>
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold">&ldquo;İlk 11'ler açıklanınca tahminler değişir mi?&rdquo;</p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex -space-x-2">
                <div className="h-5 w-5 overflow-hidden rounded-full border-2 border-card">
                  <img
                    src={IMG('8ab48b09-455b-4a3e-a6d7-6f75d793e3ad')}
                    alt="Üye"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="h-5 w-5 overflow-hidden rounded-full border-2 border-card">
                  <img
                    src={IMG('966e81ef-e363-48fa-b521-2ea03cc081e2')}
                    alt="Üye"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">34 yeni yorum</span>
            </div>
          </div>
        </article>
        <article className="min-w-[210px] rounded-theme border border-border bg-card p-4 shadow-sm">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
            TEKNOLOJİ
          </span>
          <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-theme bg-muted text-primary">
            <iconify-icon icon="lucide:orbit" class="text-xl"></iconify-icon>
          </div>
          <h3 className="mt-3 font-heading text-[16px] font-bold">Geleceğin Teknolojisi</h3>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Yapay zekâ cihazları üzerine 16 yeni tahmin.
          </p>
          <button className="mt-4 text-xs font-bold text-primary">Gruba git →</button>
        </article>
      </div>
    </section>
  )
}

export default function Anasayfa() {
  const [activeCategory, setActiveCategory] = useState('Senin akışın')

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <Header />
      <main className="pt-5">
        <ComposeCard />
        <CategoryTabs active={activeCategory} onSelect={setActiveCategory} />
        <NearbyEventsCard />
        <section className="mt-7">
          <div className="flex items-center justify-between px-5">
            <div>
              <h1 className="font-heading text-xl font-extrabold tracking-[-0.045em]">
                Takip ettiklerinden
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">Bugün açılan ve mühürlenen kayıtlar</p>
            </div>
            <button className="text-xs font-bold text-primary">Sırala</button>
          </div>
          <SealedPredictionPost />
        </section>
        <SuggestedPeople />
        <VerifiedResultPost />
        <FollowedGroups />
      </main>
    </div>
  )
}
