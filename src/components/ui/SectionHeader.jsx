// See DESIGN.md §3/§8 — Heading-tier title for a section within a screen,
// optional Caption subtitle, optional trailing text-link or action element.
export default function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-end justify-between gap-3 px-5 ${className}`}>
      <div className="min-w-0">
        <h2 className="font-heading text-lg font-bold tracking-[-0.04em] text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
