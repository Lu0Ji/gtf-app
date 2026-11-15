import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// See DESIGN.md §8/§9 — the back-button header for every drill-down/detail/
// settings screen (27 screens already share this shape, more than any other
// header pattern in the app). Two layouts:
//   - left-aligned (the default once there's a subtitle/eyebrow/action) —
//     title(+subtitle) grows next to the back button, action trailing at any
//     width (the content-detail shape: LiderlikTablosu, KullaniciProfili, ...)
//   - centered (`centered` prop, or no subtitle/eyebrow/action at all) — back
//     button + balancing element, title(+subtitle) truly centered between
//     them. `trailing` swaps the balancing spacer for a same-size icon button
//     (Rozetler's help button, Tahmin Kaydı's share) without breaking the
//     centering the way a growing `action` would. `centered` opts a
//     subtitle-bearing header into this layout instead of the left-aligned
//     default (Hareketler, Begeniler — a centered subtitle read as intentional
//     there, not left-aligned drift).
export default function DetailHeader({ title, subtitle, eyebrow, onBack, action, trailing, centered = false, sticky = true }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const handleBack = onBack || (() => navigate(-1))
  const wrapperClass = `border-b border-border/80 px-5 pb-4 pt-screen ${
    sticky ? 'sticky top-0 z-20 bg-background/95 backdrop-blur-md' : 'bg-background'
  }`
  const backButton = (
    <button
      aria-label={t('common.backAria')}
      onClick={handleBack}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
    >
      <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
    </button>
  )

  if (!centered && (eyebrow || action || subtitle)) {
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
        <div className="text-center">
          <h1 className="font-heading text-[17px] font-extrabold tracking-[-0.035em]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{subtitle}</p>}
        </div>
        {trailing || <div className="h-10 w-10 shrink-0" />}
      </div>
    </header>
  )
}
