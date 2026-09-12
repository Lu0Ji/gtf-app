import { supabase } from './supabase.js'

// Puan sistemi tamamen kaldırıldı (2026-09-05) — sıralama artık gerçek
// isabet oranına dayanıyor, kazanılan/harcanan bir sayıya değil. "Vade"
// (duration bucket), bir tahminin ne kadar süre mühürlü kaldığından
// (sealed_at → verified_at) hesaplanıyor, planlanan event_date'ten değil:
// manuel mühürlerin (event_date = null) sabit bir programı yok, bu yüzden
// gerçek kapalı kalma süresi her iki mühür türünde de tutarlı çalışan tek
// ortak ölçüt.
export const DURATION_BUCKETS = {
  short: (days) => days <= 7,
  medium: (days) => days > 7 && days <= 30,
  long: (days) => days > 30,
}

// Az sayıda (şanslı) tahminle bir kategori/vade tablosunun tepesine
// çıkmayı önlemek için: bu eşiğin altında doğrulanmış tahmini olan biri
// hiçbir sıralamada görünmez.
export const MIN_VERIFIED_FOR_RANKING = 5

// Haftalık tablo için aynı 5'lik eşik neredeyse kimseyi göstermezdi — bir
// hafta içinde 5 tahmin doğrulatmak günlük kullanıcılar için bile yüksek
// bir bar. 2026-09-12, öneri #4 ("diğer sosyal medya araçlarından
// esinlenebiliriz" — Duolingo Ligleri): haftalık sıfırlanan bir tablo,
// tüm-zamanlar tablosunun yeni/orta seviye kullanıcıyı asla göstermediği
// sorunu çözüyor — ama sadece eşik de düşmezse aynı soruna düşer.
export const MIN_VERIFIED_FOR_WEEKLY_RANKING = 2

// Haftanın başlangıcı: UTC Pazartesi 00:00 — sunucu tarafında tek, tutarlı
// bir sınır (kullanıcının kendi saat dilimine göre değil), aynı loading
// mantığının basit kalması için. Bir sonraki Pazartesi'ye kadar aynı
// pencere — "bu hafta" herkes için aynı tarih aralığı.
export function currentWeekStartIso() {
  const now = new Date()
  const day = now.getUTCDay() // 0 = Pazar, 1 = Pazartesi, ...
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday))
  return monday.toISOString()
}

// category/bucket/period hepsi opsiyonel — null/'all' "Tümü" anlamına
// gelir. Predictions tablosu zaten herkese açık (RLS: "viewable by
// everyone"), bu yüzden sunucu tarafında ayrı bir görünüm/RPC'ye gerek yok:
// doğrulanmış kayıtları çekip kullanıcı başına client-side topluyoruz —
// Rozetler.jsx'in kendi rozet istatistiklerini hesaplama şekliyle aynı
// desen, sadece tek kullanıcı yerine herkes için.
export async function fetchLeaderboard({ category = null, bucket = null, period = 'all', limit = 100 } = {}) {
  let query = supabase
    .from('predictions')
    .select('author_id, status, sealed_at, verified_at, profiles:author_id(display_name, username, avatar_url)')
    .in('status', ['verified_correct', 'verified_incorrect'])
    .not('sealed_at', 'is', null)
    .not('verified_at', 'is', null)

  if (category) query = query.eq('category', category)
  if (period === 'week') query = query.gte('verified_at', currentWeekStartIso())

  const { data, error } = await query
  if (error) return { rows: [], error }

  const byAuthor = new Map()
  for (const p of data || []) {
    if (bucket) {
      const days = (new Date(p.verified_at) - new Date(p.sealed_at)) / 86400000
      if (!DURATION_BUCKETS[bucket](days)) continue
    }
    const entry = byAuthor.get(p.author_id) || {
      authorId: p.author_id,
      profile: p.profiles,
      correct: 0,
      total: 0,
    }
    entry.total += 1
    if (p.status === 'verified_correct') entry.correct += 1
    byAuthor.set(p.author_id, entry)
  }

  const minVerified = period === 'week' ? MIN_VERIFIED_FOR_WEEKLY_RANKING : MIN_VERIFIED_FOR_RANKING
  const rows = Array.from(byAuthor.values())
    .filter((e) => e.total >= minVerified)
    .map((e) => ({ ...e, accuracyPct: Math.round((e.correct / e.total) * 100) }))
    .sort((a, b) => b.accuracyPct - a.accuracyPct || b.total - a.total)
    .slice(0, limit)

  return { rows, error: null }
}
