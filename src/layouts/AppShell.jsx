import { Outlet } from 'react-router-dom'
import SidebarNav from '../components/SidebarNav.jsx'
import RightRail from '../components/RightRail.jsx'

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
    <div className="mx-auto flex w-full justify-center gap-6 md:max-w-[900px] xl:max-w-none xl:gap-10 xl:px-10">
      <SidebarNav />
      <div className="min-w-0 flex-1 md:max-w-[680px]" style={{ transform: 'translateZ(0)' }}>
        <Outlet />
      </div>
      <RightRail />
    </div>
  )
}
