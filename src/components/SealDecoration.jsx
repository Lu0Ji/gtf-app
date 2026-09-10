// Wax-seal medallion + ribbon + parchment texture for a "decorated" seal
// style (see seal-styles.js — 'ferman'/'noter'/'altin'). Purely decorative,
// mirrors BadgeMedallion.jsx's approach of a themed circle around a Lucide
// icon rather than a custom icon set (DESIGN.md §6: Lucide exclusively).
// Fully generic over the style's own medallionGradient/medallionIconColor/
// ribbonGradient — adding another costume later is a new palette in
// seal-styles.js, not a new branch here.
//
// Lives only inside the still-sealed card in TahminKaydi.jsx (bkz.
// seal-customization-strategy.md Constraints — the opened-state result
// banner uses semantic success/destructive colors and deliberately stays
// untouched by any costume). A style with no `decorated` flag renders
// nothing, so 'basic' is a no-op import.
export default function SealDecoration({ style }) {
  if (!style.decorated) return null

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '3px 3px' }}
      />
      <div
        className="pointer-events-none absolute right-9 top-0 h-11 w-3.5 opacity-90"
        style={{ background: style.ribbonGradient, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}
      />
      <div
        className="pointer-events-none absolute right-3 top-2 flex h-[68px] w-[68px] rotate-[-6deg] items-center justify-center rounded-full"
        style={{
          background: style.medallionGradient,
          color: style.medallionIconColor,
          boxShadow: '0 6px 14px rgba(0,0,0,0.35), inset 0 -3px 6px rgba(0,0,0,0.25), inset 0 2px 3px rgba(255,255,255,0.3)',
        }}
      >
        <iconify-icon icon={style.medallionIcon} class="text-2xl"></iconify-icon>
      </div>
    </>
  )
}
