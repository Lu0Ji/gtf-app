# GTF Design Language

**Guess the Future (GTF)** — a Turkish social prediction app. People seal a prediction
about something that hasn't happened yet, the app locks it until the event resolves,
and the community follows, reacts, and keeps score. It's part social feed, part
time capsule, part leaderboard.

This document is not a fresh design proposal. It's the system that was already
emerging, organically, across ~35 screens built one at a time — written down so it
stops being organic and starts being a rule. Every number in here was extracted from
the codebase's own dominant pattern, not invented. Where the codebase drifted
(the same idea expressed as `-0.045em` in one screen and `-0.055em` in the next),
this doc picks the center of that drift as the one true value, going forward.

**The memorable thing:** GTF should feel like a keepsake box, not a spreadsheet.
Every prediction is something someone put their name on before they knew the
answer — the UI's job is to make that feel a little ceremonial (sealing, opening,
a badge that says "you called it"), while the surrounding app (feed, chat, profile)
still moves at normal social-app speed. Ceremony in the moments that deserve it,
speed everywhere else.

---

## 1. Voice & tone

- Turkish, "sen" register throughout (not "siz") — GTF talks to you like a friend
  who's also tracking your predictions, not an institution.
- Warm and a little playful in onboarding/empty-states/celebration copy
  ("Hoş geldin", "ben kazandım" energy on badges). Neutral and efficient in
  settings/utility screens — don't force warmth where the user just wants a toggle.
- Never robotic-corporate. No "İşlem başarıyla gerçekleştirildi" — say what happened
  in plain words ("Kaydedildi", "Mesaj gönderilemedi, tekrar dene").
- Numbers and stats speak for themselves — don't over-explain a stat block with a
  paragraph when a label under the number does the job.

## 2. Color

Defined once as CSS custom properties in `src/index.css` (`@theme` + dark-mode
overrides). Never hardcode a hex value in a screen — every color a screen uses
should resolve to one of these roles so dark mode and the custom-accent picker
(`ProfilAyarlari.jsx`) both work for free.

| Role | Light | Dark | Use for |
|---|---|---|---|
| `background` | `#f6fafd` | `#0f1a22` | Page canvas |
| `foreground` | `#172b3a` | `#e7eef3` | Primary text |
| `card` / `card-foreground` | `#ffffff` / `#172b3a` | `#16232c` / `#e7eef3` | Any raised surface |
| `muted` / `muted-foreground` | `#eaf2f6` / `#607583` | `#1c2b35` / `#8ba3b3` | Subtle fills, secondary text |
| `border` | `#c9dae4` | `#2a3d49` | Hairlines, card outlines |
| `primary` / `primary-foreground` | `#356a8a` | `#5b93b3` | Brand actions, active states — **user-overridable**, see below |
| `secondary` / `secondary-foreground` | `#dceaf2` / `#24465c` | `#22333e` / `#bcdcee` | Pills, tab-active fills, quiet CTAs |
| `accent` | `#6f9fba` | `#7fb0c9` | Countdown/urgency accents (hourglass timers, "yakında") — a second brand voice, not a duplicate of primary |
| `success` / `destructive` | `#267050` / `#b8434b` | `#2f9468` / `#d1595f` | Verified-correct / verified-incorrect, destructive confirms |
| `chart1`–`chart5` | see index.css | — | Category/data visualization only — never for UI chrome |

**`primary` is the one role a user can personalize** (Profil Ayarları → custom hex
or one of 6 presets). Every other role stays fixed. This means: never assume
`primary` is literally navy — don't pair it with something that only works against
that one blue (e.g. a fixed gradient stop tuned to `#356a8a`); use `color-mix()`
against the CSS variable instead, the way `BadgeMedallion.jsx` does.

**Rule of thumb:** if you're reaching for a raw hex in a screen, you're either
drawing a data-viz chart (use `chart1`–`chart5`) or you've found a real gap in the
palette — raise it, don't invent a one-off color.

## 3. Typography

Two families, both loaded once, never per-screen:

- **`font-heading`** — Manrope. Titles, section headers, stat numbers, anything
  that should feel like a headline.
- **`font-body`** — Inter. Everything else: body copy, buttons, form fields, nav.

### The scale

Six sizes cover every screen in the app. Use the Tailwind token where one exists;
drop to an arbitrary `text-[Npx]` only at the Display/Eyebrow tier where exact
control matters more than the default scale's granularity.

