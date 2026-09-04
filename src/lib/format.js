import i18n from '../i18n/index.js'

// Bölge ve Tarih Biçimi (Uygulama Ayarları) sets this — the only real
// region/format toggle in the app, since the timezone always follows the
// device's own, which is already correct without a manual override.
let timeFormat = '24h'
export function setTimeFormatPreference(value) {
  timeFormat = value === '12h' ? '12h' : '24h'
}

// Forces Western (0-9) digits regardless of language — 'ar' would otherwise
// render Eastern Arabic-Indic digits (٠١٢…) via its default numbering
// system, which would look inconsistent next to every {{count}} value
// interpolated elsewhere in the app (always plain JS numbers, always
// Western digits).
const NUMBERING_SYSTEM = { numberingSystem: 'latn' }

function locale() {
  return i18n.resolvedLanguage || i18n.language || 'tr'
}

export function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString(locale(), {
    ...NUMBERING_SYSTEM,
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  })
}

export function formatDateLong(dateStr) {
  if (!dateStr) return ''
  return new Intl.DateTimeFormat(locale(), {
    ...NUMBERING_SYSTEM,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

// Predictions can now seal to an exact minute (not just a day — see
// TahminOlustur's DateTimePicker), so anywhere the app tells someone when a
// sealed record opens needs the time-of-day alongside the date, not the
// date alone.
export function formatDateTimeLong(dateStr) {
  if (!dateStr) return ''
  return `${formatDateLong(dateStr)}, ${formatTime(dateStr)}`
}

// The inverse of timeAgo — a future date, phrased as a countdown ("3 saat
// sonra" / "5 gün sonra"). This is the app's one real curiosity hook (sealed
// content opening later), so the wording is shared verbatim everywhere a
// mühürlü kayıt's opening time shows up, not just Keşfet's "Yakında
// açılacaklar" where it first appeared.
export function formatTimeUntil(dateStr) {
  if (!dateStr) return ''
  const hoursLeft = Math.max(1, Math.round((new Date(dateStr).getTime() - Date.now()) / 3600000))
  return hoursLeft < 24
    ? i18n.t('time.hoursUntil', { count: hoursLeft })
    : i18n.t('time.daysUntil', { count: Math.round(hoursLeft / 24) })
}

// A sealed prediction's opening line, wherever a feed/list card shows one —
// covers both unlock mechanics (see TahminOlustur's "Açılış nasıl olsun?"):
// a scheduled event_date, or a manual seal (event_date null) that only opens
// when its author decides to.
export function sealLabel(eventDate) {
  return eventDate
    ? i18n.t('time.opensAt', { datetime: formatDateTimeLong(eventDate) })
    : i18n.t('time.sealedUntilAuthorOpens')
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return i18n.t('time.justNow')
  if (minutes < 60) return i18n.t('time.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return i18n.t('time.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return i18n.t('time.daysAgo', { count: days })
  return formatDateLong(dateStr)
}
