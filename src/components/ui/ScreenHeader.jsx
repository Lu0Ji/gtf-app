// See DESIGN.md §3/§8 — eyebrow + Display title, the opening move of every
// top-level tab screen. `action` is an optional trailing icon-button
// (settings gear, edit pencil, etc.) — pass the full <button> so callers
// keep control of onClick/aria-label.
export default function ScreenHeader({ eyebrow, title, subtitle, action, className = '' }) {
  return (
    <header className={`px-5 pt-screen pb-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
          )}
          <h1 className="mt-1 truncate font-heading text-[27px] font-extrabold tracking-[-0.06em] text-primary">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}
