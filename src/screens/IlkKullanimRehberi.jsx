import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useUserSettings } from '../hooks/useUserSettings.js'
import { CATEGORY_META, CATEGORY_SLUGS } from '../lib/categories.js'
import { IMG } from '../lib/images.js'

// FireVibe-generated illustration set (this session, 2026-09-02) — one per
// slide instead of the single reused "prediction journal" image every slide
// used to share as a faint corner accent. Each was downloaded and inspected
// pixel-by-pixel before use, per this screen's usual practice (this
// project's image generation has a history of unrelated robot-mascot
// artifacts slipping in). Kept as illustration-only content: the copy below
// still carries the actual meaning, these just make each step recognizable
// at a glance and give the whole flow the warmth a first "hello" deserves.
const HERO_WELCOME = IMG('d7960b49-2ada-4c9d-915b-4f72f964da8f')
const HERO_CREATE = IMG('a6eec16b-b7cc-4e14-950f-461559fcebda')
const HERO_SEAL = IMG('8c0404fb-2a59-4367-90e2-58f36918ff00')
const HERO_COMMUNITY = IMG('11c937cd-c7a7-459d-b773-3e8ec2d78981')

export default function IlkKullanimRehberi() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { update } = useUserSettings()
  const [step, setStep] = useState(0)
  // Kullanıcı geri bildirimi: "Tutorialda kişinin ilgi alanlarını da
  // sorabiliriz ona göre içerikler çıkar ilk kayıttan sonra." Bu yüzden
  // bilgilendirme slaytlarından sonra gerçek bir son adım olarak eklendi —
  // ayrı/isteğe bağlı bir ekran değil, "Atla" ile hâlâ tamamen atlanabilir
  // (bkz. finish()), ama sonuna kadar gidenler settings.content.interests'i
  // buradan dolduruyor, Ayarlar'a hiç girmeden. Aynı ilgi alanı seçici
  // burada da (UygulamaAyarlari.jsx) tam kategori kataloğunu + "Diğer" özel
  // giriş seçeneğini kullanıyor — orada neden 6 kategoriyle sınırlı
  // kalmaması gerektiği açıklanmıştı, aynı mantık burada da geçerli.
  const [interests, setInterests] = useState([])
  const [customCategoryOpen, setCustomCategoryOpen] = useState(false)
  const [customDraft, setCustomDraft] = useState('')

  // Profile hasn't necessarily finished loading the instant this screen
  // mounts (it lands here straight off signUp) — an unnamed greeting reads
  // fine either way, so this never blocks on it.
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] || ''

  const SLIDES = [
    {
      icon: 'lucide:hand-heart',
      eyebrow: t('onboarding.welcomeEyebrow'),
      title: firstName ? t('onboarding.welcomeTitleNamed', { name: firstName }) : t('onboarding.welcomeTitle'),
      desc: t('onboarding.welcomeDesc'),
      hero: HERO_WELCOME,
      note: {
        icon: 'lucide:heart-handshake',
        title: t('onboarding.welcomeNoteTitle'),
        desc: t('onboarding.welcomeNoteDesc'),
      },
    },
    {
      icon: 'lucide:circle-plus',
      eyebrow: t('onboarding.createEyebrow'),
      title: t('onboarding.createTitle'),
      desc: t('onboarding.createDesc'),
      hero: HERO_CREATE,
      note: {
        icon: 'lucide:folder-kanban',
        title: t('onboarding.createNoteTitle'),
        desc: t('onboarding.createNoteDesc'),
      },
    },
    {
      icon: 'lucide:lock-keyhole',
      eyebrow: t('onboarding.sealEyebrow'),
      title: t('onboarding.sealTitle'),
      desc: t('onboarding.sealDesc'),
      hero: HERO_SEAL,
      note: {
        icon: 'lucide:badge-check',
        title: t('onboarding.sealNoteTitle'),
        desc: t('onboarding.sealNoteDesc'),
      },
    },
    {
      icon: 'lucide:users-round',
      eyebrow: t('onboarding.communityEyebrow'),
      title: t('onboarding.communityTitle'),
      desc: t('onboarding.communityDesc'),
      hero: HERO_COMMUNITY,
      note: {
        icon: 'lucide:award',
        title: t('onboarding.communityNoteTitle'),
        desc: t('onboarding.communityNoteDesc'),
      },
    },
  ]

  // One virtual extra step past the last illustrated slide — the interest
  // picker. TOTAL_STEPS/isInterestsStep drive the header counter, progress
  // dots, and footer button the same way a real SLIDES entry would, without
  // forcing the picker's completely different layout into the slide shape.
  const TOTAL_STEPS = SLIDES.length + 1
  const isInterestsStep = step === SLIDES.length
  const slide = SLIDES[step]
  const isLast = step === TOTAL_STEPS - 1

  function toggleInterest(value) {
    setInterests((prev) => {
      const isSelected = prev.some((v) => v.toLowerCase() === value.toLowerCase())
      return isSelected ? prev.filter((v) => v.toLowerCase() !== value.toLowerCase()) : [...prev, value]
    })
  }

  function submitCustomInterest() {
    const value = customDraft.trim().slice(0, 24)
    if (!value) return
    toggleInterest(value)
    setCustomDraft('')
  }

  function finish() {
    try {
      localStorage.setItem('gtf-onboarding-seen', '1')
    } catch {
      // localStorage unavailable — worst case the guide shows again next time.
    }
    // Only someone who actually reached/used the picker has anything to
    // save — an early "Atla" from slide 1 shouldn't overwrite whatever's
    // already in settings.content.interests with an empty array.
    if (interests.length > 0) update('content', { interests })
    navigate('/', { replace: true })
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground font-body">
      <div className="pointer-events-none absolute -right-20 top-20 h-56 w-56 rounded-full bg-secondary/55 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-[380px] h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-12">
        <button
          aria-label={t('common.backAria')}
          onClick={() => (step === 0 ? finish() : setStep((s) => s - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-extrabold tracking-[-0.08em]">GTF</span>
          <span className="h-4 w-px bg-border" />
          <span className="text-[11px] font-bold text-muted-foreground">{step + 1} / {TOTAL_STEPS}</span>
        </div>

        <button onClick={finish} className="min-w-10 text-right text-sm font-bold text-primary">
          {t('onboarding.skip')}
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-5 pb-44 pt-7">
        <div className="flex items-center gap-2" aria-label={t('onboarding.progressAria')}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>

        {isInterestsStep ? (
          <>
            <section className="mt-9">
              <span className="rounded-full bg-secondary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-secondary-foreground">
                {t('onboarding.interestsEyebrow')}
              </span>
              <h1 className="mt-3 font-heading text-[27px] font-extrabold leading-[1.1] tracking-[-0.055em]">
                {t('onboarding.interestsTitle')}
              </h1>
              <p className="mt-3 max-w-[342px] text-[14px] leading-6 text-muted-foreground">
                {t('onboarding.interestsDesc')}
              </p>
            </section>

            <section className="mt-6">
              <div className="flex flex-wrap gap-2">
                {CATEGORY_SLUGS.map((slug) => {
                  const selected = interests.some((v) => v.toLowerCase() === slug)
                  return (
                    <button
                      key={slug}
                      onClick={() => toggleInterest(slug)}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold ${
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-card text-card-foreground'
                      }`}
                    >
                      <iconify-icon icon={CATEGORY_META[slug].icon} class="text-sm"></iconify-icon>
                      {t(CATEGORY_META[slug].labelKey)}
                    </button>
                  )
                })}
                {interests
                  .filter((v) => !CATEGORY_SLUGS.includes(v.toLowerCase()))
                  .map((value) => (
                    <button
                      key={value}
                      onClick={() => toggleInterest(value)}
                      className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
                    >
                      {value}
                      <iconify-icon icon="lucide:x" class="text-xs"></iconify-icon>
                    </button>
                  ))}
                <button
                  onClick={() => setCustomCategoryOpen((prev) => !prev)}
                  className={`flex items-center gap-1 rounded-full px-4 py-2.5 text-xs font-bold ${
                    customCategoryOpen
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-dashed border-border bg-card text-muted-foreground'
                  }`}
                >
                  <iconify-icon icon="lucide:plus" class="text-sm"></iconify-icon>
                  {t('createPrediction.customCategoryCta')}
                </button>
              </div>
              {customCategoryOpen && (
                <div className="mt-2.5 flex gap-2">
                  <input
                    autoFocus
                    value={customDraft}
                    onChange={(e) => setCustomDraft(e.target.value.slice(0, 24))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitCustomInterest()
                    }}
                    placeholder={t('createPrediction.customCategoryPlaceholder')}
                    maxLength={24}
                    className="h-11 flex-1 rounded-theme border border-border bg-input px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={submitCustomInterest}
                    aria-label={t('createPrediction.customCategoryAddAria')}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-primary text-primary-foreground"
                  >
                    <iconify-icon icon="lucide:plus" class="text-lg"></iconify-icon>
                  </button>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="relative mt-8 flex min-h-[280px] items-center justify-center overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
              <span className="absolute left-4 top-4 rounded-full bg-secondary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-secondary-foreground">
                {slide.eyebrow}
              </span>
              <img key={slide.hero} src={slide.hero} alt="" className="h-44 w-44 object-contain" />
              <div className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-md">
                <iconify-icon icon={slide.icon} class="text-2xl"></iconify-icon>
              </div>
            </section>

            <section className="mt-9">
              <h1 className="font-heading text-[27px] font-extrabold leading-[1.1] tracking-[-0.055em]">
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
          </>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-5 pb-7 pt-4 backdrop-blur-md">
        <button
          onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-transform duration-150 active:scale-[0.98]"
        >
          {isLast ? t('onboarding.letsGo') : t('onboarding.next')}
          {!isLast && <iconify-icon icon="lucide:arrow-right" class="text-[18px]"></iconify-icon>}
        </button>
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="mt-3 flex h-8 w-full items-center justify-center text-sm font-bold text-muted-foreground"
          >
            {t('onboarding.back')}
          </button>
        )}
      </footer>
    </div>
  )
}
