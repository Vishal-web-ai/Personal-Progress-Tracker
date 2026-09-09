# Pulse — Session Context (Sep 8, 2026)

## What We Built Today

### 1. Smooth Curved Line Chart
- **File:** `src/components/charts/CompletionTrendChart.tsx`
- Replaced sharp `M`/`L` SVG paths with Catmull-Rom → Cubic Bezier smooth curves
- Added `smoothLine()` utility function (~20 lines)
- Line extends to chart edges (prepends/appends edge points)
- Area fill follows the smooth curve

### 2. Data Point Dots
- Always-visible circles at each data point (4px rest, 6px active)
- Active/pinned point grows larger with solid accent fill
- Pure SVG, no glow (per DESIGN.md "No-Glow Rule")

### 3. Chart Animation Fix
- **File:** `src/app/globals.css`
- Replaced `stroke-dash` draw animation with opacity fade-in
- Fixed bug where line didn't reach chart edges due to short `drawLength`

### 4. Productivity Trend — Weekly/Monthly Only
- **File:** `src/components/analytics/AnalyticsContent.tsx`
- Removed Daily period — only Weekly and Monthly
- Removed "Completion rate" metric — only Completed and Focus time
- Default period: weekly, default metric: completed

### 5. Chart Height & Spacing
- Increased default height from 190 → 240
- Bigger padding (top: 24, bottom: 28, left: 36, right: 16)
- Smarter x-axis labels (all 7 for weekly, every 2nd for longer)
- Bigger dots (4px/6px)

### 6. Weekly Day-by-Day View
- **File:** `src/lib/analytics.ts` — new `buildWeekDays()` function
- Shows Mon–Sun data points for a specific week
- Week navigation with offset (0 = this week, -1 = last week, etc.)

### 7. Week Switcher
- **Pill tabs:** "This week" / "Last week" / "2 weeks ago" / "3 weeks ago"
- **Arrow buttons:** left/right chevrons for incremental navigation
- **Swipe gesture:** touch left/right on chart to change weeks
- Week title shows date range (e.g., "1 Jun – 7 Jun")
- Max 11 weeks back

### 8. Notes Feature (replaced Goals)
- **Files created:**
  - `src/types/index.ts` — added `Note` type
  - `src/store/notes-store.tsx` — full CRUD with localStorage
  - `src/app/providers.tsx` — wrapped with `NotesProvider`
  - `src/components/navigation/Navigation.tsx` — Goals → Notes tab
  - `src/app/notes/page.tsx` — Notes page route
  - `src/components/notes/NotesContent.tsx` — full notes app

- **Features:**
  - Create/edit notes with title + rich text content
  - TipTap WYSIWYG editor
  - Search notes by title and content
  - Pin to top / unpin
  - Delete with confirmation modal
  - Character count
  - Timestamps ("Just now", "5m ago", etc.)
  - Keyboard shortcuts (Ctrl+S save, Esc cancel)
  - Empty state
  - Responsive for all mobile sizes
  - localStorage persistence

### 9. TipTap Rich Text Editor
- **Installed:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`
- **File:** `src/app/globals.css` — TipTap styling (headings, lists, spacing)
- Toolbar with active state indicators
- Heading dropdown (H1, H2, H3)
- List dropdown with 5 styles: Bullet, Dash, Arrow, Numbers, Letters
- Bold, Italic, Undo, Redo buttons
- Active states: bold/italic icons glow accent when on, muted when off
- Heading icon shows "H" text instead of lucide icon
- `onTransaction` callback forces re-render for active state detection
- List styles persist via CSS classes + `data-list-style` attribute re-applied on every transaction

---

## TipTap Enhancement Roadmap (Next Session)

### High Priority — Essentials
1. **Underline** — `StarterKit` doesn't include it; add `@tiptap/extension-underline`
2. **Strikethrough** — `StarterKit` doesn't include it; add `@tiptap/extension-strike`
3. **Inline code** — `StarterKit` has `code` but not enabled by default
4. **Code blocks** — `StarterKit` has `codeBlock`
5. **Blockquote** — `StarterKit` has `blockquote`
6. **Task/Checklist** — `@tiptap/extension-task-item` + `@tiptap/extension-task-list`
7. **Horizontal rule** — `StarterKit` has `horizontalRule`

### Medium Priority — Productivity
8. **Markdown shortcuts** — type `# ` for H1, `**` for bold, `- ` for list, etc.
9. **Link** — `@tiptap/extension-link` for clickable URLs
10. **Text alignment** — `@tiptap/extension-text-align` (left, center, right)
11. **Highlight** — `@tiptap/extension-highlight` for colored text background
12. **Placeholder** — `@tiptap/extension-placeholder` for empty editor hint

### Low Priority — Advanced
13. **Tables** — `@tiptap/extension-table` for grid data
14. **Image** — `@tiptap/extension-image` for embeds
15. **Mention** — `@tiptap/extension-mention` for @task or @area links
16. **Slash commands** — type `/` for command menu (Notion-style)
17. **Drag & drop** — reorder blocks
18. **Font size/color** — custom text styling
19. **Multicolumn** — side-by-side layouts
20. **Export** — export note as Markdown or PDF

### Quick Implementation Notes
- All extensions from `@tiptap/extension-*` need to be added to the `extensions` array in `useEditor()`
- Toolbar buttons follow the same pattern: `editor.chain().focus().toggleX().run()` + `editor.isActive("x")` for active state
- CSS for new elements goes in `globals.css` under `.tiptap-editor .tiptap` selector
- The `onTransaction` callback in useEditor forces React re-renders for active state

---

## Design System Reference (Pulse)

- **Colors:** Forest green dark theme, lime accent (#b8ff4a)
- **Font:** Inter, variable weight
- **Cards:** 18px radius, 22px for features
- **Borders:** 1px hairline (#24483c)
- **Motion:** 100–300ms ease-out
- **No glow rule:** Accents never glow/blur/emmit
- **DESIGN.md:** `pulse/DESIGN.md`

## Key Files

```
pulse/
├── src/
│   ├── types/index.ts              # Note type added
│   ├── store/
│   │   ├── app-store.tsx           # Main app state
│   │   └── notes-store.tsx         # NEW: Notes CRUD + localStorage
│   ├── lib/
│   │   ├── analytics.ts            # buildWeekDays() added
│   │   └── time.ts                 # WEEKDAYS_SHORT, MONTHS exports
│   ├── components/
│   │   ├── charts/
│   │   │   ├── CompletionTrendChart.tsx  # Smooth curves, dots, edge extension
│   │   │   └── TrendChart.tsx            # Edge extension fix
│   │   ├── notes/
│   │   │   └── NotesContent.tsx    # NEW: Full notes app with TipTap
│   │   ├── navigation/
│   │   │   └── Navigation.tsx      # Notes tab (was Goals)
│   │   └── analytics/
│   │       └── AnalyticsContent.tsx # Weekly/monthly only, week nav
│   ├── app/
│   │   ├── providers.tsx           # NotesProvider added
│   │   ├── globals.css             # TipTap styles, chart-draw fix
│   │   └── notes/
│   │       └── page.tsx            # NEW: Notes page
│   └── ...
```
