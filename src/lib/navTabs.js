// Single source of truth for the 5 primary destinations — used by both
// BottomNav (mobile, <768px) and SidebarNav (desktop, md+) so the two never
// drift out of sync the way three separate category lists once did (see
// categories.js's own history of that exact mistake).
export const NAV_TABS = [
  { name: 'Anasayfa', icon: 'lucide:house', path: '/' },
  { name: 'Gruplar', icon: 'lucide:users-round', path: '/gruplar' },
  { name: 'Mesajlar', icon: 'lucide:message-circle', path: '/mesajlar' },
  { name: 'Keşfet', icon: 'lucide:compass', path: '/kesfet' },
  { name: 'Profil', icon: 'lucide:user', path: '/profil' },
]
