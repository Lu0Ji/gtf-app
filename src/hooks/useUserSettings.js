// Re-exported from UserSettingsContext: settings now load once per user in a
// shared provider instead of once per hook call. Kept here so every existing
// `import { useUserSettings } from '../hooks/useUserSettings.js'` still works.
export { useUserSettings, DEFAULT_SETTINGS } from '../contexts/UserSettingsContext.jsx'