| Tier | Size | Weight / tracking | Where |
|---|---|---|---|
| **Display** | `text-[25px]`–`text-[27px]` `font-heading font-extrabold` | `tracking-[-0.06em]` | The one big page title per screen (`<h1>` in a header) |
| **Heading** | `text-lg`–`text-xl` `font-heading font-bold` | `tracking-[-0.04em]` | Section titles, card titles, sheet headers |
| **Subhead** | `text-sm`–`text-base` `font-heading font-bold` or `font-bold` | `tracking-[-0.03em]` | List-row titles, prominent inline numbers, tab labels |
| **Body** | `text-sm` (14px) `font-body` | none | Default paragraph/label text — the workhorse size |
| **Caption** | `text-[10px]`–`text-[11px]` `font-medium`/`font-semibold` | none | Timestamps, helper text, metadata under a title |
| **Eyebrow** | `text-[11px]` `font-semibold uppercase` | `tracking-[0.14em]` | Small kicker label above a Display title (`Profil`, `Keşfet`) |

Stat numbers (points, streaks, percentages) always use `font-heading font-extrabold`
at whatever size the context calls for, with tracking one notch tighter than the
surrounding text tier — numbers read denser than words at the same size, tight
tracking corrects for it.

## 4. Spacing & layout

- **Page gutter:** `px-5` (20px) on every screen, no exceptions — it's what makes
  swiping between screens feel like the same app.
- **Section rhythm:** `mt-6`/`mt-7`/`mt-8` between major sections on a screen (never
  `mt-4` between two full sections — that's list-item spacing, not section spacing).
  `mt-3` between a section's heading and its content.
- **Radius:** one radius for everything that isn't a circle: `rounded-theme` (16px,
  `--radius-theme`). Avatars, icon badges, and pills use `rounded-full`. Never a
  third radius value — no `rounded-xl`/`rounded-2xl` alongside `rounded-theme`.
- **Desktop shell** (`AppShell.jsx`): fixed 3-column layout at `xl:` — 240px sidebar,
  a content column capped at 680px, a 300–420px right rail. Below `xl:`, sidebar +
  column only; below `md:`, single column + bottom nav. A screen's own content
  never needs to know which of these it's in — `AppShell` handles it.

## 5. Elevation

One shadow for 95% of surfaces: **`shadow-sm`**. It's what separates a card from
the page background — that's its whole job, not a design flourish. Reach for
`shadow-md`/`lg` only for something genuinely floating above the page content
(a bottom sheet, a fixed action bar, a modal) — and even then, sparingly; most
sheets rely on the backdrop + `border-t` instead of a heavier shadow.

## 6. Iconography

[Lucide](https://lucide.dev) icons exclusively, via `<iconify-icon icon="lucide:name">`.
Never mix in another icon set. Sizes cluster around a small ladder — pick the
nearest, don't invent a new one:

- `text-xs` (12px) — inline with caption text, inside a small pill/chip
- `text-sm`/`text-base` (14–16px) — inline with body text, in a compact stat row
- `text-lg`/`text-[18px]`/`text-[19px]` — the default "tappable icon button" size
  (back arrows, header actions) — **`19px` is the header-icon standard**, don't drift to 17 or 20
- `text-xl`+ — a hero icon inside a large circular badge (empty states, onboarding)

## 7. Motion

The one area of the app that's been almost entirely silent (12 transition/animation
declarations across 35 screens) — this is the gap worth closing, not because motion
is decoration, but because it's the difference between an app that feels alive and
one that feels like a form. Rules, kept deliberately small:

- **Every tappable surface gets tap feedback.** `active:scale-[0.97] transition-transform duration-150` on buttons and tappable cards — the new `Button` primitive (§9) bakes this in so it's automatic, not a per-screen decision.
- **Sheets and modals slide, they don't pop.** A bottom sheet enters with a
  `duration-200 ease-out` translate-Y from 100% → 0; the backdrop fades in behind
  it. The `Sheet` primitive (§9) implements this once.
- **State changes that matter get a transition, state changes that don't stay instant.**
  Color/opacity changes on hover or selection: `transition-colors duration-150`.
  Data simply appearing (a feed loading, a list filtering) stays instant — don't
  animate content in, it reads as latency, not delight.
- **Respect `data-reduce-motion`** — already wired at the CSS layer
  (`[data-reduce-motion="true"] * { animation-duration: 0.001ms !important; ... }`
  in `index.css`); any new animation automatically obeys it, don't special-case it.
