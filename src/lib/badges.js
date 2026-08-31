// 120-badge catalog, expanded from FireVibe's Rozetler redesign (4 tiers:
// Başlangıç/İstikrar/Ustalık/Efsane, 30 each). FireVibe's own screen
// markup only fully specified ~24 of the 120 with real criteria — the
// rest were just names in a "diğer X rozet" list. Every badge below still
// uses a REAL, already-tracked metric (see computeBadgeStats) — none are
// fabricated/unmeasurable placeholders, even where the exact criterion
// had to be invented to fit an under-specified name.

export const TIERS = [
  { key: 'baslangic', label: 'Başlangıç', tint: '#E4F0F6', ink: 'var(--color-primary)' },
  { key: 'istikrar', label: 'İstikrar', tint: '#E4EAF0', ink: '#183B5B' },
  { key: 'ustalik', label: 'Ustalık', tint: '#DDEDEA', ink: 'var(--color-success)' },
  { key: 'efsane', label: 'Efsane', tint: '#EAE4F1', ink: '#6B5A97' },
]

// metric: key into the stats object computed by computeBadgeStats().
// target: the value `metric` must reach.
// minAccuracy: optional — badge also requires stats.accuracyPct >= this.
export const BADGES = [
  // ── BAŞLANGIÇ ──────────────────────────────────────────────────────
  { slug: 'ilk-kayit', tier: 'baslangic', icon: 'lucide:pen-line', title: 'İlk Kayıt', desc: 'İlk mühürlü tahminini yayımla.', metric: 'predictionsCreated', target: 1 },
  { slug: 'ilk-takip', tier: 'baslangic', icon: 'lucide:user-plus', title: 'İlk Takip', desc: 'Bir öngörü sahibini takip et.', metric: 'following', target: 1 },
  { slug: 'ilk-halka', tier: 'baslangic', icon: 'lucide:circle-dot', title: 'İlk Halka', desc: 'İlk grubuna katıl.', metric: 'groupsJoined', target: 1 },
  { slug: 'ilk-yorum', tier: 'baslangic', icon: 'lucide:message-circle', title: 'İlk Yorum', desc: 'Bir tahmine düşünceni ekle.', metric: 'commentsGiven', target: 1 },
  { slug: 'yarin-notu', tier: 'baslangic', icon: 'lucide:calendar-days', title: 'Yarın Notu', desc: '7 gün sonrası için bir tahmin oluştur.', metric: 'weekAheadCount', target: 1 },
  { slug: 'etiket-defteri', tier: 'baslangic', icon: 'lucide:tags', title: 'Etiket Defteri', desc: '3 farklı kategoride tahmin yayımla.', metric: 'distinctCategories', target: 3 },
  { slug: 'ilk-isaret', tier: 'baslangic', icon: 'lucide:bookmark', title: 'İlk İşaret', desc: 'Bir tahmini kaydet.', metric: 'savesCount', target: 1 },
  { slug: 'acik-bakis', tier: 'baslangic', icon: 'lucide:eye', title: 'Açık Bakış', desc: '5 tahmini beğen.', metric: 'likesGiven', target: 5 },
  { slug: 'ilk-arsiv', tier: 'baslangic', icon: 'lucide:folder-open', title: 'İlk Arşiv', desc: 'Bir zaman kapsülü oluştur.', metric: 'capsulesCreated', target: 1 },
  { slug: 'yon-bul', tier: 'baslangic', icon: 'lucide:compass', title: 'Yön Bul', desc: 'Bir grup içinde tahmin paylaş.', metric: 'groupPredictionsCount', target: 1 },
  { slug: 'ilk-paylasim', tier: 'baslangic', icon: 'lucide:image', title: 'İlk Paylaşım', desc: 'Görsel ekleyerek bir tahmin paylaş.', metric: 'mediaUsedCount', target: 1 },
  { slug: 'dengeli-secim', tier: 'baslangic', icon: 'lucide:scale', title: 'Dengeli Seçim', desc: '2 farklı kategoride tahmin yaz.', metric: 'distinctCategories', target: 2 },
  { slug: 'sessiz-not', tier: 'baslangic', icon: 'lucide:eye-off', title: 'Sessiz Not', desc: 'Hassas içerik olarak işaretlenmiş bir tahmin oluştur.', metric: 'sensitiveMarked', target: 1 },
  { slug: 'ilk-dogrulama', tier: 'baslangic', icon: 'lucide:badge-check', title: 'İlk Doğrulama', desc: 'İlk tahminin sonuçlansın.', metric: 'predictionsVerified', target: 1 },
  { slug: 'konu-tohumu', tier: 'baslangic', icon: 'lucide:sprout', title: 'Konu Tohumu', desc: 'Kendi grubunu kur.', metric: 'groupsCreated', target: 1 },
  { slug: 'ufuk-cizgisi', tier: 'baslangic', icon: 'lucide:sunrise', title: 'Ufuk Çizgisi', desc: '30 gün sonrası için bir tahmin oluştur.', metric: 'monthAheadCount', target: 1 },
  { slug: 'acilis-saati', tier: 'baslangic', icon: 'lucide:alarm-clock', title: 'Açılış Saati', desc: 'Açılış gününde bir sonucu işaretle.', metric: 'sameDayVerifyCount', target: 1 },
  { slug: 'gozlemci', tier: 'baslangic', icon: 'lucide:bookmark-check', title: 'Gözlemci', desc: '3 tahmini kaydet.', metric: 'savesCount', target: 3 },
  { slug: 'soru-isareti', tier: 'baslangic', icon: 'lucide:flag', title: 'Soru İşareti', desc: 'Şüphelendiğin bir sonuca itiraz et.', metric: 'disputesRaised', target: 1 },
  { slug: 'ilk-kanit', tier: 'baslangic', icon: 'lucide:link', title: 'İlk Kanıt', desc: 'Bir sonucu kaynak göstererek doğrula.', metric: 'evidenceUsedCount', target: 1 },
  { slug: 'kisa-vade', tier: 'baslangic', icon: 'lucide:zap', title: 'Kısa Vade', desc: '3 gün içinde açılacak bir tahmin oluştur.', metric: 'shortTermCount', target: 1 },
  { slug: 'net-cumle', tier: 'baslangic', icon: 'lucide:message-square', title: 'Net Cümle', desc: '3 yorum yaz.', metric: 'commentsGiven', target: 3 },
  { slug: 'takvim-yapragi', tier: 'baslangic', icon: 'lucide:calendar', title: 'Takvim Yaprağı', desc: '3 tahmin oluştur.', metric: 'predictionsCreated', target: 3 },
  { slug: 'ortak-nokta', tier: 'baslangic', icon: 'lucide:users', title: 'Ortak Nokta', desc: 'Gruplarda 3 tahmin paylaş.', metric: 'groupPredictionsCount', target: 3 },
  { slug: 'iz-surucu', tier: 'baslangic', icon: 'lucide:footprints', title: 'İz Sürücü', desc: '10 tahmini beğen.', metric: 'likesGiven', target: 10 },
  { slug: 'ilk-yanit', tier: 'baslangic', icon: 'lucide:reply', title: 'İlk Yanıt', desc: 'Tahminine ilk yorum gelsin.', metric: 'commentsReceived', target: 1 },
  { slug: 'konu-kapisi', tier: 'baslangic', icon: 'lucide:door-open', title: 'Konu Kapısı', desc: 'İkinci bir gruba katıl.', metric: 'groupsJoined', target: 2 },
  { slug: 'gunluk-kayit', tier: 'baslangic', icon: 'lucide:sun', title: 'Günlük Kayıt', desc: '2 gün üst üste aktif ol.', metric: 'streakCount', target: 2 },
  { slug: 'acik-sayfa', tier: 'baslangic', icon: 'lucide:book-open', title: 'Açık Sayfa', desc: 'İkinci zaman kapsülünü oluştur.', metric: 'capsulesCreated', target: 2 },
  { slug: 'kucuk-adim', tier: 'baslangic', icon: 'lucide:footprints', title: 'Küçük Adım', desc: 'Hesabınla 7 gün geçir.', metric: 'accountAgeDays', target: 7 },

  // ── İSTİKRAR ───────────────────────────────────────────────────────
  { slug: 'duzenli-notlar', tier: 'istikrar', icon: 'lucide:notebook-pen', title: 'Düzenli Notlar', desc: '4 hafta üst üste aktif ol.', metric: 'streakCount', target: 28 },
  { slug: 'on-gunluk-iz', tier: 'istikrar', icon: 'lucide:calendar-check-2', title: 'On Günlük İz', desc: '10 ayrı günde kayıt tut.', metric: 'streakCount', target: 10 },
  { slug: 'donus-noktasi', tier: 'istikrar', icon: 'lucide:repeat-2', title: 'Dönüş Noktası', desc: '5 sonuç kaydını aç.', metric: 'predictionsVerified', target: 5 },
  { slug: 'uzun-vade', tier: 'istikrar', icon: 'lucide:milestone', title: 'Uzun Vade', desc: '90 gün sonrası için bir tahmin oluştur.', metric: 'longAheadCount', target: 1 },
  { slug: 'haftanin-sesi', tier: 'istikrar', icon: 'lucide:mic', title: 'Haftanın Sesi', desc: '7 yorum yaz.', metric: 'commentsGiven', target: 7 },
  { slug: 'sakin-akis', tier: 'istikrar', icon: 'lucide:wind', title: 'Sakin Akış', desc: '20 tahmini beğen.', metric: 'likesGiven', target: 20 },
  { slug: 'sureklilik', tier: 'istikrar', icon: 'lucide:link-2', title: 'Süreklilik', desc: '14 gün üst üste aktif ol.', metric: 'streakCount', target: 14 },
  { slug: 'takvim-ustasi', tier: 'istikrar', icon: 'lucide:calendar-range', title: 'Takvim Ustası', desc: '15 tahmin oluştur.', metric: 'predictionsCreated', target: 15 },
  { slug: 'yedi-gun', tier: 'istikrar', icon: 'lucide:flame', title: 'Yedi Gün', desc: '7 gün üst üste aktif ol.', metric: 'streakCount', target: 7 },
  { slug: 'otuz-gun', tier: 'istikrar', icon: 'lucide:flame', title: 'Otuz Gün', desc: '30 gün üst üste aktif ol.', metric: 'streakCount', target: 30 },
  { slug: 'iz-birakan-istikrar', tier: 'istikrar', icon: 'lucide:footprints', title: 'İz Bırakan', desc: '25 tahmin oluştur.', metric: 'predictionsCreated', target: 25 },
  { slug: 'sabit-pusula', tier: 'istikrar', icon: 'lucide:compass', title: 'Sabit Pusula', desc: '5 farklı kategoride tahmin yaz.', metric: 'distinctCategories', target: 5 },
  { slug: 'araliksiz-gozlem', tier: 'istikrar', icon: 'lucide:eye', title: 'Aralıksız Gözlem', desc: '30 tahmini beğen.', metric: 'likesGiven', target: 30 },
  { slug: 'gun-sonu', tier: 'istikrar', icon: 'lucide:sunset', title: 'Gün Sonu', desc: '3 sonucu açılış gününde işaretle.', metric: 'sameDayVerifyCount', target: 3 },
  { slug: 'haftalik-bakis', tier: 'istikrar', icon: 'lucide:calendar-search', title: 'Haftalık Bakış', desc: '15 yorum yaz.', metric: 'commentsGiven', target: 15 },
  { slug: 'aylik-cizgi', tier: 'istikrar', icon: 'lucide:line-chart', title: 'Aylık Çizgi', desc: '15 sonuç aç.', metric: 'predictionsVerified', target: 15 },
  { slug: 'rota-tutucu', tier: 'istikrar', icon: 'lucide:route', title: 'Rota Tutucu', desc: 'Gruplarda 5 tahmin paylaş.', metric: 'groupPredictionsCount', target: 5 },
  { slug: 'dengeli-defter', tier: 'istikrar', icon: 'lucide:scale', title: 'Dengeli Defter', desc: '6 farklı kategoride tahmin yaz.', metric: 'distinctCategories', target: 6 },
  { slug: 'tekrar-eden', tier: 'istikrar', icon: 'lucide:repeat', title: 'Tekrar Eden', desc: '10 tahmin kaydet.', metric: 'savesCount', target: 10 },
  { slug: 'kayda-deger', tier: 'istikrar', icon: 'lucide:message-square-text', title: 'Kayda Değer', desc: 'Tahminlerine 5 yorum gelsin.', metric: 'commentsReceived', target: 5 },
  { slug: 'duzen-saati', tier: 'istikrar', icon: 'lucide:clock', title: 'Düzen Saati', desc: '21 gün üst üste aktif ol.', metric: 'streakCount', target: 21 },
  { slug: 'acik-takvim', tier: 'istikrar', icon: 'lucide:calendar-plus', title: 'Açık Takvim', desc: '3 uzun vadeli tahmin oluştur.', metric: 'monthAheadCount', target: 3 },
  { slug: 'kapanis-notu', tier: 'istikrar', icon: 'lucide:file-check', title: 'Kapanış Notu', desc: '5 sonucu kaynak göstererek kapat.', metric: 'evidenceUsedCount', target: 5 },
  { slug: 'kayit-zinciri', tier: 'istikrar', icon: 'lucide:link', title: 'Kayıt Zinciri', desc: '40 tahmin oluştur.', metric: 'predictionsCreated', target: 40 },
  { slug: 'sabir-tasi', tier: 'istikrar', icon: 'lucide:hourglass', title: 'Sabır Taşı', desc: '90 gün sonrası için 2 tahmin oluştur.', metric: 'longAheadCount', target: 2 },
  { slug: 'sira-sende', tier: 'istikrar', icon: 'lucide:messages-square', title: 'Sıra Sende', desc: '25 yorum yaz.', metric: 'commentsGiven', target: 25 },
  { slug: 'donemsel-bakis', tier: 'istikrar', icon: 'lucide:calendar-clock', title: 'Dönemsel Bakış', desc: '25 sonuç aç.', metric: 'predictionsVerified', target: 25 },
  { slug: 'ilk-sezon', tier: 'istikrar', icon: 'lucide:leaf', title: 'İlk Sezon', desc: 'Hesabınla 90 gün geçir.', metric: 'accountAgeDays', target: 90 },
  { slug: 'mevsim-notu', tier: 'istikrar', icon: 'lucide:cloud-sun', title: 'Mevsim Notu', desc: 'Hesabınla 180 gün geçir.', metric: 'accountAgeDays', target: 180 },
  { slug: 'yilin-baslangici', tier: 'istikrar', icon: 'lucide:flame', title: 'Yılın Başlangıcı', desc: '60 gün üst üste aktif ol.', metric: 'streakCount', target: 60 },

  // ── USTALIK ────────────────────────────────────────────────────────
  { slug: 'ucte-uc', tier: 'ustalik', icon: 'lucide:badge-check', title: 'Üçte Üç', desc: 'Arka arkaya 3 tahmini doğrula.', metric: 'bestStreak', target: 3 },
  { slug: 'keskin-goz', tier: 'ustalik', icon: 'lucide:binoculars', title: 'Keskin Göz', desc: 'En az 20 sonuçta %70+ doğruluk.', metric: 'predictionsCorrect', target: 20, minAccuracy: 70 },
  { slug: 'kategori-uzmani', tier: 'ustalik', icon: 'lucide:layout-grid', title: 'Kategori Uzmanı', desc: 'Bir kategoride 15 isabet kaydet.', metric: 'maxCategoryCorrect', target: 15 },
  { slug: 'genis-acik', tier: 'ustalik', icon: 'lucide:scan-eye', title: 'Geniş Açı', desc: '5 kategoride isabet kaydet.', metric: 'distinctCategoriesCorrect', target: 5 },
  { slug: 'kanit-zinciri', tier: 'ustalik', icon: 'lucide:link', title: 'Kanıt Zinciri', desc: '10 sonucu kaynak göstererek doğrula.', metric: 'evidenceUsedCount', target: 10 },
  { slug: 'dogru-eksen', tier: 'ustalik', icon: 'lucide:crosshair', title: 'Doğru Eksen', desc: 'En az 15 sonuçta %75+ doğruluk.', metric: 'predictionsCorrect', target: 15, minAccuracy: 75 },
  { slug: 'netlik-payi', tier: 'ustalik', icon: 'lucide:percent', title: 'Netlik Payı', desc: 'En az 20 sonuçta %80+ doğruluk.', metric: 'predictionsCorrect', target: 20, minAccuracy: 80 },
  { slug: 'izlek-ustasi', tier: 'ustalik', icon: 'lucide:map', title: 'İzlek Ustası', desc: 'Bir kategoride 25 isabet kaydet.', metric: 'maxCategoryCorrect', target: 25 },
  { slug: 'cifte-dogrulama', tier: 'ustalik', icon: 'lucide:copy-check', title: 'Çifte Doğrulama', desc: '20 sonucu kaynaklı doğrula.', metric: 'evidenceUsedCount', target: 20 },
  { slug: 'yuksek-isabet', tier: 'ustalik', icon: 'lucide:target', title: 'Yüksek İsabet', desc: 'En az 25 sonuçta %85+ doğruluk.', metric: 'predictionsCorrect', target: 25, minAccuracy: 85 },
  { slug: 'konu-haritasi', tier: 'ustalik', icon: 'lucide:map-pin', title: 'Konu Haritası', desc: '8 kategoride isabet kaydet.', metric: 'distinctCategoriesCorrect', target: 8 },
  { slug: 'dort-mevsim', tier: 'ustalik', icon: 'lucide:sparkles', title: 'Dört Mevsim', desc: '4 kategoride isabet kaydet.', metric: 'distinctCategoriesCorrect', target: 4 },
  { slug: 'surec-okuru', tier: 'ustalik', icon: 'lucide:book-open-check', title: 'Süreç Okuru', desc: '30 doğru sonuç kaydet.', metric: 'predictionsCorrect', target: 30 },
  { slug: 'veri-notu', tier: 'ustalik', icon: 'lucide:file-text', title: 'Veri Notu', desc: '15 sonucu kaynaklı doğrula.', metric: 'evidenceUsedCount', target: 15 },
  { slug: 'fikir-bahcesi', tier: 'ustalik', icon: 'lucide:sprout', title: 'Fikir Bahçesi', desc: '8 farklı kategoride tahmin yaz.', metric: 'distinctCategories', target: 8 },
  { slug: 'guven-cizgisi', tier: 'ustalik', icon: 'lucide:trending-up', title: 'Güven Çizgisi', desc: 'En az 50 sonuçta %70+ doğruluk.', metric: 'predictionsCorrect', target: 50, minAccuracy: 70 },
  { slug: 'onay-damgasi', tier: 'ustalik', icon: 'lucide:stamp', title: 'Onay Damgası', desc: '40 doğru sonuç kaydet.', metric: 'predictionsCorrect', target: 40 },
  { slug: 'sabit-oran', tier: 'ustalik', icon: 'lucide:gauge', title: 'Sabit Oran', desc: 'En az 40 sonuçta %75+ doğruluk.', metric: 'predictionsCorrect', target: 40, minAccuracy: 75 },
  { slug: 'dusunce-rotasi', tier: 'ustalik', icon: 'lucide:route', title: 'Düşünce Rotası', desc: 'Bir kategoride 10 isabet kaydet.', metric: 'maxCategoryCorrect', target: 10 },
  { slug: 'acik-arsiv', tier: 'ustalik', icon: 'lucide:archive', title: 'Açık Arşiv', desc: '5 zaman kapsülü oluştur.', metric: 'capsulesCreated', target: 5 },
  { slug: 'capraz-bakis', tier: 'ustalik', icon: 'lucide:shuffle', title: 'Çapraz Bakış', desc: '10 kategoride isabet kaydet.', metric: 'distinctCategoriesCorrect', target: 10 },
  { slug: 'derinlik', tier: 'ustalik', icon: 'lucide:layers', title: 'Derinlik', desc: 'Bir kategoride 20 isabet kaydet.', metric: 'maxCategoryCorrect', target: 20 },
  { slug: 'dogruluk-payi', tier: 'ustalik', icon: 'lucide:pie-chart', title: 'Doğruluk Payı', desc: 'En az 30 sonuçta %80+ doğruluk.', metric: 'predictionsCorrect', target: 30, minAccuracy: 80 },
  { slug: 'saglam-zemin', tier: 'ustalik', icon: 'lucide:shield-check', title: 'Sağlam Zemin', desc: '50 doğru sonuç kaydet.', metric: 'predictionsCorrect', target: 50 },
  { slug: 'ongoru-ritmi', tier: 'ustalik', icon: 'lucide:activity', title: 'Öngörü Ritmi', desc: 'Arka arkaya 7 tahmini doğrula.', metric: 'bestStreak', target: 7 },
  { slug: 'ince-ayar', tier: 'ustalik', icon: 'lucide:sliders-horizontal', title: 'İnce Ayar', desc: 'En az 15 sonuçta %90+ doğruluk.', metric: 'predictionsCorrect', target: 15, minAccuracy: 90 },
  { slug: 'sonuc-okuru', tier: 'ustalik', icon: 'lucide:book-open', title: 'Sonuç Okuru', desc: '50 sonuç aç.', metric: 'predictionsVerified', target: 50 },
  { slug: 'ufuk-bekcisi', tier: 'ustalik', icon: 'lucide:eye', title: 'Ufuk Bekçisi', desc: '90 gün sonrası için 5 tahmin oluştur.', metric: 'longAheadCount', target: 5 },
  { slug: 'bilgi-koprusu', tier: 'ustalik', icon: 'lucide:link-2', title: 'Bilgi Köprüsü', desc: '5 kez bir yorumda bahsedilmiş ol.', metric: 'mentionsReceived', target: 5 },
  { slug: 'kapsamli-not', tier: 'ustalik', icon: 'lucide:file-check-2', title: 'Kapsamlı Not', desc: '30 sonucu kaynaklı doğrula.', metric: 'evidenceUsedCount', target: 30 },

  // ── EFSANE ─────────────────────────────────────────────────────────
  { slug: 'zamanin-tanigi', tier: 'efsane', icon: 'lucide:clock-3', title: 'Zamanın Tanığı', desc: '1 yıl açık kalan tahmini doğrula.', metric: 'longestOpenDays', target: 365 },
  { slug: 'kalici-cizgi', tier: 'efsane', icon: 'lucide:chart-no-axes-combined', title: 'Kalıcı Çizgi', desc: '365 gün üst üste aktif ol.', metric: 'streakCount', target: 365 },
  { slug: 'nadir-isabet', tier: 'efsane', icon: 'lucide:crosshair', title: 'Nadir İsabet', desc: '100 tahminde %80 doğruluk aş.', metric: 'predictionsCorrect', target: 80, minAccuracy: 80 },
  { slug: 'ortak-hafiza', tier: 'efsane', icon: 'lucide:landmark', title: 'Ortak Hafıza', desc: '10 topluluk kaydına katkı yap.', metric: 'groupPredictionsCount', target: 10 },
  { slug: 'yuzyil-notu', tier: 'efsane', icon: 'lucide:hash', title: 'Yüzyıl Notu', desc: '100 tahmin oluştur.', metric: 'predictionsCreated', target: 100 },
  { slug: 'buyuk-resim', tier: 'efsane', icon: 'lucide:image', title: 'Büyük Resim', desc: 'Tüm kategorilerde isabet kaydet.', metric: 'distinctCategoriesCorrect', target: 12 },
  { slug: 'sessiz-usta', tier: 'efsane', icon: 'lucide:eye-off', title: 'Sessiz Usta', desc: '10 hassas içerikli tahmin oluştur.', metric: 'sensitiveMarked', target: 10 },
  { slug: 'zaman-koprusu', tier: 'efsane', icon: 'lucide:milestone', title: 'Zaman Köprüsü', desc: '90 gün sonrası için 10 tahmin oluştur.', metric: 'longAheadCount', target: 10 },
  { slug: 'altin-oran', tier: 'efsane', icon: 'lucide:award', title: 'Altın Oran', desc: 'En az 50 sonuçta %90+ doğruluk.', metric: 'predictionsCorrect', target: 45, minAccuracy: 90 },
  { slug: 'derin-arsiv', tier: 'efsane', icon: 'lucide:archive', title: 'Derin Arşiv', desc: '15 zaman kapsülü oluştur.', metric: 'capsulesCreated', target: 15 },
  { slug: 'son-soz', tier: 'efsane', icon: 'lucide:message-circle', title: 'Son Söz', desc: '100 yorum yaz.', metric: 'commentsGiven', target: 100 },
  { slug: 'uzun-yol', tier: 'efsane', icon: 'lucide:route', title: 'Uzun Yol', desc: '250 tahmin oluştur.', metric: 'predictionsCreated', target: 250 },
  { slug: 'uzak-ufuk', tier: 'efsane', icon: 'lucide:telescope', title: 'Uzak Ufuk', desc: '180 gün açık kalan bir tahmini doğrula.', metric: 'longestOpenDays', target: 180 },
  { slug: 'iz-birakan-efsane', tier: 'efsane', icon: 'lucide:heart', title: 'İz Bırakan', desc: 'Tahminlerine 100 beğeni topla.', metric: 'likesReceived', target: 100 },
  { slug: 'bilge-pusula', tier: 'efsane', icon: 'lucide:compass', title: 'Bilge Pusula', desc: 'Bir kategoride 50 isabet kaydet.', metric: 'maxCategoryCorrect', target: 50 },
  { slug: 'tarih-cizgisi', tier: 'efsane', icon: 'lucide:history', title: 'Tarih Çizgisi', desc: '100 sonuç aç.', metric: 'predictionsVerified', target: 100 },
  { slug: 'yildonumu', tier: 'efsane', icon: 'lucide:cake', title: 'Yıldönümü', desc: 'Hesabınla 1 yıl geçir.', metric: 'accountAgeDays', target: 365 },
  { slug: 'ani-defteri', tier: 'efsane', icon: 'lucide:bookmark', title: 'Anı Defteri', desc: '50 tahmin kaydet.', metric: 'savesCount', target: 50 },
  { slug: 'donem-tanigi', tier: 'efsane', icon: 'lucide:hourglass', title: 'Dönem Tanığı', desc: 'Hesabınla 2 yıl geçir.', metric: 'accountAgeDays', target: 730 },
  { slug: 'kesin-imza', tier: 'efsane', icon: 'lucide:signature', title: 'Kesin İmza', desc: 'En az 20 sonuçta %95+ doğruluk.', metric: 'predictionsCorrect', target: 19, minAccuracy: 95 },
  { slug: 'bin-kayit', tier: 'efsane', icon: 'lucide:database', title: 'Bin Kayıt', desc: '1000 tahmin oluştur.', metric: 'predictionsCreated', target: 1000 },
  { slug: 'acik-miras', tier: 'efsane', icon: 'lucide:gift', title: 'Açık Miras', desc: '10 kişiyi GTF’e davet et.', metric: 'referralsCount', target: 10 },
  { slug: 'buyuk-halka', tier: 'efsane', icon: 'lucide:users', title: 'Büyük Halka', desc: '500 takipçiye ulaş.', metric: 'followers', target: 500 },
  { slug: 'topluluk-hafizasi', tier: 'efsane', icon: 'lucide:landmark', title: 'Topluluk Hafızası', desc: '5 grup kur.', metric: 'groupsCreated', target: 5 },
  { slug: 'surec-muhru', tier: 'efsane', icon: 'lucide:stamp', title: 'Süreç Mührü', desc: '100 doğru sonuç kaydet.', metric: 'predictionsCorrect', target: 100 },
  { slug: 'guven-kaynagi', tier: 'efsane', icon: 'lucide:shield-check', title: 'Güven Kaynağı', desc: '50 sonucu kaynaklı doğrula.', metric: 'evidenceUsedCount', target: 50 },
  { slug: 'yuksek-esik', tier: 'efsane', icon: 'lucide:trending-up', title: 'Yüksek Eşik', desc: 'En az 100 sonuçta %90+ doğruluk.', metric: 'predictionsCorrect', target: 90, minAccuracy: 90 },
  { slug: 'ustalik-defteri', tier: 'efsane', icon: 'lucide:flame', title: 'Ustalık Defteri', desc: 'Arka arkaya 15 tahmini doğrula.', metric: 'bestStreak', target: 15 },
  { slug: 'sonsuz-takvim', tier: 'efsane', icon: 'lucide:infinity', title: 'Sonsuz Takvim', desc: '730 gün üst üste aktif ol.', metric: 'streakCount', target: 730 },
  { slug: 'kayit-bekcisi', tier: 'efsane', icon: 'lucide:shield', title: 'Kayıt Bekçisi', desc: '10 itiraz kaydı oluştur.', metric: 'disputesRaised', target: 10 },
]

