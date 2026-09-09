---
name: Pulse — Personal Productivity OS
description: A dark forest-green, premium-minimalist daily cockpit for planning, focus, and progress.
colors:
  forest-deep: "#04140f"
  forest-ground: "#061b14"
  surface: "#0b241c"
  surface-elevated: "#102c23"
  surface-soft: "#132f26"
  hairline: "#24483c"
  hairline-soft: "#18372d"
  ink-hi: "#f4f7f5"
  ink-mid: "#aebdb6"
  ink-low: "#71827b"
  lime-accent: "#b8ff4a"
  lime-accent-soft: "#8edc45"
  lime-accent-dark: "#4f8c32"
  priority-high: "#ff6b6b"
  priority-medium: "#e8c85a"
  priority-low: "#6fde78"
  ring-track: "#203a31"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "0.08em"
    textTransform: "uppercase"
rounded:
  card: "18px"
  card-large: "22px"
  control: "12px"
  pill: "9999px"
spacing:
  gutter: "24px"
  section: "32px"
  card-pad: "20px"
components:
  button-primary:
    backgroundColor: "{colors.lime-accent}"
    textColor: "#061b14"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.lime-accent-soft}"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink-hi}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-hi}"
    rounded: "{rounded.card}"
    borderColor: "{colors.hairline}"
  input:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink-hi}"
    rounded: "{rounded.control}"
    borderColor: "{colors.hairline}"
  chip:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink-mid}"
    rounded: "{rounded.pill}"
  chip-selected:
    backgroundColor: "{colors.accent}"
    textColor: "#061b14"
  ring-track:
    backgroundColor: "{colors.ring-track}"
    textColor: "{colors.lime-accent}"
---

# Design System: Pulse — Personal Productivity OS

## Overview

**Creative North Star: "The focus cabin in a forest at night"**

Pulse is a personal productivity OS for a single user. The interface reads like a quiet, rain-damped cabin office built on paper-dark forest floors: near-black green grounds, hairline borders that catch the light like wood grain, and one bright lime accent — the "signal light" — that is drawn only where the user acts or earns progress. The world is premium-minimalist: nothing decorative, everything functional, but with the exactness of instruments rather than the looseness of a toy.

The mode is **Operate**. Scanability and consistency outrank expression more than a product this personal can get away with, so the design depends on precision rather than spectacle: fine-stroked progress rings with a tick at the current value, tabular numerals for metrics, hover-only affordances on desktop that become always-visible on touch, and a motion system tuned to 100–300ms with a gentle ease-out. The signature is the **progress ring** — fine stroke, muted green track, lime sweep, and a small tick bead that travels the rim to the live value. It is the app's heartbeat: it fills as the day is actually completed.

Color is scarce and rationed. The lime accent sits on polished, reflective rounded surfaces, has no gradient around it, and never decorates idle chrome. Reduced motion collapses every animation to near-zero; the data never hides behind the choreography.

**Key Characteristics:**
- Rationed lime on dark forest ground — accent means "act here" or "progress earned"
- Fine-stroked progress rings with a traveling tick bead as the signature element
- Hairline borders, soft cards, generous rounded corners (14–22px)
- Tabular numerals on every metric; Inter throughout
- 100–300ms eased-in-out motion that collapses under reduced motion
- Hover-revealed desktop affordances; always-visible on touch

## Colors

A two-family palette: the forest (grounds, surfaces, ink) and the signal light (one lime). Priority uses a quiet trip (red/amber/green) only inside task rows.

