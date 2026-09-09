---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Surface brief — Dashboard (src/app/page.tsx)

Scope: the whole personal OS, first surface is the dashboard. Visitor mode: **Operate** — the user completes a task (plan today, run a focus session, review progress).

## Direction contract

- **THESIS:** The dashboard is a live daily cockpit, not an analytics gallery. It refuses the hero-metric card-wall: the day's tasks grouped by area, with a single aggregate progress ring that fills as the day is actually completed, and a start-focus action tied to the first unfinished task.
- **OWN-WORLD:** Dark forest-green premium-minimalist web app. Near-black green ground (see spec), hairline sub-tone borders, Inter throughout, one bright lime accent drawn only where the user acts or progress is earned. Progress rings are the signature: fine stroke, track in muted green, accent sweep, tick at the current value.
- **STORY:** The visitor sees today at a glance — what area deserves attention, what is done, what is left — and can start a focused session on the next task in two clicks.
- **FIRST VIEWPORT:** Left sidebar with app nav; main column: greeting line, aggregate progress ring (with completion count) as the leading element, metric row (time-focused today, tasks done, streak), then today's tasks grouped by area with per-area ringlets, hover states and per-task checkbox actions. Primary action: "Start focus" beside each unfinished task.
- **FORM:** Spec-pinned component language: soft cards, hairline borders, Inter, lime accent, 100–300ms eased motion, reduced-motion collapses.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
