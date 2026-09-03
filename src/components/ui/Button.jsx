// See DESIGN.md §8/§9 — one radius, one tap-feedback rule, three variants.
// `as="button"` covers the common case; pass a different element (rare —
// e.g. a Link-like wrapper) only when the call site truly needs it.
const VARIANTS = {
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  ghost: 'border border-border bg-card text-foreground',
}

export default function Button({
  variant = 'primary',
  icon,
  iconClass = 'text-lg',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-theme text-sm font-bold shadow-sm transition-transform duration-150 active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {icon && <iconify-icon icon={icon} class={iconClass}></iconify-icon>}
      {children}
    </button>
  )
}
