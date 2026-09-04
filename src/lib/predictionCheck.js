// Rule-based check for "is this actually a prediction?" — no AI call (see
// supabase/schema.sql's own note on why an LLM shouldn't be trusted for
// real-world verification; the same reasoning applies to trusting one for
// gatekeeping input without a server-side call, which needs an Edge
// Function this environment can't deploy). Runs client-side at submit time
// in TahminOlustur, purely on the sealed content text.
//
// Returns a `reasonKey` (an i18n key, not literal text) so the caller can
// show it in the viewer's own language — see TahminOlustur.jsx's `t(check
// .reasonKey)`. The future-tense check itself is keyed by `lng` (defaults
// to Turkish): each supported language gets its own lightweight
// grammatical marker below, since "does this read as a future claim" has
// no single universal regex.

// Turkish future tense is a regular suffix (-ecek/-acak, with the usual
// consonant-softening y-buffer for vowel-final stems: -yecek/-yacak) — that
// single, extremely reliable grammatical marker catches the vast majority
// of genuine predictions ("kazanacak", "artacak", "bitecek") without
// needing a keyword list that would inevitably miss synonyms.
const FUTURE_TENSE_TR = /\b\S*[yY]?(ecek|ecektir|eceğim|eceğiz|ecekler|acak|acaktır|acağım|acağız|acaklar)\b/u
// English: the modal "will" (incl. contraction) or periphrastic "going to"
// — the two overwhelmingly common ways to state a future claim.
const FUTURE_TENSE_EN = /\b(will|(?:\w+)'ll|going to)\b/iu
// German: the future auxiliary "wird"/"werden" (+ infinitive).
const FUTURE_TENSE_DE = /\b(wird|werden)\b/iu
// Spanish: the periphrastic "va a"/"van a" (+ infinitive), or the
// synthetic future suffix (-rá/-rán/-rás/-remos/-réis). JS's \b is
// ASCII-only even with /u (a well-known gotcha — it does NOT treat
// accented letters as word characters), so a word ending in an accented
// vowel needs `\p{L}` lookaround instead of \b to actually match.
const FUTURE_TENSE_ES = /\b(va|van|voy|vamos)\s+a\b|(?<![\p{L}])\p{L}*(?:rá|rán|rás|remos|réis)(?![\p{L}])/iu
// Russian: "будет/будут/буду/будешь/будете" — the future auxiliary for
// imperfective verbs. Doesn't catch perfective future (identical to
// present-tense conjugation, no single reliable marker exists) — same
// "good enough, not exhaustive" tradeoff as the Turkish suffix above.
// Same \b-is-ASCII-only gotcha as Spanish: Cyrillic is entirely outside
// \w, so \b never matches anywhere in Cyrillic text — `\p{L}` lookaround
// again instead.
const FUTURE_TENSE_RU = /(?<![\p{L}])(?:будет|будут|буду|будешь|будете)(?![\p{L}])/iu
// Chinese: 将/会 as pre-verbal future markers ("将获胜"/"会赢" — will win).
const FUTURE_TENSE_ZH = /[将会]/u
// Arabic: سوف as the spelled-out (more formal/distant) future particle, or
// the attached سـ prefix (سي.../ست.../سن.../سأ...) that marks the far more
// common everyday near-future — checking سوف alone would reject something
// as ordinary as "سيفوز الفريق" ("the team will win"). The attached form
// is only matched before the imperfective verb's own person markers
// (ي/ت/ن/أ) to keep false positives on ordinary س-initial nouns (سنة
// "year", سوق "market") relatively rare — some slip through regardless
// (e.g. "ستة" "six"), same "good enough, not exhaustive" tradeoff as
// every other language's marker here.
const FUTURE_TENSE_AR = /سوف|(?<![\p{L}])س[يتنأ]/u

const FUTURE_TENSE_BY_LANG = {
  tr: FUTURE_TENSE_TR,
  en: FUTURE_TENSE_EN,
  de: FUTURE_TENSE_DE,
  es: FUTURE_TENSE_ES,
  ru: FUTURE_TENSE_RU,
  zh: FUTURE_TENSE_ZH,
  ar: FUTURE_TENSE_AR,
  // Japanese has no grammatical future tense distinct from the plain/
  // non-past form (the same conjugation covers "does" and "will do") — no
  // single marker reliably distinguishes a future claim, so this check is
  // skipped for 'ja' rather than shipping a heuristic that would just
  // reject valid predictions at random. min-length + not-a-question still
  // apply below.
}

const MIN_LENGTH = 12

export function checkPredictionText(text, lng = 'tr') {
  const trimmed = (text || '').trim()

  if (trimmed.length < MIN_LENGTH) {
    return { valid: false, reasonKey: 'createPrediction.checkTooShort' }
  }

  const letters = trimmed.replace(/[^\p{L}]/gu, '')
  if (letters.length < trimmed.length * 0.5) {
    return { valid: false, reasonKey: 'createPrediction.checkNotSentence' }
  }

  // ASCII '?', full-width '？' (Chinese/Japanese), Arabic '؟'.
  if (/[?？؟]\s*$/u.test(trimmed)) {
    return { valid: false, reasonKey: 'createPrediction.checkIsQuestion' }
  }

  const marker = FUTURE_TENSE_BY_LANG[(lng || 'tr').split('-')[0]]
  if (marker && !marker.test(trimmed)) {
    return { valid: false, reasonKey: 'createPrediction.checkNoFutureClaim' }
  }

  return { valid: true, reasonKey: null }
}
