import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// See DESIGN.md §7/§8 — the bottom-sheet shell: backdrop fade + panel
// slide-up. Two-frame mount trick (render off-screen, then flip a class)
// is what makes the very first open animate instead of snapping in —
// a CSS transition can't animate a property that's already at its target
// value on first paint.
//
// Portaled to document.body — not decorative. AppShell.jsx puts
// `transform: translateZ(0)` on the column every signed-in screen renders
// inside, which (per the CSS spec) makes that column the containing block
// for any `position: fixed` descendant. Rendered in place, this sheet's
// `inset-0` would resolve against the column's full scrollable height
// instead of the viewport — on a long page the `items-end` panel ends up
// pinned near the bottom of the *document*, invisible until scrolled
// thousands of pixels down (confirmed: a 3000px column put a `fixed`
// child's getBoundingClientRect() at top:16/bottom:3016 against a 720px
// viewport). Portaling out of AppShell's subtree escapes that containing
// block entirely, so `fixed` means the real viewport again.
export default function Sheet({ onClose, children, className = '' }) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end bg-black/40 transition-opacity duration-200 ease-out ${entered ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full rounded-t-theme bg-background pb-[var(--safe-bottom)] shadow-lg transition-transform duration-200 ease-out ${entered ? 'translate-y-0' : 'translate-y-full'} ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
