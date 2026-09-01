// Rule-based check for "is this actually a prediction?" — no AI call (see
// supabase/schema.sql's own note on why an LLM shouldn't be trusted for
// real-world verification; the same reasoning applies to trusting one for
// gatekeeping input without a server-side call, which needs an Edge
// Function this environment can't deploy). Runs client-side at submit time
// in TahminOlustur, purely on the sealed content text.
//
// Turkish future tense is a regular suffix (-ecek/-acak, with the usual
// consonant-softening y-buffer for vowel-final stems: -yecek/-yacak) — that
// single, extremely reliable grammatical marker catches the vast majority
// of genuine predictions ("kazanacak", "artacak", "bitecek") without
// needing a keyword list that would inevitably miss synonyms. Combined
// with "not phrased as a question" and a minimum length, this rejects the
// obvious non-predictions (opinions with no future claim, spam, bare
// questions) without being so strict it blocks legitimate phrasing.
const FUTURE_TENSE_RE = /\b\S*[yY]?(ecek|ecektir|eceğim|eceğiz|ecekler|acak|acaktır|acağım|acağız|acaklar)\b/u

const MIN_LENGTH = 12

export function checkPredictionText(text) {
  const trimmed = (text || '').trim()

  if (trimmed.length < MIN_LENGTH) {
    return { valid: false, reason: 'Biraz daha ayrıntılı yaz — bu çok kısa görünüyor.' }
  }

  const letters = trimmed.replace(/[^\p{L}]/gu, '')
  if (letters.length < trimmed.length * 0.5) {
    return { valid: false, reason: 'Bu bir tahmin gibi görünmüyor — normal cümleyle yaz.' }
  }

  if (trimmed.endsWith('?')) {
    return { valid: false, reason: 'Bu bir soru gibi duruyor. Tahmin bir iddia olmalı, soru değil.' }
  }

  if (!FUTURE_TENSE_RE.test(trimmed)) {
    return {
      valid: false,
      reason: 'Bu bir gelecek zaman iddiası gibi durmuyor — "...olacak", "...kazanacak" gibi net bir öngörü yaz.',
    }
  }

  return { valid: true, reason: null }
}
