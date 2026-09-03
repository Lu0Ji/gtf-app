// See DESIGN.md §8 — neutral tag by default, or a status color for
// verified-correct/incorrect and urgency callouts. For the tiered
// difficulty pill specifically, use DifficultyChip.jsx instead — this is
// the general-purpose one (category tags, status labels, counts).
const TONES = {
  neutral: 'bg-secondary text-secondary-foreground',
  success: 'bg-success text-success-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  accent: 'bg-muted text-primary',
}

export default function Chip({ tone = 'neutral', icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${TONES[tone]} ${className}`}>
      {icon && <iconify-icon icon={icon} class="text-xs"></iconify-icon>}
      {children}
    </span>
  )
}
