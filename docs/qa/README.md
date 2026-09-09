# Pulse — QA Rasters

Captured from the production build (`npm run start`) at `http://localhost:3000`
with headless Chrome (new headless, `--hide-scrollbars`) on **2026-09-07**.

## Rasters

| File | Route | Viewport |
|---|---|---|
| `dash-d.png` | `/` | 1440×1000 |
| `dash-m.png` | `/` | 390×844 |
| `goals-d.png` | `/goals` | 1440×1000 |
| `tasks-d.png` | `/tasks` | 1440×1000 |
| `analytics-d.png` | `/analytics` | 1440×1000 |
| `analytics-m.png` | `/analytics` | 390×844 |
| `settings-d.png` | `/settings` | 1440×1000 |

Suffix `-d` = desktop, `-m` = mobile.

## Verdict

- `impeccable detect --json` over all five built surfaces and their content
  components: **0 findings**.
- `npm run lint`: **0 errors, 0 warnings**.
- `npm run build`: **success**, all routes prerendered static.
- DOM content assertions per page (greeting, nav, ring, metric rows, charts,
  heatmap, filter chips, settings fields, docked timer bar): **all pass**.
- Demo seed sessions confirmed flowing through analytics/goals metrics (no
  empty states).