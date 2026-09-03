// Bölge ve Tarih Biçimi (Uygulama Ayarları) sets this — the only real
// region/format toggle in the app, since every date elsewhere already
// renders as a spelled-out Turkish date (no numeric DD.MM vs MM/DD
// ambiguity to resolve) and the timezone always follows the device's own,
// which is already correct without a manual override.
let timeFormat = '24h'
export function setTimeFormatPreference(value) {
  timeFormat = value === '12h' ? '12h' : '24h'
}

export function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  })
}

export function formatDateLong(dateStr) {
  if (!dateStr) return ''
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(dateStr)
  )
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
  return hoursLeft < 24 ? `${hoursLeft} saat sonra` : `${Math.round(hoursLeft / 24)} gün sonra`
}

// A sealed prediction's opening line, wherever a feed/list card shows one —
// covers both unlock mechanics (see TahminOlustur's "Açılış nasıl olsun?"):
// a scheduled event_date, or a manual seal (event_date null) that only opens
// when its author decides to.
export function sealLabel(eventDate) {
  return eventDate ? `${formatDateTimeLong(eventDate)}'da açılacak` : 'Yazarı açana kadar mühürlü'
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'az önce'
  if (minutes < 60) return `${minutes} dk`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} sa`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} gün`
  return formatDateLong(dateStr)
}
