// Single source of truth for prediction/group categories — used to be three
// separate, slightly-inconsistent arrays (Anasayfa, Gruplar, TahminOlustur;
// Gruplar's was even missing "Bilim"). DB values are always the lowercased
// Turkish label (predictions.category, groups.category), so adding a
// category here is a pure frontend change — no migration needed.
//
// `ink` is one of the design system's real theme colors (design system
// pulled from FireVibe — chart1-5/primary/accent/success/destructive), not
// an invented palette — every category used to render in the same flat
// gray/blue regardless of topic, which is a big part of why group/category
// cards read as lifeless. Only 9 real theme colors exist for 13 categories,
// so a few repeat; that's an acceptable tradeoff over inventing off-system
// hex values.
export const CATEGORY_META = {
  spor: { icon: 'lucide:trophy', label: 'Spor', ink: 'var(--color-chart5)' },
  teknoloji: { icon: 'lucide:cpu', label: 'Teknoloji', ink: 'var(--color-chart2)' },
  bilim: { icon: 'lucide:flask-conical', label: 'Bilim', ink: 'var(--color-chart4)' },
  kültür: { icon: 'lucide:book-open', label: 'Kültür', ink: 'var(--color-chart3)' },
  ekonomi: { icon: 'lucide:chart-no-axes-combined', label: 'Ekonomi', ink: 'var(--color-success)' },
  dünya: { icon: 'lucide:globe-2', label: 'Dünya', ink: 'var(--color-primary)' },
  siyaset: { icon: 'lucide:landmark', label: 'Siyaset', ink: 'var(--color-chart1)' },
  sağlık: { icon: 'lucide:heart-pulse', label: 'Sağlık', ink: 'var(--color-destructive)' },
  oyun: { icon: 'lucide:gamepad-2', label: 'Oyun', ink: 'var(--color-accent)' },
  kripto: { icon: 'lucide:bitcoin', label: 'Kripto', ink: 'var(--color-chart3)' },
  eğlence: { icon: 'lucide:clapperboard', label: 'Eğlence', ink: 'var(--color-chart5)' },
  uzay: { icon: 'lucide:rocket', label: 'Uzay', ink: 'var(--color-chart1)' },
  // Groups-only catch-all — not a real topic, so it's excluded from
  // CATEGORIES below (predictions always pick a real topic).
  genel: { icon: 'lucide:sparkles', label: 'Genel', ink: 'var(--color-muted-foreground)' },
}

// Real topic categories, in display order — predictions and the Keşfet/
// Anasayfa filter tabs.
export const CATEGORIES = Object.entries(CATEGORY_META)
  .filter(([key]) => key !== 'genel')
  .map(([, meta]) => meta.label)

// Groups can also be left uncategorized ("Genel"), predictions can't.
export const GROUP_CATEGORIES = ['Genel', ...CATEGORIES]
