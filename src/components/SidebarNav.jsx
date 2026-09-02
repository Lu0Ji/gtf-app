import { useLocation, useNavigate } from 'react-router-dom'
import { NAV_TABS } from '../lib/navTabs.js'
import { useUnreadMessages } from '../contexts/UnreadMessagesContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fallbackAvatarFor } from '../lib/images.js'

// Desktop only (md+) — the BottomNav equivalent once there's room for a
// persistent left rail instead of a bottom bar (X/Threads/Instagram's own
// web pattern). Mounted alongside BottomNav at all times; each hides itself
// per breakpoint via CSS rather than conditional rendering, so neither ever
// pops in/out on a resize.
export default function SidebarNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const unreadCount = useUnreadMessages()
  const { profile } = useAuth()

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-border px-3 py-6 md:flex">
      <div>
        <div className="flex items-center gap-2 px-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-theme bg-primary font-heading text-sm font-extrabold text-primary-foreground">
            GTF
          </span>
          <span className="font-heading text-sm font-extrabold tracking-[-0.04em] text-foreground">
            Gelecek Tahmin Fonu
          </span>
        </div>

        {profile && (
          <button
            onClick={() => navigate('/profil')}
            className="mt-6 flex w-full items-center gap-2.5 rounded-theme border border-border bg-card p-3 text-left shadow-sm"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
              <img
                src={profile.avatar_url || fallbackAvatarFor(profile.id)}
                alt={profile.display_name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{profile.display_name}</p>
              <p className="truncate text-[11px] text-muted-foreground">@{profile.username}</p>
            </div>
          </button>
        )}

        {profile && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-theme bg-muted px-3 py-2.5">
              <p className="font-heading text-base font-extrabold tracking-[-0.03em] text-foreground">
                {profile.points ?? 0}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground">puan</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-theme bg-muted px-3 py-2.5">
              <iconify-icon icon="lucide:flame" class="text-base text-accent"></iconify-icon>
              <div>
                <p className="font-heading text-base font-extrabold leading-none tracking-[-0.03em] text-foreground">
                  {profile.streak_count ?? 0}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">gün seri</p>
              </div>
            </div>
          </div>
        )}

        <nav className="mt-6 flex flex-col gap-1">
          {NAV_TABS.map((tab) => {
            const isActive = location.pathname === tab.path
            const showBadge = tab.path === '/mesajlar' && unreadCount > 0
            return (
              <button
                key={tab.name}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-3 rounded-theme px-3 py-2.5 text-[15px] ${
                  isActive ? 'bg-secondary font-bold text-primary' : 'font-semibold text-foreground'
                }`}
              >
                <span className="relative flex h-6 w-6 items-center justify-center">
                  <iconify-icon icon={tab.icon} class="text-xl"></iconify-icon>
                  {showBadge && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      <button
        onClick={() => navigate('/tahmin-olustur')}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm"
      >
        <iconify-icon icon="lucide:plus" class="text-lg"></iconify-icon>
        Tahmin oluştur
      </button>
    </aside>
  )
}
