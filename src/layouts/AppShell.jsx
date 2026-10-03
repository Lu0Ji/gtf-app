import { Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SidebarNav from '../components/SidebarNav.jsx'
import RightRail from '../components/RightRail.jsx'
import { useUnreadActivity } from '../contexts/UnreadActivityContext.jsx'

// Floating top-right utility bar — quick access to activity (bell) and
// settings (gear), previously buried (settings only reachable via Profil's
// row list; activity had no desktop entry point at all). Lives here, not
// in SidebarNav or RightRail: it needs to be reachable at every desktop
// width, and RightRail only renders at xl+ (1280px) — tying it to that
// would make it vanish on a plain laptop-width window. `fixed` (not inside
// the transformed content column — see the comment below) so it stays
// pinned to the real viewport corner regardless of scroll position.
function QuickActions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { unreadCount } = useUnreadActivity()
  return (
    <div className="fixed right-5 top-5 z-40 hidden items-center gap-1.5 rounded-theme border border-border bg-card p-1 shadow-sm md:flex">
      <button
        type="button"
        onClick={() => navigate('/hareketler')}
        aria-label={t('activity.title')}
        title={t('activity.title')}
        className="relative flex h-9 w-9 items-center justify-center rounded-theme text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
      >
        <iconify-icon icon="lucide:bell" class="text-lg"></iconify-icon>
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />}
      </button>
      <button
        type="button"
        onClick={() => navigate('/uygulama-ayarlari')}
        aria-label={t('appSettings.title')}
        title={t('appSettings.title')}
        className="flex h-9 w-9 items-center justify-center rounded-theme text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
      >
        <iconify-icon icon="lucide:settings" class="text-lg"></iconify-icon>
      </button>
    </div>
  )
}

// Wraps every signed-in route (tab screens and detail/settings screens
// alike) so the app reads as a real website on a desktop-width browser
// instead of a phone layout stretched edge-to-edge. Three columns once
// there's genuinely room for it — left nav, content, a right rail of
// standing widgets (X/LinkedIn's own desktop pattern) — because a bare
// sidebar + one ~600px column left the rest of a real monitor looking like
// half the page never loaded. RightRail only shows at xl+ (1280px); below
// that it's sidebar + column, which still fills a laptop window far better
// than the phone layout alone did.
//
// `transform` on the content wrapper is load-bearing, not decorative: per
// the CSS spec, an ancestor with a transform becomes the containing block
// for its `position: fixed` *and* `position: absolute` descendants. Every
// screen in this app was written assuming it fills the real viewport (bottom
// action bars as `fixed inset-x-0 bottom-0`, hero headers as `absolute
// inset-x-0 top-0`, with no positioned wrapper of their own) — without this,
// those bars would span the full desktop window instead of just this
// column. It's what makes ~40 screens work here with zero per-screen edits.
export default function AppShell() {
  return (
    <div className="mx-auto flex w-full justify-center gap-6 md:max-w-[900px] xl:max-w-none xl:gap-6 xl:px-6">
      {/* QuickActions must stay a sibling of the transformed column below,
          not a descendant — it's `fixed`, and nesting it inside that
          transform would hit the exact containing-block bug fixed
          elsewhere in Sheet.jsx (see that file's header comment). */}
      <QuickActions />
      <SidebarNav />
      <div className="min-w-0 flex-1 md:max-w-[680px]" style={{ transform: 'translateZ(0)' }}>
        <Outlet />
      </div>
      <RightRail />
    </div>
  )
}
