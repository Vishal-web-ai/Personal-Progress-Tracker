# TODO (deferred by user): Agentation toolbar for Pulse app

**Goal:** Get the Agentation UI-annotation toolbar (bottom-right of page) to appear on the Pulse web app so feedback can be collected via MCP.

**Status:** Deferred — user said they'll do this later. Pick up here.

## What's already done / known

- Agentation MCP server IS running and healthy: node process on port `4747`
  (Pulse check command: `agentation-mcp doctor` → "All checks passed!").
  MCP tools `agentation_list_sessions` / `agentation_get_pending` / `agentation_watch_annotations` etc. are wired up.
- Root cause of "no toolbar": **`agentation-mcp` server never injects/renders any UI.**
  - Confirmed from its source (`%LocalAppData%\npm-cache\_npx\ae53a81abe7ed486\node_modules\agentation-mcp\dist\cli.js`):
    only Content-Types served are `application/json` and `text/event-stream`; zero matches for `spinner`, `toolbar`, `inject`, `text/javascript`.
    README: HTTP server "receives annotations from the React component." Client ships OUTSIDE the package.
  - The old sessions in the MCP store (e.g. `http://localhost:3000/products/...`, `localhost:5173`) all belong to a previous e-commerce project; **none** for the current Pulse app → Pulse pages never connected to 4747.

## Next step (the user's chosen path B)

Find the OLD e-commerce project and see how its pages loaded the Agentation client, then do the same for Pulse.

- Initial search of `D:\BackUP`, Documents, Desktop, dev/projects/source/code for `agentation` files finished with no hits (nothing under `D:\BackUP`; other roots listed none matched). So the old project may live somewhere else on disk (search more broadly, e.g. `C:\Users\Vishal`, other drives, `D:\` root-level projects, or check `wwwspy`/`npm-cache` installs of `agentation`, `agentation-mcp`, `@alexgorbatchev/agentation`, `@opencode-annotate/client`, `opencode-chrome-annotation`).
- Expected: old app's HTML included a script tag / client bundle, or a Chrome extension was used, or opencode's web/TUI injected it.
- Then reproduce for Pulse: either add the same client script to `D:\BackUP\Personal Progress\pulse` (e.g. in `src/app/layout.tsx` or via plugin) or install the matching browser extension.

## Also recorded (context)

- Recent Pulse changes all done & verified (build+lint clean):
  - Mobile collapsible "Today's Progress" (MobileProgress + flash fix)
  - Removed search button/modal; moved add-task "+" into Task List header (replacing "See all"); avatar moved to right side of greeting header
- Pulse dev server: `npm run dev`, or `npm run build && npm run start` → http://localhost:3000