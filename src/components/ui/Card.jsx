// See DESIGN.md §8 — the default container for anything that isn't
// full-bleed content. `as="button"` when the whole card is a tap target
// (adds the standard tap-feedback rule from §7); a plain div otherwise.
export default function Card({ as: Tag = 'div', className = '', children, ...props }) {
  const interactive = Tag === 'button' ? 'text-left transition-transform duration-150 active:scale-[0.98]' : ''
  return (
    <Tag className={`rounded-theme border border-border bg-card p-4 shadow-sm ${interactive} ${className}`} {...props}>
      {children}
    </Tag>
  )
}
