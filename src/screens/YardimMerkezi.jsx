import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// Icons/color tones stay code-side (not translatable content) — the
// TOPICS array's title/desc and the FAQ list's q/a come from i18next
// (`help.topics.<key>` / `help.faqs`) so this component itself carries no
// hardcoded language.
const TOPIC_STYLE = {
  hesap: { icon: 'lucide:circle-user-round', iconTone: 'bg-secondary text-primary' },
  tahmin: { icon: 'lucide:pen-line', iconTone: 'bg-secondary text-primary' },
  muhur: { icon: 'lucide:stamp', iconTone: 'bg-[#F4E8D8] text-[#A76522]' },
  dogrulama: { icon: 'lucide:badge-check', iconTone: 'bg-muted text-success' },
  grup: { icon: 'lucide:users-round', iconTone: 'bg-secondary text-primary' },
  mesaj: { icon: 'lucide:message-circle', iconTone: 'bg-secondary text-primary' },
}
const FAQ_ICON = {
  muhur: 'lucide:clock-3',
  dogrulama: 'lucide:check-check',
  tahmin: 'lucide:eye-off',
  hesap: 'lucide:award',
  grup: 'lucide:plus',
  mesaj: 'lucide:mail-check',
}

export default function YardimMerkezi() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeTopic, setActiveTopic] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)

  const topicsObj = t('help.topics', { returnObjects: true })
  const TOPICS = Object.keys(TOPIC_STYLE).map((key) => ({ key, ...TOPIC_STYLE[key], ...topicsObj[key] }))
  const FAQS = t('help.faqs', { returnObjects: true }).map((f, i) => ({ ...f, icon: FAQ_ICON[f.topic], id: i }))

  const filtered = FAQS.filter((f) => {
    const matchesTopic = !activeTopic || f.topic === activeTopic
    const matchesQuery = !query.trim() || f.q.toLowerCase().includes(query.trim().toLowerCase())
    return matchesTopic && matchesQuery
  })

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="border-b border-border bg-background px-5 pb-4 pt-screen">
        <div className="flex items-center justify-between">
          <button
            aria-label={t('common.backAria')}
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">{t('help.eyebrow')}</p>
          <h1 className="mt-1 font-heading text-[27px] font-extrabold tracking-[-0.05em]">{t('help.title')}</h1>
          <p className="mt-2 max-w-[335px] text-[13px] leading-5 text-muted-foreground">{t('help.subtitle')}</p>
        </div>

        <div className="mt-5 flex h-12 items-center gap-3 rounded-theme border border-border bg-input px-4 shadow-sm">
          <iconify-icon icon="lucide:search" class="text-[19px] text-muted-foreground"></iconify-icon>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('help.searchPlaceholder')}
            aria-label={t('help.searchAria')}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </header>

      <main className="px-5 pt-6">
        <section>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold tracking-[-0.035em]">{t('help.topicsTitle')}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t('help.topicsSubtitle')}</p>
            </div>
            {activeTopic && (
              <button onClick={() => setActiveTopic(null)} className="text-xs font-bold text-primary">
                {t('help.seeAllTopics')}
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {TOPICS.map((topic) => (
              <button
                key={topic.key}
                onClick={() => setActiveTopic(activeTopic === topic.key ? null : topic.key)}
                className={`min-h-[104px] rounded-theme border p-4 text-left shadow-sm ${
                  activeTopic === topic.key ? 'border-2 border-primary bg-secondary/40' : 'border-border bg-card'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${topic.iconTone}`}>
                  <iconify-icon icon={topic.icon} class="text-[17px]"></iconify-icon>
                </div>
                <p className="mt-3 text-[13px] font-bold text-foreground">{topic.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{topic.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold tracking-[-0.035em]">{t('help.faqTitle')}</h2>
            <iconify-icon icon="lucide:book-open-check" class="text-xl text-primary"></iconify-icon>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">{t('help.noMatches')}</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
              {filtered.map((f, i) => {
                const isOpen = openFaq === f.id
                return (
                  <div key={f.id}>
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : f.id)}
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
              <h2 className="text-[13px] font-bold text-foreground">{t('help.stillNeedHelpTitle')}</h2>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{t('help.stillNeedHelpBody')}</p>
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
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-transform duration-150 active:scale-[0.98]"
        >
          <iconify-icon icon="lucide:circle-help" class="text-[18px]"></iconify-icon>
          {t('help.createTicketCta')}
        </a>
      </div>
    </div>
  )
}
