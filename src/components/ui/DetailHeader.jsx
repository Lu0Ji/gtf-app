import { useNavigate } from 'react-router-dom'

// See DESIGN.md §8/§9 — the back-button header for every drill-down/detail/
// settings screen (27 screens already share this shape, more than any other
// header pattern in the app). Two layouts, chosen automatically:
//   - no subtitle/action → centered title, back button + balancing spacer
//     (the settings-screen shape: EpostaVeTelefon, MesajIstekleri, ...)
//   - subtitle and/or action → left-aligned title next to the back button,
//     action trailing (the content-detail shape: LiderlikTablosu, GrupDetayi, ...)
export default function DetailHeader({ title, subtitle, eyebrow, onBack, action, sticky = true }) {
  const navigate = useNavigate()
  const handleBack = onBack || (() => navigate(-1))
  const wrapperClass = `border-b border-border/80 px-5 pb-4 pt-12 ${
    sticky ? 'sticky top-0 z-20 bg-background/95 backdrop-blur-md' : 'bg-background'
  }`
  const backButton = (
    <button
      aria-label="Geri dön"
      onClick={handleBack}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
    >
      <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
    </button>
  )

  if (subtitle || action || eyebrow) {
    return (
      <header className={wrapperClass}>
        <div className="flex items-center gap-3">
          {backButton}
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
            )}
            <h1 className="truncate font-heading text-[17px] font-extrabold tracking-[-0.035em]">{title}</h1>
            {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>
    )
  }

  return (
    <header className={wrapperClass}>
      <div className="flex items-center justify-between">
        {backButton}
        <h1 className="font-heading text-[17px] font-extrabold tracking-[-0.035em]">{title}</h1>
        <div className="h-10 w-10" />
      </div>
    </header>
  )
}
