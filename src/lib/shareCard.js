// "Sonucu paylaş" kartı (2026-09-12, öneri #2 — "diğer sosyal medya
// araçlarından esinlenebiliriz", Wordle'ın paylaşılabilir sonuç kartı
// modeli). Saf Canvas 2D API — yeni bir bağımlılık eklemeden (reuse ladder:
// önce platform özelliği), zaten her sayfada yüklü Manrope/Inter'i
// kullanıyor (bkz. index.html'deki Google Fonts linki).
//
// İkon çizmek için Lucide'ın SVG path verisi gerekirdi (karmaşık, kırılgan
// bir kopya) — bunun yerine sonuç rozeti (✓/✗) doğrudan canvas path'leriyle
// çiziliyor, emoji de değil (platformlar arası tutarsız render).
//
// Kartın kendi rengi her zaman light-mode tonları kullanıyor, paylaşımı
// alan kişinin uygulama temasından bağımsız — bir görsel paylaşıldığında
// kimin ekranında nasıl göründüğünü kontrol edemeyiz, sabit ve her yerde
// aynı görünen bir tasarım daha güvenli.
const WIDTH = 1080
const HEIGHT = 1350

const COLORS = {
  correctFrom: '#2f8f68',
  correctTo: '#1f5c43',
  incorrectFrom: '#c9535b',
  incorrectTo: '#8f2e34',
  cream: '#fdf8ee',
}

// sealed_content'in bir uzunluk sınırı yok (TahminOlustur.jsx'te maxLength
// eklenmemiş) — kutunun yüksekliği satır sayısına göre büyüyor, sınırsız
// büyürse kategori etiketi/alt bilgiyle çakışır (uzun bir metinle test
// edilip görüldü, tahmin edilip atlanmadı). Kart sabit yükseklikte olduğu
// için metni burada kısaltmak, kutuyu sınırsız büyütmekten daha güvenli.
const MAX_QUOTE_CHARS = 150

function truncateQuote(text) {
  if (text.length <= MAX_QUOTE_CHARS) return text
  return `${text.slice(0, MAX_QUOTE_CHARS).trimEnd()}…`
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawResultBadge(ctx, cx, cy, radius, isCorrect) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.stroke()

  ctx.strokeStyle = COLORS.cream
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = radius * 0.16
  ctx.beginPath()
  if (isCorrect) {
    ctx.moveTo(cx - radius * 0.45, cy + radius * 0.05)
    ctx.lineTo(cx - radius * 0.12, cy + radius * 0.35)
    ctx.lineTo(cx + radius * 0.5, cy - radius * 0.35)
  } else {
    ctx.moveTo(cx - radius * 0.4, cy - radius * 0.4)
    ctx.lineTo(cx + radius * 0.4, cy + radius * 0.4)
    ctx.moveTo(cx + radius * 0.4, cy - radius * 0.4)
    ctx.lineTo(cx - radius * 0.4, cy + radius * 0.4)
  }
  ctx.stroke()
  ctx.restore()
}

export async function generateResultShareCard({ sealedContent, categoryLabel, isCorrect, verifiedDateLabel, username }) {
  // Manrope/Inter zaten dokümanda yükleniyor (index.html) — canvas metni
  // ilk çizimde henüz hazır olmayan bir fontu sessizce sistem fontuna
  // düşürebilir, document.fonts.ready bunu bekliyor.
  await document.fonts.load('800 64px Manrope')
  await document.fonts.load('700 40px Inter')
  await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  if (isCorrect) {
    gradient.addColorStop(0, COLORS.correctFrom)
    gradient.addColorStop(1, COLORS.correctTo)
  } else {
    gradient.addColorStop(0, COLORS.incorrectFrom)
    gradient.addColorStop(1, COLORS.incorrectTo)
  }
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // İnce nokta dokusu — SealDecoration.jsx'in mühür kartlarındaki aynı
  // "kağıt" hissi, marka tutarlılığı için.
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  for (let y = 0; y < HEIGHT; y += 6) {
    for (let x = 0; x < WIDTH; x += 6) {
      ctx.fillRect(x, y, 1.5, 1.5)
    }
  }

  ctx.textAlign = 'center'

  // Eyebrow
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '700 32px Inter'
  ctx.letterSpacing = '6px'
  ctx.fillText('GUESS THE FUTURE', WIDTH / 2, 110)
  ctx.letterSpacing = '0px'

  // Rozet
  drawResultBadge(ctx, WIDTH / 2, 300, 110, isCorrect)

  // Başlık
  ctx.fillStyle = COLORS.cream
  ctx.font = '800 76px Manrope'
  ctx.fillText(isCorrect ? 'TAHMİN TUTTU!' : 'TAHMİN TUTMADI', WIDTH / 2, 500)

  // Alıntı kutusu
  const boxX = 90
  const boxWidth = WIDTH - boxX * 2
  ctx.font = '600 44px Inter'
  const lines = wrapText(ctx, `"${truncateQuote(sealedContent)}"`, boxWidth - 100)
  const lineHeight = 62
  const boxPaddingY = 70
  const boxHeight = lines.length * lineHeight + boxPaddingY * 2
  const boxY = 580

  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 32)
  ctx.fill()

  ctx.fillStyle = COLORS.cream
  let ly = boxY + boxPaddingY + 36
  for (const line of lines) {
    ctx.fillText(line, WIDTH / 2, ly)
    ly += lineHeight
  }

  // Kategori etiketi
  const chipY = boxY + boxHeight + 70
  ctx.font = '700 30px Inter'
  const chipText = categoryLabel.toUpperCase()
  const chipTextWidth = ctx.measureText(chipText).width
  const chipPaddingX = 36
  const chipWidth = chipTextWidth + chipPaddingX * 2
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.beginPath()
  ctx.roundRect(WIDTH / 2 - chipWidth / 2, chipY, chipWidth, 68, 34)
  ctx.fill()
  ctx.fillStyle = COLORS.cream
  ctx.fillText(chipText, WIDTH / 2, chipY + 46)

  // Alt bilgi
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = '500 32px Inter'
  ctx.fillText(verifiedDateLabel, WIDTH / 2, HEIGHT - 130)
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '700 36px Inter'
  ctx.fillText(username ? `@${username} · GTF` : 'GTF', WIDTH / 2, HEIGHT - 80)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}
