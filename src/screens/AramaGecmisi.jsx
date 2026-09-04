import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSearchHistory, removeSearchHistoryEntry, clearSearchHistory } from '../lib/searchHistory.js'
import { formatTime, formatDateLong } from '../lib/format.js'
import DetailHeader from '../components/ui/DetailHeader.jsx'
import Card from '../components/ui/Card.jsx'

function groupByDay(entries, t) {
  const todayKey = new Date().toDateString()
  const yesterdayKey = new Date(Date.now() - 86400000).toDateString()
  const groups = new Map()
  for (const entry of entries) {
    const dayKey = new Date(entry.created_at).toDateString()
    const label =
      dayKey === todayKey ? t('settings.searchHistory.today') : dayKey === yesterdayKey ? t('settings.searchHistory.yesterday') : formatDateLong(entry.created_at)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(entry)
  }
  return Array.from(groups.entries())
}

export default function AramaGecmisi() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [entries, setEntries] = useState(() => getSearchHistory())
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  function handleRemove(query) {
    removeSearchHistoryEntry(query)
    setEntries(getSearchHistory())
  }

  function handleClear() {
    clearSearchHistory()
    setEntries([])
    setShowClearConfirm(false)
  }

  const grouped = groupByDay(entries, t)

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground font-body pb-8">
      <DetailHeader
        title={t('settings.searchHistory.title')}
        action={
          entries.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-theme px-2 text-xs font-bold text-destructive"
            >
              <iconify-icon icon="lucide:trash-2" class="text-[17px]"></iconify-icon>
              {t('settings.searchHistory.clear')}
            </button>
          )
        }
      />

      <main className="px-5 pt-6">
        <Card as="section">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:history" class="text-xl"></iconify-icon>
            </div>
            <div>
              <h2 className="font-heading text-sm font-extrabold tracking-[-0.025em]">{t('settings.searchHistory.deviceOnlyTitle')}</h2>
              <p className="mt-1 max-w-[240px] text-[11px] leading-4 text-muted-foreground">{t('settings.searchHistory.deviceOnlyBody')}</p>
            </div>
          </div>
        </Card>

        {grouped.length === 0 ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">{t('settings.searchHistory.empty')}</p>
        ) : (
          grouped.map(([label, group]) => (
            <section key={label} className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                <span className="text-[11px] font-medium text-muted-foreground">{t('settings.searchHistory.searchCount', { count: group.length })}</span>
              </div>
              <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
                {group.map((entry, i) => (
                  <div key={entry.query}>
                    <div className="flex min-h-[68px] items-center gap-3 px-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-muted text-primary">
                        <iconify-icon icon="lucide:search" class="text-[19px]"></iconify-icon>
                      </div>
                      <button
                        onClick={() => navigate('/kesfet', { state: { query: entry.query } })}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-bold text-foreground">{entry.query}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{formatTime(entry.created_at)}</p>
                      </button>
                      <button
                        aria-label={t('settings.searchHistory.removeAria', { query: entry.query })}
                        onClick={() => handleRemove(entry.query)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground"
                      >
                        <iconify-icon icon="lucide:x" class="text-[18px]"></iconify-icon>
                      </button>
                    </div>
                    {i < group.length - 1 && <div className="mx-4 h-px bg-border" />}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {showClearConfirm && (
        <>
          <div className="fixed inset-0 z-20 bg-foreground/25 backdrop-blur-[1px]" onClick={() => setShowClearConfirm(false)} />
          <div className="fixed inset-x-0 bottom-0 z-30 px-5 pb-7">
            <section className="rounded-theme border border-border bg-card p-5 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-muted text-destructive">
                  <iconify-icon icon="lucide:trash-2" class="text-xl"></iconify-icon>
                </div>
                <div>
                  <h2 className="font-heading text-[17px] font-extrabold tracking-[-0.035em]">
                    {t('settings.searchHistory.clearConfirmTitle')}
                  </h2>
                  <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                    {t('settings.searchHistory.clearConfirmBody', { count: entries.length })}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex h-11 flex-1 items-center justify-center rounded-theme border border-border bg-card text-sm font-bold text-foreground"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleClear}
                  className="flex h-11 flex-1 items-center justify-center rounded-theme bg-destructive text-sm font-bold text-destructive-foreground shadow-sm"
                >
                  {t('settings.searchHistory.clearCta')}
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
