// Decorative motion layer for the login/signup "gateway" moment — see
// DESIGN.md §7 and the .auth-particle/.auth-scan-line comment in
// src/index.css. A fixed preset array (not Math.random() inline) so
// re-renders elsewhere in Giris.jsx (typing in the form, toggling
// signin/signup) don't reshuffle the particles mid-animation.
const PARTICLES = [
  { left: '6%', size: 5, duration: 10, delay: 0, opacity: 0.55 },
  { left: '16%', size: 3, duration: 8, delay: 1.2, opacity: 0.4 },
  { left: '27%', size: 6, duration: 12, delay: 2.5, opacity: 0.5 },
  { left: '39%', size: 4, duration: 9, delay: 0.6, opacity: 0.45 },
  { left: '52%', size: 5, duration: 11, delay: 3.1, opacity: 0.5 },
  { left: '64%', size: 3, duration: 8.5, delay: 1.8, opacity: 0.4 },
  { left: '76%', size: 5, duration: 10.5, delay: 4, opacity: 0.55 },
  { left: '87%', size: 4, duration: 9.5, delay: 2.2, opacity: 0.45 },
  { left: '94%', size: 3, duration: 7.5, delay: 0.3, opacity: 0.35 },
]

export default function AuthAurora({ particleCount = PARTICLES.length }) {
  const particles = PARTICLES.slice(0, particleCount)
  return (
    <div aria-hidden="true" className="auth-particle-field pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <span
          key={i}
          className="auth-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            '--particle-duration': `${p.duration}s`,
            '--particle-delay': `${p.delay}s`,
            '--particle-opacity': p.opacity,
          }}
        />
      ))}
    </div>
  )
}