const MS_PER_DAY = 86400000

// Every input stat is derived from data this app already tracks — see the
// Promise.all in Rozetler.jsx for exactly which queries feed this. Kept as
// a pure function (no fetching here) so it's easy to unit test.
export function computeBadgeStats({ predictions, profile, counts }) {
  const now = Date.now()
  const resolved = predictions
    .filter((p) => p.status === 'verified_correct' || p.status === 'verified_incorrect')
    .sort((a, b) => new Date(a.verified_at) - new Date(b.verified_at))

  const predictionsCorrect = resolved.filter((p) => p.status === 'verified_correct').length
  const predictionsVerified = resolved.length
  const accuracyPct = predictionsVerified > 0 ? (predictionsCorrect / predictionsVerified) * 100 : 0

  let bestStreak = 0
  let currentRun = 0
  for (const p of resolved) {
    currentRun = p.status === 'verified_correct' ? currentRun + 1 : 0
    bestStreak = Math.max(bestStreak, currentRun)
  }

  const categoryCorrectCounts = new Map()
  for (const p of resolved) {
    if (p.status !== 'verified_correct') continue
    categoryCorrectCounts.set(p.category, (categoryCorrectCounts.get(p.category) || 0) + 1)
  }
  const maxCategoryCorrect = categoryCorrectCounts.size > 0 ? Math.max(...categoryCorrectCounts.values()) : 0

  const daysAhead = (p) => (new Date(p.event_date).getTime() - new Date(p.created_at).getTime()) / MS_PER_DAY

  const longestOpenDays = resolved.reduce((max, p) => {
    const days = (new Date(p.verified_at).getTime() - new Date(p.created_at).getTime()) / MS_PER_DAY
    return Math.max(max, days)
  }, 0)

  return {
    predictionsCreated: predictions.length,
    predictionsVerified,
    predictionsCorrect,
    accuracyPct,
    distinctCategories: new Set(predictions.map((p) => p.category)).size,
    distinctCategoriesCorrect: categoryCorrectCounts.size,
    maxCategoryCorrect,
    followers: counts.followers,
    following: counts.following,
    likesGiven: counts.likesGiven,
    likesReceived: counts.likesReceived,
    commentsGiven: counts.commentsGiven,
    commentsReceived: counts.commentsReceived,
    savesCount: counts.savesCount,
    groupsJoined: counts.groupsJoined,
    groupsCreated: counts.groupsCreated,
    groupPredictionsCount: predictions.filter((p) => p.group_id).length,
    disputesRaised: counts.disputesRaised,
    referralsCount: counts.referralsCount,
    streakCount: profile?.streak_count || 0,
    bestStreak,
    accountAgeDays: profile?.created_at ? Math.floor((now - new Date(profile.created_at).getTime()) / MS_PER_DAY) : 0,
    capsulesCreated: predictions.filter((p) => p.is_private).length,
    sensitiveMarked: predictions.filter((p) => p.is_sensitive).length,
    weekAheadCount: predictions.filter((p) => daysAhead(p) >= 7).length,
    monthAheadCount: predictions.filter((p) => daysAhead(p) >= 30).length,
    longAheadCount: predictions.filter((p) => daysAhead(p) >= 90).length,
    shortTermCount: predictions.filter((p) => daysAhead(p) > 0 && daysAhead(p) <= 3).length,
    mediaUsedCount: predictions.filter((p) => p.media_url).length,
    evidenceUsedCount: resolved.filter((p) => p.evidence_note || p.evidence_url).length,
    mentionsReceived: counts.mentionsReceived,
    sameDayVerifyCount: resolved.filter((p) => new Date(p.verified_at).toDateString() === new Date(p.event_date).toDateString())
      .length,
    longestOpenDays,
  }
}

export function evaluateBadges(stats) {
  return BADGES.map((badge) => {
    const raw = stats[badge.metric] ?? 0
    const meetsAccuracy = badge.minAccuracy == null || stats.accuracyPct >= badge.minAccuracy
    const earned = raw >= badge.target && meetsAccuracy
    return {
      ...badge,
      progressCurrent: Math.min(raw, badge.target),
      progressTarget: badge.target,
      earned,
    }
  })
}
