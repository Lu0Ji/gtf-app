import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../contexts/ToastContext.jsx'
import DetailHeader from '../components/ui/DetailHeader.jsx'

export default function TopluluKurallari() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const s1Rules = t('community.s1Rules', { returnObjects: true })
  const s3Rules = t('community.s3Rules', { returnObjects: true })

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(`${t('community.title')} — ${window.location.href}`)
      setCopied(true)
      showToast(t('community.shareSuccess'), 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast(t('community.shareFailed'))
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body">
      <DetailHeader
        title={t('community.title')}
        centered
        trailing={
          <button
            aria-label={t('community.shareAria')}
            onClick={handleShare}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme text-muted-foreground"
          >
            <iconify-icon icon={copied ? 'lucide:check' : 'lucide:share-2'} class="text-[18px]"></iconify-icon>
          </button>
        }
      />

      <main className="px-5 pb-28 pt-6">
        <section>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-primary">
              <iconify-icon icon="lucide:book-open-check" class="text-sm"></iconify-icon>
            </span>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{t('community.eyebrow')}</p>
          </div>
          <h1 className="mt-4 font-heading text-[28px] font-extrabold leading-[1.1] tracking-[-0.05em]">
            {t('community.heading1')}
            <br />
            {t('community.heading2')}
          </h1>
          <p className="mt-4 max-w-[350px] text-sm leading-6 text-muted-foreground">{t('community.intro')}</p>
          <div className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <iconify-icon icon="lucide:calendar-clock" class="text-sm text-primary"></iconify-icon>
            <span>{t('community.lastUpdated')}</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>{t('community.version')}</span>
          </div>
        </section>

        <section className="mt-9">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-primary text-xs font-extrabold text-primary-foreground">01</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">{t('community.s1Title')}</h2>
          </div>
          <div className="mt-4 border-l-2 border-primary pl-4">
            <p className="text-sm leading-6 text-foreground">{t('community.s1Intro')}</p>
          </div>
          <ol className="mt-4 space-y-3 text-[13px] leading-5 text-muted-foreground">
            {s1Rules.map((rule, i) => (
              <li key={i} className="flex gap-3"><span className="font-bold text-primary">{i + 1}.</span><span>{rule}</span></li>
            ))}
          </ol>
        </section>

        <div className="my-8 h-px bg-border" />

        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-xs font-extrabold text-secondary-foreground">02</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">{t('community.s2Title')}</h2>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">{t('community.s2Body')}</p>
          <div className="mt-4 rounded-theme bg-muted p-4">
            <div className="flex items-start gap-3">
              <iconify-icon icon="lucide:heart-handshake" class="mt-0.5 text-lg text-primary"></iconify-icon>
              <p className="text-[12px] leading-5 text-secondary-foreground">{t('community.s2Warning')}</p>
            </div>
          </div>
        </section>

        <div className="my-8 h-px bg-border" />

        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-xs font-extrabold text-secondary-foreground">03</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">{t('community.s3Title')}</h2>
          </div>
          <ul className="mt-4 space-y-3 text-[13px] leading-5 text-muted-foreground">
            {s3Rules.map((rule, i) => (
              <li key={i} className="flex gap-3"><iconify-icon icon="lucide:x" class="mt-0.5 shrink-0 text-base text-destructive"></iconify-icon><span>{rule}</span></li>
            ))}
          </ul>
        </section>

        <div className="my-8 h-px bg-border" />

        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-xs font-extrabold text-secondary-foreground">04</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">{t('community.s4Title')}</h2>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">{t('community.s4Body1')}</p>
          <p className="mt-3 text-[13px] leading-6 text-muted-foreground">{t('community.s4Body2')}</p>
        </section>

        <div className="my-8 h-px bg-border" />

        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-xs font-extrabold text-secondary-foreground">05</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">{t('community.s5Title')}</h2>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">{t('community.s5Body')}</p>
          <div className="mt-4 flex gap-3 rounded-theme border border-border bg-card p-4">
            <iconify-icon icon="lucide:messages-square" class="mt-0.5 shrink-0 text-lg text-primary"></iconify-icon>
            <p className="text-[12px] leading-5 text-muted-foreground">{t('community.s5Note')}</p>
          </div>
        </section>

        <div className="my-8 h-px bg-border" />

        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-secondary text-xs font-extrabold text-secondary-foreground">06</span>
            <h2 className="font-heading text-xl font-extrabold tracking-[-0.04em]">{t('community.s6Title')}</h2>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">{t('community.s6Body')}</p>
          <div className="mt-5 rounded-theme border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <iconify-icon icon="lucide:scale" class="text-base"></iconify-icon>
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">{t('community.appealTitle')}</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{t('community.appealBody')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-9 rounded-theme bg-muted p-5 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-card text-primary shadow-sm">
            <iconify-icon icon="lucide:flag" class="text-lg"></iconify-icon>
          </span>
          <h2 className="mt-3 font-heading text-base font-extrabold tracking-[-0.025em]">{t('community.violationTitle')}</h2>
          <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{t('community.violationBody')}</p>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-5 pb-5 pt-3 backdrop-blur-md">
        <a
          href="mailto:aliyusufbusiness1@gmail.com?subject=GTF%20%C4%B0hlal%20Bildirimi"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-transform duration-150 active:scale-[0.98]"
        >
          <iconify-icon icon="lucide:flag" class="text-base"></iconify-icon>
          {t('community.reportCta')}
        </a>
      </div>
    </div>
  )
}
