import { useTranslation } from 'react-i18next'
import { useUserSettings } from '../hooks/useUserSettings.js'
import { formatTime } from '../lib/format.js'
import { SUPPORTED_LANGUAGES } from '../i18n/index.js'
import DetailHeader from '../components/ui/DetailHeader.jsx'

export default function BolgeVeTarihBicimi() {
  const { t, i18n } = useTranslation()
  const { settings, update } = useUserSettings()
  const now = new Date().toISOString()
  const activeLanguage = i18n.resolvedLanguage || i18n.language

  function handleLanguageChange(code) {
    i18n.changeLanguage(code) // instant feedback
    update('region', { language: code }) // persisted, follows the account cross-device
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-10">
      <DetailHeader title={t('settings.regionTitle')} />

      <main className="px-5 pt-6">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">{t('settings.regionalPrefs')}</p>
          <h2 className="mt-2 font-heading text-[25px] font-extrabold leading-tight tracking-[-0.05em]">
            {t('settings.showTimeForYou')}
          </h2>
          <p className="mt-2 max-w-[350px] text-[13px] leading-5 text-muted-foreground">{t('settings.timeExplainer')}</p>
        </section>

        <section className="mt-7 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('settings.displayFormat')}</p>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{t('settings.timeFormatLabel')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('settings.timeFormatHint')}</p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
                {formatTime(now)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => update('region', { timeFormat: '24h' })}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-theme border text-sm font-bold ${
                  settings.region.timeFormat === '24h'
                    ? 'border-2 border-primary bg-secondary text-primary'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {settings.region.timeFormat === '24h' && <iconify-icon icon="lucide:check" class="text-base"></iconify-icon>}
                {t('settings.format24')}
              </button>
              <button
                onClick={() => update('region', { timeFormat: '12h' })}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-theme border text-sm font-bold ${
                  settings.region.timeFormat === '12h'
                    ? 'border-2 border-primary bg-secondary text-primary'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {settings.region.timeFormat === '12h' && <iconify-icon icon="lucide:check" class="text-base"></iconify-icon>}
                {t('settings.format12')}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">{t('settings.languageTitle')}</p>
          <p className="mt-2 max-w-[350px] text-[13px] leading-5 text-muted-foreground">{t('settings.languageHint')}</p>
        </section>

        <section className="mt-4 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
          {SUPPORTED_LANGUAGES.map((lang, i) => {
            const isActive = lang.code === activeLanguage
            return (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex w-full items-center justify-between px-4 py-3.5 text-left ${
                  i < SUPPORTED_LANGUAGES.length - 1 ? 'border-b border-border' : ''
                } transition-colors duration-150 active:bg-muted`}
              >
                <span className={`text-sm ${isActive ? 'font-bold text-primary' : 'font-semibold text-foreground'}`}>
                  {lang.nativeName}
                </span>
                {isActive && <iconify-icon icon="lucide:check" class="text-lg text-primary"></iconify-icon>}
              </button>
            )
          })}
        </section>

        <section className="mt-5 rounded-theme bg-muted p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
              <iconify-icon icon="lucide:calendar-clock" class="text-[15px]"></iconify-icon>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{t('settings.eventTimezoneTitle')}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{t('settings.eventTimezoneBody')}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
