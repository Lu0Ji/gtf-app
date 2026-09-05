import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import tr from './locales/tr.json'

// Every language this app ships translations for — single source of truth
// for the language switcher (Bölge ve Tarih Biçimi) and the RTL check below.
// `nativeName` is what a speaker of that language expects to see for their
// own language in a picker (never translated into the current UI language).
export const SUPPORTED_LANGUAGES = [
  { code: 'tr', nativeName: 'Türkçe' },
  { code: 'en', nativeName: 'English' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'zh', nativeName: '中文' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'es', nativeName: 'Español' },
  { code: 'ar', nativeName: 'العربية' },
]

const RTL_LANGUAGES = new Set(['ar'])

export function isRtl(lng) {
  return RTL_LANGUAGES.has((lng || '').split('-')[0])
}

// Keeps <html lang/dir> in sync so RTL (Arabic) actually flips layout
// direction, not just text — and so screen readers announce the right
// language. Called once at init and on every languageChanged event.
function applyDocumentDirection(lng) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lng
  document.documentElement.dir = isRtl(lng) ? 'rtl' : 'ltr'
}

// Only Turkish ships in the main bundle (it's the app's own language, the
// initial default before any detector/user preference applies, and the
// fallback for any key missing from a lighter locale file — never a blank
// string). Every other language used to be bundled eagerly too, which grew
// the shared chunk to ~600KB/190KB gzip across all 8 locale JSONs combined
// — most of it dead weight for any single viewer, who only ever needs one.
// This backend dynamic-imports a language's JSON only once something
// actually calls changeLanguage() into it, so Vite code-splits each
// locale into its own chunk fetched on demand instead of upfront.
const lazyLocaleBackend = {
  type: 'backend',
  read(language, _namespace, callback) {
    import(`./locales/${language}.json`)
      .then((mod) => callback(null, mod.default))
      .catch((err) => callback(err, null))
  },
}

i18n
  .use(LanguageDetector)
  .use(lazyLocaleBackend)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
    },
    // Lets the two coexist: languages already in `resources` (just tr)
    // are used as-is, and any other language i18next needs gets fetched
    // through the backend above instead of i18next assuming "resources
    // present, don't bother with a backend at all."
    partialBundledLanguages: true,
    fallbackLng: 'tr',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true, // 'en-US' resolves to the 'en' resource
    detection: {
      // No <html> tag / cookie / querystring probing — a returning user's
      // explicit choice (cached to localStorage) always wins over a guest's
      // browser language, and UserSettingsContext.jsx layers the signed-in
      // account's cross-device preference (settings.region.language) on top
      // of both once it loads.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'gtf_language',
    },
    interpolation: { escapeValue: false }, // React already escapes; this only gates i18next's own (unused) HTML escaping
    returnEmptyString: false,
  })

applyDocumentDirection(i18n.resolvedLanguage || i18n.language)
i18n.on('languageChanged', applyDocumentDirection)

export default i18n
