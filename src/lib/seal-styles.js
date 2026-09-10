// docs/designs/seal-customization-strategy.md, Approach A — badges.js'in
// ikizi. Her stil bir slug + hangi rozetle açıldığı bilgisi (unlockBadgeSlug
// null ise herkese açık). Kilit açma kontrolü tamamen istemci tarafında,
// showcase_badges ile aynı güven modelinde (bkz. tasarım dokümanının
// Constraints/Dependencies bölümleri) — sunucu tarafında yeniden doğrulama
// yok, badges.js kataloğunda o slug'ın gerçekten var olması yeterli.
//
// 'basic', bugünkü mevcut görünümün birebir aynısı — Success Criteria'nın
// şartı, yeni sistemin bir yan etkisi olarak burada hiçbir şey değişmedi.
//
// Geri kalan üç stil "decorated: true" taşıyor — TahminKaydi.jsx'teki
// SealDecoration.jsx'in çizdiği balmumu mühür madalyonu + kurdele + doku
// katmanını tetikliyor (2026-09-10: kullanıcı ilk sürümün sadece renk
// değiştirdiğini, gerçekten mühürlü bir şey gibi bir GÖRSEL istediğini
// belirtti). `decorated` olmayan bir stil (basic) bu katmanı hiç görmez —
// SealDecoration `style.decorated` yoksa null döner. medallionGradient/
// medallionIconColor/ribbonGradient, her kostümün kendi renk kimliğini
// taşıması için SealDecoration'a parametre olarak geçiliyor — bileşenin
// kendisi tamamen jenerik, yeni bir kostüm eklemek yeni bir render dalı
// değil, sadece bu paletlerden biri daha demek.
//
// 2026-09-10, ikinci istek: "kişiselleştirmeyi arttıralım, birkaç tane
// daha mühürleme kostümü ekleyelim". Kilit rozetleri badges.js'in kendi
// kataloğundan, isimleri kostüm temasıyla zaten örtüşen ikisi seçildi
// (rastgele/yeni rozet icat etmek yerine — badges.js'te 'onay-damgasi' ve
// 'surec-muhru' zaten "mühür/damga" temalı, lucide:stamp ikonlu): ustalık
// katmanında 'noter' (Onay Damgası rozetiyle açılıyor), efsane katmanında
// 'altin' (Süreç Mührü rozetiyle açılıyor, en yüksek eşik). 'ferman'
// (başlangıç katmanı) ile birlikte artık 3 katmanlı bir ilerleme var —
// rozet sisteminin kendi başlangıç/ustalık/efsane katmanlarıyla eşleşiyor
// (istikrar katmanında "mühür" temalı bir rozet yoktu, zorla uydurulmadı).
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
    medallionGradient: 'radial-gradient(circle at 35% 30%, #d9b04a, #a9791f 70%, #8a611a 100%)',
    medallionIconColor: '#3d2a0a',
    ribbonGradient: 'linear-gradient(180deg, #c9a227, #8a611a)',
  },
  {
    // "Noter Mührü" — onay-damgasi rozetiyle açılıyor (ustalık, 40 doğru
    // sonuç). Ferman'ın bordo/altınından bilinçli olarak uzak: soğuk yeşil/
    // gümüş, resmî bir onay/tasdik hissi — ferman'ın "tarihi belge"
    // temasından farklı bir kimlik, aynı paletin bir varyasyonu değil.
    slug: 'noter',
    titleKey: 'sealStyles.noter.title',
    unlockBadgeSlug: 'onay-damgasi',
    containerClassName: 'bg-[#1f4a3d] text-[#e8f3ee]',
    accentBorderClassName: 'border-[#9fb8ad]/25',
    lockIcon: 'lucide:stamp',
    decorated: true,
    medallionIcon: 'lucide:stamp',
    medallionGradient: 'radial-gradient(circle at 35% 30%, #c7ccc9, #8a938d 70%, #6b736d 100%)',
    medallionIconColor: '#24312b',
    ribbonGradient: 'linear-gradient(180deg, #b8c4bd, #7d8983)',
  },
  {
    // "Altın Mühür" — surec-muhru rozetiyle açılıyor (efsane, 100 doğru
    // sonuç) — kataloğun en yüksek eşiği, en nadir kostüm. Koyu mor/lacivert
    // zemin + parlak altın: efsane katmanının BadgeMedallion.jsx'teki
    // camsı/parıltılı muamelesiyle aynı "bunu gerçekten kazandın" hissi.
    slug: 'altin',
    titleKey: 'sealStyles.altin.title',
    unlockBadgeSlug: 'surec-muhru',
    containerClassName: 'bg-[#241640] text-[#f3e9ff]',
    accentBorderClassName: 'border-[#e0b64d]/25',
    lockIcon: 'lucide:crown',
    decorated: true,
    medallionIcon: 'lucide:crown',
    medallionGradient: 'radial-gradient(circle at 35% 30%, #fbe38a, #d9a836 55%, #a97c1e 100%)',
    medallionIconColor: '#4a2e05',
    ribbonGradient: 'linear-gradient(180deg, #e0b64d, #a97c1e)',
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
