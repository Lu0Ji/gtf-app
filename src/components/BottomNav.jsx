import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NAV_TABS } from '../lib/navTabs.js'
import { useUnreadMessages } from '../contexts/UnreadMessagesContext.jsx'

// Mobile only (<768px) — SidebarNav is the md+ equivalent, see AppShell.
//
// Rendered through TabLayout, which sits inside AppShell's Outlet — the
// same div AppShell deliberately puts `transform: translateZ(0)` on so a
// screen's own `fixed`/`absolute` bars stay confined to the middle column
// on desktop instead of spanning the whole window. That transform makes
// this div the containing block for ALL descendant `position: fixed`
// elements per spec, this nav included, even though it's mobile-only. The
// practical effect: `bottom-0` pinned to the bottom of that (tall,
// scrolling) content box, not the real viewport — so on a phone the nav
// drifted down with the page and only reappeared once you'd scrolled all
// the way to the end. A portal straight to document.body escapes that
// ancestor entirely, so `fixed` means the actual screen bottom again.
export default function BottomNav() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const unreadCount = useUnreadMessages()

  return createPortal(
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-3 pb-safe-5 pt-2 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-[393px] items-end justify-between">
        {NAV_TABS.map((tab) => {
          const isActive = location.pathname === tab.path
          const showBadge = tab.path === '/mesajlar' && unreadCount > 0
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`flex min-w-[60px] flex-col items-center gap-1 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg ${
                  isActive ? 'bg-secondary' : ''
                }`}
              >
                <iconify-icon icon={tab.icon} class="text-[18px]"></iconify-icon>
                {showBadge && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {t(tab.nameKey)}
              </span>
            </button>
          )
        })}
      </div>
    </nav>,
    document.body
  )
}
