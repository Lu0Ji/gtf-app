import { useTranslation } from 'react-i18next'
import { findSealStyle } from '../lib/seal-styles.js'

// Small "which costume are they wearing" pill for a profile header — the
// personalization investment in seal-styles.js/SealDecoration.jsx only
// ever showed up on the owner's own still-sealed prediction cards before
// this (2026-09-11: "kişiselleştirmeyi arttıralım" advice #4 — nobody else
// could ever see what costume someone else had equipped). 'basic' is the
// default everyone starts on, so it renders nothing — only a real, earned
// costume is worth flaunting here. Reuses the style's own containerClassName
// so the chip's colors always match the actual sealed-card look, no new
// palette to keep in sync.
export default function SealStyleChip({ slug }) {
  const { t } = useTranslation()
  const style = findSealStyle(slug)
  if (style.slug === 'basic') return null

  return (
    <span
      className={`mt-1.5 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.containerClassName}`}
    >
      <iconify-icon icon={style.medallionIcon || style.lockIcon} class="text-xs"></iconify-icon>
      {t(style.titleKey)}
    </span>
  )
}
