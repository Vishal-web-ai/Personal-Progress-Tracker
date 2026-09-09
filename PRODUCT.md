# PRODUCT.md

## Pulse — Personal Productivity OS

A local-first personal productivity app for one user who balances several life areas at once (cloud engineering, health, personal development, SaaS products, learning). It replaces scattered tool-sprawl with a single calm surface: today's tasks organized by life area, a focus timer that records real work sessions, goals with weekly progress, and analytics that show where time and attention actually went.

## Product truth

- **Single user, local-first.** Everything lives in the browser's localStorage. There is no backend, no account, no sync. Data is private and instant. Starter data is synthetic and labeled so the user knows it is not theirs yet.
- **The day is the unit.** The dashboard presents today's tasks grouped by area, one screen, scannable top-to-bottom. The user should know within a glance what today holds and what the plan is.
- **Time is honest.** The focus timer is timestamp-based: wall-clock start and end, with active vs paused time computed. a pause is tracked separately, never hidden. Sessions are saved with the real numbers and can be rated for how focused they actually were.
- **Completion is earned, per area.** Daily progress is shown per area and in aggregate. A day is "completed" when every planned task in an area reaches done.
- **Goals are weeks, not sprints.** Each goal has a weekly target (e.g., 7h). Progress accumulates from completed sessions and tasks across the current week.
- **Analytics show the truth, not vanity.** Focus hours per day/week, task completion rate, time by area, and a weekly consistency heatmap. Insights are stated plainly.
- **Motion is a language, not decoration.** Transitions are fast (100–300ms) and exponential-eased. `prefers-reduced-motion` collapses everything. The app must stay responsive from 360px phones to large desktops.

## Non-negotiable constraints

- Runs entirely in the browser; no network required after load.
- Dark forest-green premium-minimalist identity (see spec); near-black green ground, white text, soft borders, a single bright lime accent used sparingly.
- Type: Inter.
- Every view usable by keyboard; visible focus; disabled/empty/loading states designed, not incidental.
- The user can reset all data from Settings (with confirmation) and clear the seeded demo data.