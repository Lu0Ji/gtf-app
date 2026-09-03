// See DESIGN.md §8 — dashed muted card, icon-in-circle + Subhead + Caption
// helper text + optional CTA. The shape used for "henüz kimse/kayıt yok"
// states across the app.
export default function EmptyState({ icon = 'lucide:inbox', title, description, action, className = '' }) {
  return (
    <div className={`rounded-theme border border-dashed border-border bg-muted/60 px-5 py-6 text-center ${className}`}>
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-card text-primary shadow-sm">
        <iconify-icon icon={icon} class="text-lg"></iconify-icon>
      </div>
      {title && <h3 className="mt-3 font-heading text-sm font-bold text-foreground">{title}</h3>}
      {description && (
        <p className="mx-auto mt-1 max-w-[260px] text-xs leading-5 text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
