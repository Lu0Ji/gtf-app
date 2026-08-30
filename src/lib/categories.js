// Single source of truth for prediction/group categories — used to be three
// separate, slightly-inconsistent arrays (Anasayfa, Gruplar, TahminOlustur;
// Gruplar's was even missing "Bilim"). DB values are always the lowercased
// Turkish label (predictions.category, groups.category), so adding a
// category here is a pure frontend change — no migration needed.
export const CATEGORY_META = {
  spor: { icon: 'lucide:trophy', label: 'Spor' },
  teknoloji: { icon: 'lucide:cpu', label: 'Teknoloji' },
  bilim: { icon: 'lucide:flask-conical', label: 'Bilim' },
  kültür: { icon: 'lucide:book-open', label: 'Kültür' },
  ekonomi: { icon: 'lucide:chart-no-axes-combined', label: 'Ekonomi' },
  dünya: { icon: 'lucide:globe-2', label: 'Dünya' },
  siyaset: { icon: 'lucide:landmark', label: 'Siyaset' },
  sağlık: { icon: 'lucide:heart-pulse', label: 'Sağlık' },
  oyun: { icon: 'lucide:gamepad-2', label: 'Oyun' },
  kripto: { icon: 'lucide:bitcoin', label: 'Kripto' },
  eğlence: { icon: 'lucide:clapperboard', label: 'Eğlence' },
  uzay: { icon: 'lucide:rocket', label: 'Uzay' },
  // Groups-only catch-all — not a real topic, so it's excluded from
  // CATEGORIES below (predictions always pick a real topic).
  genel: { icon: 'lucide:sparkles', label: 'Genel' },
}

// Real topic categories, in display order — predictions and the Keşfet/
// Anasayfa filter tabs.
export const CATEGORIES = Object.entries(CATEGORY_META)
  .filter(([key]) => key !== 'genel')
  .map(([, meta]) => meta.label)

// Groups can also be left uncategorized ("Genel"), predictions can't.
export const GROUP_CATEGORIES = ['Genel', ...CATEGORIES]
