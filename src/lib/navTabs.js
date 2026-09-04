// Single source of truth for the 5 primary destinations — used by both
// BottomNav (mobile, <768px) and SidebarNav (desktop, md+) so the two never
// drift out of sync the way three separate category lists once did (see
// categories.js's own history of that exact mistake).
// `nameKey` is an i18n key (translated at render time via useTranslation) —
// kept as a key, not a label, since this is a plain data module and can't
// call t() itself.
export const NAV_TABS = [
  { nameKey: 'nav.home', icon: 'lucide:house', path: '/' },
  { nameKey: 'nav.groups', icon: 'lucide:users-round', path: '/gruplar' },
  { nameKey: 'nav.messages', icon: 'lucide:message-circle', path: '/mesajlar' },
  { nameKey: 'nav.discover', icon: 'lucide:compass', path: '/kesfet' },
  { nameKey: 'nav.profile', icon: 'lucide:user', path: '/profil' },
]
