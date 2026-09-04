import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import tr from './locales/tr.json'
import en from './locales/en.json'
import de from './locales/de.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ru from './locales/ru.json'
import es from './locales/es.json'
import ar from './locales/ar.json'

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

// Turkish is the app's own language and its only complete translation
// today, so it's both the initial default (before any detector/user
// preference applies) and the fallback for any key missing from a lighter
// locale file — never a blank string.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
      de: { translation: de },
      zh: { translation: zh },
      ja: { translation: ja },
      ru: { translation: ru },
      es: { translation: es },
      ar: { translation: ar },
    },
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
