import { useEffect, useState } from 'react'

// See DESIGN.md §7/§8 — the bottom-sheet shell: backdrop fade + panel
// slide-up. Two-frame mount trick (render off-screen, then flip a class)
// is what makes the very first open animate instead of snapping in —
// a CSS transition can't animate a property that's already at its target
// value on first paint.
export default function Sheet({ onClose, children, className = '' }) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end bg-black/40 transition-opacity duration-200 ease-out ${entered ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full rounded-t-theme bg-background shadow-lg transition-transform duration-200 ease-out ${entered ? 'translate-y-0' : 'translate-y-full'} ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
