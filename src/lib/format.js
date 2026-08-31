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
