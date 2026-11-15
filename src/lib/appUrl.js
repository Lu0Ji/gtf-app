// The one place that knows the app's public address. On the web it's simply
// where the page is being served from. Inside the native shells, though,
// window.location is `http://localhost` (Android) / `capacitor://localhost`
// (iOS) — meaningless to anyone who receives a link, and useless as the
// landing page of a password-reset email — so the deployed site's address
// (VITE_APP_URL, set at build time) wins whenever it's configured.
export function appUrl(hashPath = '') {
  const base = import.meta.env.VITE_APP_URL || window.location.origin + window.location.pathname
  return base.replace(/\/?$/, '/') + (hashPath ? `#${hashPath}` : '')
}
