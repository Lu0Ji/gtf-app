import { useEffect, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext.jsx'

// Tracks the cursor within whatever element the returned ref is attached
// to, and writes smoothed `--px`/`--py` (0..1, lerped via rAF so the motion
// trails the cursor instead of snapping to it) directly onto that element
// via el.style.setProperty — not React state, so a mousemove never
// triggers a re-render. CSS custom properties inherit, so any descendant
// can read var(--px, 0.5)/var(--py, 0.5) (the 0.5 fallback keeps
// everything centered before the first mousemove, or forever on a device
// this never attaches to). See the "Auth gateway" comment in index.css for
// what reads these two properties.
//
// No-ops entirely on touch (no fine pointer) and when the user's own
// reduceMotion setting is on — both leave --px/--py unset, so the CSS
// above just renders at the static 0.5 fallback instead of reacting.
export function usePointerParallax() {
  const ref = useRef(null)
  const { reduceMotion } = useTheme()

  useEffect(() => {
    const el = ref.current
    if (!el || reduceMotion) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    let raf = null
    let targetX = 0.5
    let targetY = 0.5
    let curX = 0.5
    let curY = 0.5

    function onMove(e) {
      const rect = el.getBoundingClientRect()
      targetX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      targetY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    }
    function onLeave() {
      targetX = 0.5
      targetY = 0.5
    }
    function tick() {
      curX += (targetX - curX) * 0.08
      curY += (targetY - curY) * 0.08
      el.style.setProperty('--px', curX.toFixed(4))
      el.style.setProperty('--py', curY.toFixed(4))
      raf = requestAnimationFrame(tick)
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    raf = requestAnimationFrame(tick)

    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduceMotion])

  return ref
}
