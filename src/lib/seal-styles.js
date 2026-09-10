// docs/designs/seal-customization-strategy.md, Approach A — badges.js'in
// ikizi. Her stil bir slug + hangi rozetle açıldığı bilgisi (unlockBadgeSlug
// null ise herkese açık). Kilit açma kontrolü tamamen istemci tarafında,
// showcase_badges ile aynı güven modelinde (bkz. tasarım dokümanının
// Constraints/Dependencies bölümleri) — sunucu tarafında yeniden doğrulama
// yok, badges.js kataloğunda o slug'ın gerçekten var olması yeterli.
//
// 'basic', bugünkü mevcut görünümün birebir aynısı — Success Criteria'nın
// şartı, yeni sistemin bir yan etkisi olarak burada hiçbir şey değişmedi.
// 'ferman', ilk kostüm (padişah fermanı teması). Kullanıcı ilk sürümün sadece
// renk değiştirdiğini, gerçekten mühürlü bir ferman gibi bir GÖRSEL istediğini
// belirtti (2026-09-10) — `decorated: true` + `medallionIcon`, TahminKaydi.jsx'te
// SealDecoration.jsx'in çizdiği balmumu mühür madalyonu + kurdele + doku
// katmanını tetikliyor (bkz. o dosyanın başındaki not). `decorated` olmayan
// bir stil (basic) bu katmanı hiç görmez — SealDecoration `style.decorated`
// yoksa null döner.
export const SEAL_STYLES = [
  {
    slug: 'basic',
    titleKey: 'sealStyles.basic.title',
    unlockBadgeSlug: null,
    containerClassName: 'bg-primary text-primary-foreground',
    accentBorderClassName: 'border-white/10',
    lockIcon: 'lucide:lock-keyhole',
  },
  {
    slug: 'ferman',
    titleKey: 'sealStyles.ferman.title',
    unlockBadgeSlug: 'ilk-dogrulama',
    containerClassName: 'bg-[#6b1f2a] text-[#f6e9c9]',
    accentBorderClassName: 'border-[#c9a227]/25',
    lockIcon: 'lucide:scroll-text',
    decorated: true,
    medallionIcon: 'lucide:stamp',
  },
]

const DEFAULT_STYLE = SEAL_STYLES[0]

// Kataloğu bulunamayan bir equipped_seal_style değeri (silinmiş/yeniden
// adlandırılmış kostüm — bkz. Open Questions "Katalog kayması") sessizce
// 'basic' gibi davranır, hata fırlatmaz.
export function findSealStyle(slug) {
  return SEAL_STYLES.find((s) => s.slug === slug) || DEFAULT_STYLE
}

export function isSealStyleUnlocked(style, earnedBadgeSlugs) {
  if (!style.unlockBadgeSlug) return true
  return earnedBadgeSlugs.has(style.unlockBadgeSlug)
}
