import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Calendar + time picker for "Açılış tarihi" — replaces a bare
// <input type="date"> (no time granularity, and every browser renders its
// own unstyled native widget) so predictions can seal to an exact minute,
// not just a day, with one look across Android/iOS/desktop.
//
// Fully controlled: `value` is an ISO datetime string (or ''), `onChange`
// fires with a new ISO string on every day/hour/minute/quick-pick tap. No
// internal draft state to reconcile — simplest way to keep this a dumb,
// reusable piece while TahminOlustur.jsx owns validation (e.g. rejecting a
// combination that ends up in the past).
//
// Weekday/month names come from Intl (via the active i18n language), not a
// hand-translated array — every supported locale's calendar naming is
// already correct for free, and it doesn't drift if a language gets added
// later without someone remembering to extend a MONTHS array by hand.

const MINUTE_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Builds a Monday-first 6-week grid (42 cells) covering `month` (0-11) of
// `year`, padded with the trailing days of the previous/next month so the
// grid never has a ragged first/last row.
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // Mon=0..Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true })
  }
  let next = 1
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, next), inMonth: false })
    next += 1
  }
  return cells
}

function thisEveningAt(hour, minute) {
  const now = new Date()
  const candidate = new Date(now)
  candidate.setHours(hour, minute, 0, 0)
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1)
  return candidate
}

function tomorrowAt(hour, minute) {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, minute, 0, 0)
  return d
}

function nextSaturdayAt(hour, minute) {
  const d = new Date()
  const diff = ((6 - d.getDay() + 7) % 7) || 7 // always the *next* Saturday, even if today is one
  d.setDate(d.getDate() + diff)
  d.setHours(hour, minute, 0, 0)
  return d
}

function inOneHour() {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0)
  return d
}

const QUICK_PICKS = [
  { labelKey: 'datePicker.quickInOneHour', icon: 'lucide:zap', resolve: inOneHour },
  { labelKey: 'datePicker.quickTonight', icon: 'lucide:sunset', resolve: () => thisEveningAt(20, 0) },
  { labelKey: 'datePicker.quickTomorrow', icon: 'lucide:sunrise', resolve: () => tomorrowAt(9, 0) },
  { labelKey: 'datePicker.quickWeekend', icon: 'lucide:calendar-heart', resolve: () => nextSaturdayAt(12, 0) },
]

export default function DateTimePicker({ value, onChange, timeFormat = '24h' }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage || i18n.language
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(value) : null
  const [viewDate, setViewDate] = useState(() => selected || new Date())

  const grid = useMemo(() => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate])
  const today = startOfToday()
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale])
  // 2024-01-01 was a Monday — walking 7 days from there gives short weekday
  // names in Monday-first order, matching buildMonthGrid's own grid.
  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekdayFormatter.format(new Date(2024, 0, 1 + i))),
    [weekdayFormatter]
  )
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', numberingSystem: 'latn' }).format(viewDate)

  function emit(next) {
    onChange(next.toISOString())
  }

  function pickDay(date) {
    const next = new Date(date)
    if (selected) {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
    } else {
      const soon = inOneHour()
      next.setHours(soon.getHours(), soon.getMinutes(), 0, 0)
    }
    emit(next)
  }

  function pickHour(hour) {
    const base = selected ? new Date(selected) : inOneHour()
    base.setHours(hour)
    emit(base)
  }

  function pickMinute(minute) {
    const base = selected ? new Date(selected) : inOneHour()
    base.setMinutes(minute)
    emit(base)
  }

  const displayLabel = selected
    ? `${selected.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn' })} · ${selected.toLocaleTimeString(
        locale,
        { hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h', numberingSystem: 'latn' }
      )}`
    : null

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setViewDate(selected || new Date())
          setOpen(true)
        }}
        className="mt-3 flex w-full items-center gap-3 rounded-theme border border-border bg-input px-4 py-3.5 text-left shadow-sm"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
          <iconify-icon icon="lucide:calendar-clock" class="text-[18px]"></iconify-icon>
        </span>
        <span className="min-w-0 flex-1">
          {displayLabel ? (
            <span className="block text-sm font-bold text-foreground">{displayLabel}</span>
          ) : (
            <span className="block text-sm font-semibold text-muted-foreground">{t('datePicker.placeholder')}</span>
          )}
        </span>
        <iconify-icon icon="lucide:chevron-right" class="shrink-0 text-lg text-muted-foreground"></iconify-icon>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full overflow-y-auto rounded-t-theme bg-background p-5 pb-safe-8"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold">{t('datePicker.modalTitle')}</h2>
              <button onClick={() => setOpen(false)} aria-label={t('datePicker.closeAria')} className="text-muted-foreground">
                <iconify-icon icon="lucide:x" class="text-xl"></iconify-icon>
              </button>
            </div>

            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {QUICK_PICKS.map((qp) => (
                <button
                  key={qp.labelKey}
                  type="button"
                  onClick={() => emit(qp.resolve())}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-card-foreground shadow-sm"
                >
                  <iconify-icon icon={qp.icon} class="text-sm text-primary"></iconify-icon>
                  {t(qp.labelKey)}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-theme border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label={t('datePicker.prevMonthAria')}
                  onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-theme text-muted-foreground"
                >
                  <iconify-icon icon="lucide:chevron-left" class="text-lg"></iconify-icon>
                </button>
                <p className="font-heading text-sm font-extrabold tracking-tight">
                  {monthLabel} {viewDate.getFullYear()}
                </p>
                <button
                  type="button"
                  aria-label={t('datePicker.nextMonthAria')}
                  onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-theme text-muted-foreground"
                >
                  <iconify-icon icon="lucide:chevron-right" class="text-lg"></iconify-icon>
                </button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
                {weekdays.map((w, i) => (
                  <span key={i} className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {w}
                  </span>
                ))}
                {grid.map(({ date, inMonth }) => {
                  const isPast = date < today
                  const isToday = sameDay(date, today)
                  const isSelected = selected && sameDay(date, selected)
                  const disabled = isPast || !inMonth
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      disabled={disabled}
                      onClick={() => pickDay(date)}
                      className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : isToday
                            ? 'border-2 border-primary text-primary'
                            : disabled
                              ? 'text-muted-foreground/30'
                              : 'text-foreground'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 rounded-theme border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <iconify-icon icon="lucide:clock" class="text-base text-primary"></iconify-icon>
                <p className="text-sm font-bold text-foreground">{t('datePicker.hourTitle')}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <select
                  aria-label={t('datePicker.hourLabel')}
                  value={selected ? selected.getHours() : ''}
                  onChange={(e) => pickHour(Number(e.target.value))}
                  className="flex-1 rounded-theme border border-border bg-input px-3 py-3 text-center font-heading text-base font-bold text-foreground shadow-sm outline-none"
                >
                  {!selected && <option value="" disabled>--</option>}
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <span className="font-heading text-lg font-extrabold text-muted-foreground">:</span>
                <select
                  aria-label={t('datePicker.minuteLabel')}
                  value={selected ? MINUTE_STEPS.reduce((closest, m) => (Math.abs(m - selected.getMinutes()) < Math.abs(closest - selected.getMinutes()) ? m : closest), 0) : ''}
                  onChange={(e) => pickMinute(Number(e.target.value))}
                  className="flex-1 rounded-theme border border-border bg-input px-3 py-3 text-center font-heading text-base font-bold text-foreground shadow-sm outline-none"
                >
                  {!selected && <option value="" disabled>--</option>}
                  {MINUTE_STEPS.map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={!selected}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground shadow-sm disabled:opacity-50"
            >
              {t('datePicker.ok')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
