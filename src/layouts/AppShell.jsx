import { Outlet } from 'react-router-dom'
import SidebarNav from '../components/SidebarNav.jsx'

// Wraps every signed-in route (tab screens and detail/settings screens
// alike) so the app reads as a real website on a desktop-width browser
// instead of a phone layout stretched edge-to-edge — the left rail +
// single centered column pattern every major social app's own web client
// uses (Threads' desktop web is the closest match: no second/third rail).
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
    <div className="mx-auto flex w-full md:max-w-[820px]">
      <SidebarNav />
      <div className="min-w-0 flex-1 md:max-w-[560px]" style={{ transform: 'translateZ(0)' }}>
        <Outlet />
      </div>
    </div>
  )
}
