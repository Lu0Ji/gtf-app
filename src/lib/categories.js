// Single source of truth for prediction/group categories — used to be three
// separate, slightly-inconsistent arrays (Anasayfa, Gruplar, TahminOlustur;
// Gruplar's was even missing "Bilim"). DB values are always this object's
// lowercase Turkish keys (predictions.category, groups.category) — that
// never changes, regardless of display language, so adding a category here
// is still a pure frontend change and no existing row's category value ever
// needs touching.
//
// `label` is the Turkish display string — kept as the default/fallback for
// any screen not yet migrated to i18n (see `labelKey` below for those that
// are: pass it through t() to get the string in the viewer's language).
//
// `ink` is one of the design system's real theme colors (design system
// pulled from FireVibe — chart1-5/primary/accent/success/destructive), not
// an invented palette — every category used to render in the same flat
// gray/blue regardless of topic, which is a big part of why group/category
// cards read as lifeless. Only 9 real theme colors exist for 13 categories,
// so a few repeat; that's an acceptable tradeoff over inventing off-system
// hex values.
export const CATEGORY_META = {
  spor: { icon: 'lucide:trophy', label: 'Spor', labelKey: 'category.spor', ink: 'var(--color-chart5)' },
  teknoloji: { icon: 'lucide:cpu', label: 'Teknoloji', labelKey: 'category.teknoloji', ink: 'var(--color-chart2)' },
  bilim: { icon: 'lucide:flask-conical', label: 'Bilim', labelKey: 'category.bilim', ink: 'var(--color-chart4)' },
  kültür: { icon: 'lucide:book-open', label: 'Kültür', labelKey: 'category.kültür', ink: 'var(--color-chart3)' },
  ekonomi: { icon: 'lucide:chart-no-axes-combined', label: 'Ekonomi', labelKey: 'category.ekonomi', ink: 'var(--color-success)' },
  dünya: { icon: 'lucide:globe-2', label: 'Dünya', labelKey: 'category.dünya', ink: 'var(--color-primary)' },
  siyaset: { icon: 'lucide:landmark', label: 'Siyaset', labelKey: 'category.siyaset', ink: 'var(--color-chart1)' },
  sağlık: { icon: 'lucide:heart-pulse', label: 'Sağlık', labelKey: 'category.sağlık', ink: 'var(--color-destructive)' },
  oyun: { icon: 'lucide:gamepad-2', label: 'Oyun', labelKey: 'category.oyun', ink: 'var(--color-accent)' },
  kripto: { icon: 'lucide:bitcoin', label: 'Kripto', labelKey: 'category.kripto', ink: 'var(--color-chart3)' },
  eğlence: { icon: 'lucide:clapperboard', label: 'Eğlence', labelKey: 'category.eğlence', ink: 'var(--color-chart5)' },
  uzay: { icon: 'lucide:rocket', label: 'Uzay', labelKey: 'category.uzay', ink: 'var(--color-chart1)' },
  // Groups-only catch-all — not a real topic, so it's excluded from
  // CATEGORIES/CATEGORY_SLUGS below (predictions always pick a real topic).
  genel: { icon: 'lucide:sparkles', label: 'Genel', labelKey: 'category.genel', ink: 'var(--color-muted-foreground)' },
}

// Real topic categories, in display order — predictions and the Keşfet/
// Anasayfa filter tabs.
export const CATEGORIES = Object.entries(CATEGORY_META)
  .filter(([key]) => key !== 'genel')
  .map(([, meta]) => meta.label)

// Same order as CATEGORIES, but the stable DB slug instead of the Turkish
// label — use this (with `t(CATEGORY_META[slug].labelKey)` for display)
// anywhere a category is stored, filtered, or compared, so the value never
// changes with the viewer's language. CATEGORIES itself stays Turkish-only
// for screens not yet migrated.
export const CATEGORY_SLUGS = Object.keys(CATEGORY_META).filter((key) => key !== 'genel')

// Groups can also be left uncategorized ("Genel"), predictions can't.
export const GROUP_CATEGORIES = ['Genel', ...CATEGORIES]
