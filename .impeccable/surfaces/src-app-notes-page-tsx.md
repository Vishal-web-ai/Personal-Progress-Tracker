---
version: 1
slug: "src-app-notes-page-tsx"
primary_target: "src/app/notes/page.tsx"
related_targets: ["src/components/notes/NotesRoute.tsx","src/components/notes/NoteEditor.tsx","src/components/notes/NoteView.tsx","src/components/notes/NotesContent.tsx"]
---

# Surface brief — Notes (src/app/notes)

Scope: the Notes surface — list, create, read, edit surfaces. Visitor mode: **Operate** — the user captures and retrieves personal notes quickly.

## Direction contract

- **THESIS:** One note owns the page. `/notes` is a scannable list; **+** and every note card open a dedicated full-page surface (`?new`, `?note=<id>`, `?note=<id>&edit`) instead of an inline swap — the list never hosts an editor. Query params carry the surface because static export (`output: "export"`) forbids dynamic path segments without `generateStaticParams`, and note IDs are local-only.
- **OWN-WORLD:** Pulse's forest-ground instrument world: ground-to-elevated tonal cards, hairline borders, Inter, rationed lime reserved for the primary act (New, Save, Edit). Editors and the read view share the `.tiptap-editor .tiptap` vocabulary so stored rich content (headings, styled lists, tables) renders identically to how it was authored.
- **STORY:** The user scans saved notes, taps **+** or a card, and lands on a calm single-note surface with a back affordance; autosave keeps work safe and a new note's URL quietly becomes its real note URL on first save; the read view presents the note's actual content, not a preview.
- **FIRST VIEWPORT:** List — header + search + lime New + pinned-first cards. Create/edit — back chevron, big title input, toolbar, elevated editor well, footer (char count · saving state · Cancel/Save). Read — back chevron, title, rendered content on surface, meta footer (pinned · updated · chars), lime Edit.
- **FORM:** Existing component language extended; no new visual world, no combinatorial novelty.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
