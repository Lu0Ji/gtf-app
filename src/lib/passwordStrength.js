// SifreDegistir.jsx ve YeniSifreBelirle.jsx'te aynı 4 kriterlik CRITERIA
// dizisi bilerek iki ayrı kopya olarak tutulmuştu ("small enough that a
// shared import would cost more than it saves" — 2 kopya için makul bir
// karardı). 2026-09-14, kayıt formuna (Giris.jsx) da aynı güvenlik
// çubuğunu eklerken ("kayıt olurken güvenlikli şifre koydurtalım")
// hesap üçe çıktı — bu noktada paylaşılan bir dosya artık gerçekten daha
// ucuz, taşındı. Unicode-aware, script-specific değil — \p{Lu} herhangi
// bir alfabede (Latin, Kiril, Yunan, ...) büyük harfi yakalar, \p{L}/\p{N}
// dışı olmak "özel karakter" için Kiril ya da Arapça bir şifrenin kendi
// harflerinin yanlışlıkla özel karakter sayılmasını önlüyor.
export const CRITERIA = [
  { key: 'length', labelKey: 'settings.changePassword.criteriaLength', test: (v) => v.length >= 10 },
  { key: 'upper', labelKey: 'settings.changePassword.criteriaUpper', test: (v) => /\p{Lu}/u.test(v) },
  { key: 'digit', labelKey: 'settings.changePassword.criteriaDigit', test: (v) => /[0-9]/.test(v) },
  { key: 'special', labelKey: 'settings.changePassword.criteriaSpecial', test: (v) => /[^\p{L}\p{N}]/u.test(v) },
]