- **No animation as the point of the interaction** — no confetti-for-confetti's-sake,
  no bouncing icons with no trigger. The one earned exception: sealing/opening a
  prediction and unlocking a badge are the app's ceremonial moments (§ Memorable
  thing) — those get a beat of real motion the rest of the app doesn't.

## 8. Voice of the UI: component patterns

These are the shapes that already repeat dozens of times across the app (measured:
the card pattern alone appears 131 times, `shadow-sm` 210 times) — encoded once as
primitives in `src/components/ui/` (§9) instead of re-typed per screen.

- **Screen header** — eyebrow + Display title, optional trailing icon-button.
  `px-5 pt-12 pb-5`. Every top-level tab screen (Anasayfa, Mesajlar, Keşfet,
  Profil...) opens this way.
- **Detail header** — back button + title, `px-5 pt-12 pb-4`, sticky +
  `backdrop-blur-md` by default. This is the app's *most-repeated* header shape
  (27 of 35 screens) — every drill-down and every settings screen. Two layouts:
  centered title with a balancing spacer when there's no subtitle/trailing action
  (settings screens), left-aligned title next to the back button when there is
  one (content-detail screens like a leaderboard or a group).
- **Section header** — Heading-tier title + optional Caption subtitle underneath,
  optional trailing text-link ("Tümü") or icon-button on the same row.
- **Card** — `rounded-theme border border-border bg-card p-4 shadow-sm`. The
  default container for anything that isn't full-bleed content.
- **Chip / pill** — `rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold
  text-secondary-foreground` for neutral tags (category, count); swap `secondary`
  for `success`/`destructive`/`accent` fills for status chips. `DifficultyChip.jsx`
  is the reference implementation for a tiered version of this.
- **Buttons** — three flavors, one radius (`rounded-theme`), one tap-feedback rule:
  - *Primary:* `bg-primary text-primary-foreground` — one per screen/section, the
    single most-important action.
  - *Secondary:* `bg-secondary text-secondary-foreground` — everything that isn't
    the primary action but still needs a filled affordance.
  - *Ghost/outline:* `border border-border bg-card text-foreground` — icon-only
    header buttons, dismissive actions.
- **Empty state** — dashed border, muted fill: `rounded-theme border border-dashed
  border-border bg-muted/60`, centered icon-in-circle + Subhead line + Caption
  helper line + optional CTA.
- **List row** — avatar/icon + title/subtitle stack + trailing meta, full-width
  tap target, hairline `border-b border-border` between rows, no border on the
  last row.
- **Bottom sheet** — `fixed inset-0 z-50 bg-black/40` backdrop + `rounded-t-theme
  bg-background` panel pinned to the bottom, per §7's slide-up motion.

## 9. Primitives

`src/components/ui/` holds the components that turn the rules above into things
you import instead of re-deriving:

- `Button.jsx` — `primary` / `secondary` / `ghost` variants, tap feedback built in.
- `Card.jsx` — the card shape, as a wrapper (or `as="button"` for a tap target).
- `ScreenHeader.jsx` — eyebrow + Display title + optional trailing action.
- `DetailHeader.jsx` — back-button header, centered or left-aligned, optional eyebrow above the title (see §8).
- `SectionHeader.jsx` — Heading title + optional subtitle + optional trailing link.
- `EmptyState.jsx` — icon + title + helper text + optional CTA.
- `Chip.jsx` — neutral/success/destructive/accent pill.
- `Sheet.jsx` — the bottom-sheet shell with backdrop + slide-up motion.

New screens should reach for these first. Existing screens migrate opportunistically
(whenever a screen is touched for another reason, bring its header/cards/buttons
onto the primitives) rather than as one large rewrite — see the note in the repo's
commit history for which screens have already migrated.

## 10. Anti-patterns — don't

- Don't invent a second radius, a second card shadow, or a third icon set "just for
  this screen." If it doesn't fit an existing role, that's a signal to extend this
  doc, not to freelance.
- Don't hardcode a hex color anywhere outside `index.css` and `chart1`–`chart5` use.
- Don't center everything — GTF's screens read left-aligned, text-first; centered
  layouts are reserved for true empty/celebration states.
- Don't add motion that isn't tied to a real interaction (no idle bouncing, no
  gratuitous parallax).
- Don't write settings-screen copy in the warm/playful voice, or onboarding copy in
  the neutral/utility voice — match tone to context (§1).