### Primary
- **Lime Signal** (#b8ff4a): The only full-chroma accent. Used on the active progress ring sweep, the "+" add button, the primary call-to-action (Start focus), checked/selected chips, and the completion mark. Appears on ≤10% of any given screen.
- **Lime Soft** (#8edc45): Hover deepening of the primary CTA.
- **Lime Dark** (#4f8c32): Shallow infill for charts, bar tracks, and "on track" fills that should not shout.

### Neutral
- **Forest Deep** (#04140f): The deepest recess; app background-adjacent recesses, scrollbar chrome.
- **Forest Ground** (#061b14): App background.
- **Surface** (#0b241c): Card and panel background.
- **Surface Elevated** (#102c23): Inputs, nav items, chips, inner wells — one step up from surface.
- **Surface Soft** (#132f26): Icon wells, hover states.
- **Hairline** (#24483c): Borders; the dominant structural line.
- **Hairline Soft** (#18372d): Faint dividers inside cards.
- **Ink Hi** (#f4f7f5): Primary text, headings.
- **Ink Mid** (#aebdb6): Secondary text, meta.
- **Ink Low** (#71827b): Captions, placeholders, menu icons at rest.
- **Ring Track** (#203a31): The empty track of progress rings.

### Named Rules
**The Rationed Signal Rule.** The lime accent is used on ≤10% of any given screen. It marks action and earned progress — never idle chrome, never as a wash. Rarity is the point.
**The No-Glow Rule.** Accents never glow, blur, or emit. The ring's fine stroke and tick speak louder than any halo; a glow would trade instrument precision for "game UI" signal.

## Typography

**Display / Body / Label Font:** Inter (with system-ui, Segoe UI, sans-serif fallbacks), loaded as a variable font.

**Character:** Inter is the full interface voice — a hard-working neutral that reads instrument-accurate in tabular numerals and warm at display sizes. No secondary font; hierarchy comes from size, weight, and tracking reduction.

### Hierarchy
- **Display** (700, 30–32px, –0.02em): Greeting name, primary page titles that anchor a surface.
- **Title** (700, 22–24px, –0.01em): Section titles — "Today's Progress", "Focus by day".
- **Section** (700, 17px): Card and section headings.
- **Body** (400, 15px/1.5): Task rows, paragraphs, secondary copy.
- **Meta** (400, 13px): Task sub-lines, timestamps, chart captions.
- **Label** (600, 10–11px, +0.08em, uppercase): Chips ("Now", "Today/This week"), tiny section markers.
- **Metric** (700, 26–42px, tabular-nums): The center value of progress rings and stat cards.

### Named Rules
**The Rationed Boldness Rule.** Bold (700) is reserved for the value the eye must land on — the greeting, the ring value, section titles, the active metric. Task titles and body text stay at 400–500 with hierarchy carried by size and color, not weight stacking.
**The Tabular-Precision Rule.** Every live metric renders with `tabular-nums`. Numbers that change (elapsed focus time, percentages, counts) must not reflow the layout as they tick.

## Layout

A persistent app shell: fixed left sidebar (232px) with the wordmark, primary nav (Home, Goals, Tasks, Analytics, Settings), and a "Focus now" quick action; main content in a centered column (max-width ~880px) with generous vertical rhythm (24px gutters), a **global timer bar** docked to the bottom edge across all surfaces whenever a session is active, and a bottom tab bar replacing the sidebar below `lg` on touch.

- **Desktop:** sidebar + scrollable main column; cards sit in 1–2 column grids (1-up for progress, 2-up for charts at ≥lg).
- **Mobile (below lg / 1024px):** header stack, single column grid, bottom navigation; hover gestures (reveal play button) become always-visible; the timer bar stays docked.
- **Spacing rhythm:** 24px page gutter; ~32px between sections; card padding 20–24px. Rows are dense enough to scan a full day list without scrolling twice.

## Elevation & Depth

Flat by default. Depth is carried by **tonal layering** (ground → surface → elevated → soft) and hairline borders, not by shadows. Two soft card shadows exist for the rare floating element — the active-session docked bar and modals — and they are the only shadows in the system.

### Shadow Vocabulary
- **float** (`0 8px 24px rgba(0,0,0,.16)`): The global timer bar and modal dialogs — anything that visually docks above the page.
- **float-sm** (`0 4px 12px rgba(0,0,0,.12)`): Small floating chips and tooltips.

### Named Rules
**The Flat-by-Default Rule.** Surfaces are flat at rest. Shadows appear only for elements that physically float above the page (timer bar, modal). Never shadow a card in the page flow.

## Shapes

Soft, generous radii throughout — the "polished instrument" language. Cards 14–18px, large feature cards 22px, controls and inputs 12px, and every button, chip, avatar, and tick bead is a full pill (9999px). Borders are hairlines (1px) in Hairline; forms, chips, and nav items sit one tonal step above their background (Surface Elevated). The progress ring is pure geometry: a wide-stroke circle in a muted track with a lime sweep and a small round tick bead (5px, accent-filled, background-stroked) riding the rim — no gradients, no glow.

## Components

### Buttons
- **Shape:** full pill (9999px), 40–52px tall; primary CTA icon round 46–52px.
- **Primary:** Lime Signal fill, Forest Deep text (#061b14), bold; hover deepens to Lime Soft. Signals the single act the screen wants — start focus, create task, save.
- **Secondary:** Surface Elevated fill, Ink Hi text, hairline border.
- **Danger:** transparent, coral text/border on the destructive confirm.
- **Hover / Focus:** 150ms color transition; `:active` scales to 0.98; focus ring is 2px lime with offset.

### Chips
- **Style:** pill, Surface Elevated fill, Ink Mid text, no border; adjacent chips separated by 8px gaps.
- **State:** selected → Lime Signal fill with Forest Deep text (the rationed accent doing selection work); filter chips behave the same.

### Cards / Containers
- **Corner Style:** 18px standard, 22px feature (progress card, charts).
- **Background:** Surface; inner wells use Surface Elevated; icon basins use Surface Soft.
- **Shadow Strategy:** none in flow (see Elevation).
- **Border:** 1px Hairline; faint Hairline Soft for dividers between list rows.
- **Internal Padding:** 20–24px.

### Inputs / Fields
- **Style:** Surface Elevated fill, 12px radius, 1px Hairline border.
- **Focus:** 2px lime outline with 2px offset; border color follows to accent.
- **Error / Disabled:** disabled text at Ink Low; no custom error styling yet (blocked forms are prevented pre-submit).

### Navigation (sidebar + bottom tab bar)
- **Style:** icon + label; sidebar nav items pill-shaped on active (accent text), hairline on hover; inactive items Ink Low.
- **Mobile:** fixed bottom bar (same 5 items, icon + 10px label), active item accent.
- **States:** hover 150ms; active never glows — accent text + subtle elevation; the timer bar is a separate global layer, not nav.

### Progress Ring (signature)
- **Structure:** fine-stroked circle; Ring Track stroke underneath; Lime Signal sweep with round line-cap; 5px tick bead at the live value with a 2px Ground stroke ring; center holds the tabular-numeral value (%) + label.
- **Motion:** 600ms cubic ease-out when the value changes; tick bead transitions its position 700ms.
- **Reduced motion:** value snaps instantly, no choreography, no hidden data.

### Global Timer Bar (signature)
- **Behavior:** docked bottom center across every surface while a session is running; shows a breathing pulse dot, task title, elapsed (or countdown to target), Pause/Resume and Finish.
- **Tone:** Surface Elevated with the float shadow; primary actions inside are lime.
- **Motion:** slides up 200ms on session start; presence is global and persistent.

## Do's and Don'ts

### Do:
- **Do** draw the lime accent only where the user acts or progress is earned — keep it under ~10% of the screen.
- **Do** use the progress ring for "how far toward done" and tabular numerals for any live metric.
- **Do** keep cards flat in the page flow; reserve shadows for the floating timer bar and modals.
- **Do** use Hairline (1px) borders and tonal elevation (Surface → Elevated → Soft) to separate layers.
- **Do** keep all UI on Inter; bold only the value or title the eye must land on.
- **Do** collapse every animation under `prefers-reduced-motion` — reveal the same data instantly.

### Don't:
- **Don't** apply gradients, glows, or backdrop blurs to the accent or cards — flat instrument precision only.
- **Don't** use the lime as a wash or background for reading surfaces; it is an action/earned color.
- **Don't** race every second of a timer through a global re-render — only the consuming views tick.
- **Don't** hide a hover-only affordance on touch; reveal it always at small screens.
- **Don't** stack weights — hierarchy comes from size/tracking/color, not bolding everything.