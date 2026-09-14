"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import {
  Check,
  Trash2,
  ChevronLeft,
  Bold,
  Italic,
  List,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
} from "lucide-react";
import { useNotes } from "@/store/notes-store";
import { cn } from "@/lib/utils";
import { NOTE_COLORS, NOTE_TINT } from "@/lib/notes";
import type { Note } from "@/types";

export function NoteEditor({ note }: { note: Note | null }) {
  const { addNote, updateNote } = useNotes();
  const router = useRouter();
  const [title, setTitle] = useState(note?.title ?? "");
  const [color, setColor] = useState<string | undefined>(note?.color);
  const [listStyle, setListStyle] = useState("bullet");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [, setTick] = useState(0);

  const titleRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef({ title: note?.title ?? "", content: note?.content ?? "", color: note?.color });
  const savedIdRef = useRef<string | null>(note?.id ?? null);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TableKit.configure({ table: { resizable: true } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: note?.content ?? "",
    editorProps: {
      attributes: {
        class: "focus:outline-none h-full min-h-[200px] text-[14px] leading-relaxed text-primary",
      },
    },
    onTransaction: ({ editor }) => {
      draftRef.current.content = editor.getHTML();
      setTick((t) => t + 1);
    },
    onUpdate: () => scheduleSave(),
  });

  const close = useCallback(() => router.back(), [router]);

  const persist = useCallback(() => {
    const { title: t, content, color: c } = draftRef.current;
    if (!t.trim() && !content.replace(/<[^>]+>/g, "").trim()) return;
    const finalTitle = t.trim() || "Untitled";
    if (savedIdRef.current) {
      updateNote(savedIdRef.current, { title: finalTitle, content, color: c });
    } else {
      const created = addNote(finalTitle, content, c);
      savedIdRef.current = created.id;
      if (mountedRef.current) {
        router.replace(`/notes?note=${created.id}&edit`);
      }
    }
    setSaveState("saved");
  }, [addNote, updateNote, router]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setSaveState("saving");
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      persist();
    }, 900);
  }, [persist]);

  const flushSave = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    persist();
  }, [persist]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      persist();
    },
    [persist]
  );

  const handleSave = useCallback(() => {
    flushSave();
    close();
  }, [flushSave, close]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        close();
      }
    },
    [handleSave, close]
  );

  const charCount = editor ? editor.getText().length : 0;

  const handleColorSelect = useCallback(
    (key: string | undefined) => {
      const next = key === undefined ? undefined : color === key ? undefined : key;
      setColor(next);
      draftRef.current.color = next;
      scheduleSave();
    },
    [color, scheduleSave]
  );

  return (
    <div
      className="mx-auto flex w-full max-w-[640px] flex-col rounded-[22px] border border-border bg-surface p-4 sm:p-5"
      onKeyDown={handleKeyDown}
    >
      {/* Title + back */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={close}
          aria-label="Back to notes"
          className="pressable -ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-elevated hover:text-primary"
        >
          <ChevronLeft size={20} />
        </button>
        <input
          ref={titleRef}
          type="text"
          placeholder="Note title"
          value={title}
          onChange={(e) => {
            draftRef.current.title = e.target.value;
            setTitle(e.target.value);
            scheduleSave();
          }}
          className="w-full bg-transparent text-[20px] font-bold text-primary placeholder:text-muted focus:outline-none"
        />
      </div>

      {/* Color picker */}
      <div
        className="mt-2 flex items-center gap-1.5"
        role="radiogroup"
        aria-label="Note color"
      >
        <button
          onClick={() => handleColorSelect(undefined)}
          aria-label="Auto color"
          aria-pressed={color === undefined}
          title="Auto color"
          className={cn(
            "relative h-5 w-5 rounded-full transition-transform hover:scale-110",
            color === undefined && "ring-2 ring-white/50 ring-offset-2 ring-offset-surface"
          )}
        >
          <span
            className="block h-full w-full rounded-full"
            style={{
              backgroundImage:
                "conic-gradient(#b8ff4a, #4cc9ff, #e8c85a, #e8b25a, #a78bfa, #b8ff4a)",
            }}
          />
        </button>
        <span className="mx-0.5 h-4 w-px bg-border-soft" aria-hidden="true" />
        {NOTE_COLORS.map((key) => (
          <button
            key={key}
            onClick={() => handleColorSelect(key)}
            aria-label={`${key} color`}
            aria-pressed={color === key}
            title={`${key} color`}
            className={cn(
              "h-5 w-5 rounded-full transition-transform hover:scale-110",
              NOTE_TINT[key].swatch,
              color === key && "ring-2 ring-white/50 ring-offset-2 ring-offset-surface"
            )}
          />
        ))}
        <span className="ml-auto text-[11px] text-muted">{color ?? "auto"}</span>
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="mt-3 flex flex-wrap items-center gap-1 border-b border-border-soft pb-3">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "rounded-lg p-2 transition-colors hover:bg-surface-elevated hover:text-primary",
              editor.isActive("bold") ? "bg-surface-elevated text-accent" : "text-muted"
            )}
            aria-label="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "rounded-lg p-2 transition-colors hover:bg-surface-elevated hover:text-primary",
              editor.isActive("italic") ? "bg-surface-elevated text-accent" : "text-muted"
            )}
            aria-label="Italic"
          >
            <Italic size={16} />
          </button>
          <HeadingDropdown editor={editor} />
          <ListDropdown editor={editor} listStyle={listStyle} onStyleChange={setListStyle} />
          <div className="mx-1 h-4 w-px bg-border-soft" />
          <TableDropdown editor={editor} />
          <AlignButtons editor={editor} />
          <div className="mx-1 h-4 w-px bg-border-soft" />
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-elevated hover:text-primary disabled:opacity-30"
            aria-label="Undo"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-elevated hover:text-primary disabled:opacity-30"
            aria-label="Redo"
          >
            <Redo size={16} />
          </button>
        </div>
      )}

      {/* TipTap Editor */}
      <div className="tiptap-editor mt-3 flex min-h-[200px] flex-col rounded-xl bg-surface-elevated p-3">
        <EditorContent editor={editor} />
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
        <span className="flex items-center gap-1.5 text-[11px] text-muted tabular-nums">
          {charCount} character{charCount !== 1 ? "s" : ""}
          {saveState !== "idle" && (
            <>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span key={saveState} className={saveState === "saving" ? "" : "pop-in text-primary"}>
                {saveState === "saving" ? "Saving…" : "Saved"}
              </span>
            </>
          )}
        </span>
        <div className="flex gap-2">
          <button
            onClick={close}
            className="rounded-xl border border-border bg-surface-elevated px-4 py-2 text-[13px] font-medium text-secondary transition-colors hover:text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-[#061B14] transition-colors hover:bg-accent-soft"
          >
            <Check size={14} />
            Save
          </button>
        </div>
      </div>

      {/* Long-press / right-click on a table */}
      <TableContextMenu editor={editor} />
    </div>
  );
}

function HeadingDropdown({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!editor) return null;

  const options = [
    { label: "Heading 1", className: "text-[20px] font-bold", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", className: "text-[17px] font-bold", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", className: "text-[14px] font-semibold", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 rounded-lg px-2 py-2 text-muted transition-colors hover:bg-surface-elevated hover:text-primary",
          open && "bg-surface-elevated text-primary"
        )}
        aria-label="Heading"
      >
        <span className="text-[15px] font-bold leading-none">H</span>
        <svg width={10} height={10} viewBox="0 0 10 10" fill="none" className="mt-px">
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-surface-elevated py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                opt.action();
                setOpen(false);
              }}
              className="flex w-full items-center px-3 py-2.5 text-left text-primary transition-colors hover:bg-surface-soft"
            >
              <span className={opt.className}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ListDropdown({ editor, listStyle, onStyleChange }: { editor: ReturnType<typeof useEditor>; listStyle: string; onStyleChange: (style: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Re-apply list classes after every TipTap transaction
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      requestAnimationFrame(() => {
        const lists = editor.view.dom.querySelectorAll("ul, ol");
        lists.forEach((el) => {
          const style = el.getAttribute("data-list-style");
          if (style) {
            el.classList.remove("list-bullet", "list-dash", "list-arrow", "list-numbers", "list-letters");
            el.classList.add(`list-${style}`);
          }
        });
      });
    };
    editor.on("transaction", handler);
    return () => { editor.off("transaction", handler); };
  }, [editor]);

  if (!editor) return null;

  const applyListStyle = (style: string) => {
    requestAnimationFrame(() => {
      const { from } = editor.state.selection;
      const node = editor.view.domAtPos(from).node;
      const el = node instanceof HTMLElement ? node : node.parentElement;
      const listEl = el?.closest("ul, ol");
      if (listEl) {
        listEl.classList.remove("list-bullet", "list-dash", "list-arrow", "list-numbers", "list-letters");
        listEl.classList.add(`list-${style}`);
        listEl.setAttribute("data-list-style", style);
      }
    });
  };

  const options = [
    { label: "• Bullet", style: "bullet", action: () => { editor.chain().focus().toggleBulletList().run(); applyListStyle("bullet"); } },
    { label: "- Dash", style: "dash", action: () => { editor.chain().focus().toggleBulletList().run(); applyListStyle("dash"); } },
    { label: "→ Arrow", style: "arrow", action: () => { editor.chain().focus().toggleBulletList().run(); applyListStyle("arrow"); } },
    { label: "1. Numbers", style: "numbers", action: () => { editor.chain().focus().toggleOrderedList().run(); applyListStyle("numbers"); } },
    { label: "A. Letters", style: "letters", action: () => { editor.chain().focus().toggleOrderedList().run(); applyListStyle("letters"); } },
  ];

  const activeLabel = options.find((o) => o.style === listStyle)?.label ?? "List";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 rounded-lg px-2 py-2 text-muted transition-colors hover:bg-surface-elevated hover:text-primary",
          (open || editor.isActive("bulletList") || editor.isActive("orderedList")) && "bg-surface-elevated text-primary"
        )}
        aria-label="List"
      >
        <List size={16} />
        <span className="max-w-[60px] truncate text-[11px]">{activeLabel.split(" ").slice(1).join(" ")}</span>
        <svg width={10} height={10} viewBox="0 0 10 10" fill="none" className="mt-px">
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-surface-elevated py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                opt.action();
                onStyleChange(opt.style);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-soft",
                listStyle === opt.style ? "text-accent" : "text-primary"
              )}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TableDropdown({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    const scrollHandler = () => setOpen(false);
    document.addEventListener("scroll", scrollHandler, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("scroll", scrollHandler, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const menu = menuRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const width = menu?.width ?? 208;
      const height = menu?.height ?? 0;
      const margin = 8;
      let top = trigger.bottom + 6;
      if (top + height > window.innerHeight - margin) {
        top = Math.max(margin, trigger.top - height - 6);
      }
      let left = trigger.left;
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - margin - width);
      }
      setMenuPos({ top, left });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!editor) return null;

  const inTable = editor.isActive("table");
  const tablePositions = editor.$nodes("table") ?? [];
  const singleTablePos = tablePositions.length === 1 ? tablePositions[0].pos : null;
  const run = (fn: () => void) => {
    fn();
    setOpen(false);
    setHover(null);
  };
  const itemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-primary transition-colors hover:bg-surface-soft";
  const divider = <div className="my-1 h-px bg-border-soft" />;

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={() => {
          setHover(null);
          setMenuPos(null);
          setOpen(!open);
        }}
        className={cn(
          "rounded-lg p-2 transition-colors hover:bg-surface-elevated hover:text-primary",
          (open || inTable) && "bg-surface-elevated text-primary"
        )}
        aria-label="Table"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <TableIcon size={16} />
      </button>
      {open && (
        <div
          ref={menuRef}
          className={cn(
            "fixed z-50 w-52 max-w-[calc(100vw-16px)] overflow-hidden rounded-xl border border-border bg-surface-elevated py-1 shadow-lg",
            !menuPos && "invisible top-0 left-0"
          )}
          style={menuPos ? { top: menuPos.top, left: menuPos.left } : undefined}
          onPointerDown={(e) => {
            if (e.pointerType === "touch" || e.pointerType === "pen") {
              setIsTouch(true);
            }
          }}
        >
          {!inTable ? (
            <>
              <div className="px-3 pb-1.5 pt-2">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Insert {hover?.[0] ?? 3} × {hover?.[1] ?? 3}
                </div>
                <div className="grid grid-cols-4 gap-1" role="group" aria-label="Table size">
                  {Array.from({ length: 16 }, (_, i) => {
                    const rows = Math.floor(i / 4) + 1;
                    const cols = (i % 4) + 1;
                    const active = hover !== null && rows <= hover[0] && cols <= hover[1];
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (isTouch) {
                            setHover([rows, cols]);
                            return;
                          }
                          run(() =>
                            editor
                              .chain()
                              .focus()
                              .insertTable({ rows, cols, withHeaderRow: true })
                              .run()
                          );
                        }}
                        onPointerEnter={() => setHover([rows, cols])}
                        onFocus={() => setHover([rows, cols])}
                        aria-label={`Insert ${rows} by ${cols} table`}
                        className={cn(
                          "h-4 w-4 rounded-[3px] border border-border transition-colors",
                          active ? "border-accent bg-accent" : "hover:bg-surface-soft"
                        )}
                      />
                    );
                  })}
                </div>
                {isTouch && hover !== null && (
                  <button
                    type="button"
                    onClick={() =>
                      run(() =>
                        editor
                          .chain()
                          .focus()
                          .insertTable({
                            rows: hover[0],
                            cols: hover[1],
                            withHeaderRow: true,
                          })
                          .run()
                      )
                    }
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-[#061B14] transition-colors hover:bg-accent-soft"
                  >
                    <Check size={13} />
                    Insert {hover[0]} × {hover[1]}
                  </button>
                )}
                {tablePositions.length > 1 && (
                  <p className="mt-1.5 text-[11px] text-muted">
                    Tip: click inside a table to edit or delete it.
                  </p>
                )}
              </div>
              {singleTablePos !== null && (
                <>
                  {divider}
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
                    onClick={() =>
                      run(() => {
                        editor
                          .chain()
                          .focus()
                          .setTextSelection(singleTablePos + 1)
                          .deleteTable()
                          .run();
                      })
                    }
                  >
                    <Trash2 size={14} />
                    Delete table
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {divider}
              <button
                className={itemClass}
                onClick={() => run(() => editor.chain().focus().addRowBefore().run())}
              >
                Add row above
              </button>
              <button
                className={itemClass}
                onClick={() => run(() => editor.chain().focus().addRowAfter().run())}
              >
                Add row below
              </button>
              <button
                className={itemClass}
                onClick={() => run(() => editor.chain().focus().deleteRow().run())}
              >
                Delete row
              </button>
              {divider}
              <button
                className={itemClass}
                onClick={() => run(() => editor.chain().focus().addColumnBefore().run())}
              >
                Add column left
              </button>
              <button
                className={itemClass}
                onClick={() => run(() => editor.chain().focus().addColumnAfter().run())}
              >
                Add column right
              </button>
              <button
                className={itemClass}
                onClick={() => run(() => editor.chain().focus().deleteColumn().run())}
              >
                Delete column
              </button>
              {divider}
              <button
                className={itemClass}
                onClick={() => run(() => editor.chain().focus().toggleHeaderRow().run())}
              >
                Toggle header row
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
                onClick={() => run(() => editor.chain().focus().deleteTable().run())}
              >
                Delete table
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AlignButtons({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const items = [
    { icon: AlignLeft, align: "left", label: "Align left" },
    { icon: AlignCenter, align: "center", label: "Align center" },
    { icon: AlignRight, align: "right", label: "Align right" },
  ];

  const isActive = (align: string) =>
    align === "left"
      ? !editor.isActive({ textAlign: "center" }) && !editor.isActive({ textAlign: "right" })
      : editor.isActive({ textAlign: align });

  return (
    <div className="flex items-center gap-1">
      {items.map(({ icon: Icon, align, label }) => (
        <button
          key={align}
          onClick={() => editor.chain().focus().toggleTextAlign(align).run()}
          className={cn(
            "rounded-lg p-2 transition-colors hover:bg-surface-elevated hover:text-primary",
            isActive(align) ? "bg-surface-elevated text-accent" : "text-muted"
          )}
          aria-label={label}
          aria-pressed={isActive(align)}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

function TableContextMenu({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const timerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    const clearTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(".column-resize-handle")) return;
      if (!target?.closest("table")) return;
      pressRef.current = { x: e.clientX, y: e.clientY };
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setMenu({ x: e.clientX, y: e.clientY });
        setPos(null);
      }, 600);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pressRef.current) return;
      const dx = e.clientX - pressRef.current.x;
      const dy = e.clientY - pressRef.current.y;
      if (dx * dx + dy * dy > 100) clearTimer();
    };
    const onPointerEnd = () => {
      pressRef.current = null;
      clearTimer();
    };
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(".column-resize-handle")) return;
      if (!target?.closest("table")) return;
      e.preventDefault();
      clearTimer();
      setMenu({ x: e.clientX, y: e.clientY });
      setPos(null);
    };
    const onScroll = () => setMenu(null);

    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointermove", onPointerMove);
    dom.addEventListener("pointerup", onPointerEnd);
    dom.addEventListener("pointercancel", onPointerEnd);
    dom.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      clearTimer();
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerup", onPointerEnd);
      dom.removeEventListener("pointercancel", onPointerEnd);
      dom.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [editor]);

  useEffect(() => {
    if (!menu) return;
    const frame = requestAnimationFrame(() => {
      const el = menuRef.current?.getBoundingClientRect();
      const width = el?.width ?? 170;
      const height = el?.height ?? 44;
      const margin = 8;
      const left = Math.min(Math.max(menu.x + 4, margin), window.innerWidth - margin - width);
      const top = Math.min(Math.max(menu.y + 4, margin), window.innerHeight - margin - height);
      setPos({ top, left });
    });
    return () => cancelAnimationFrame(frame);
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [menu]);

  if (!editor || !menu) return null;

  const handleDelete = () => {
    const tables = editor.$nodes("table");
    const tablePos = tables?.[0]?.pos;
    if (tablePos !== undefined) {
      editor
        .chain()
        .focus()
        .setTextSelection(tablePos + 1)
        .deleteTable()
        .run();
    }
    setMenu(null);
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-50 rounded-xl border border-border bg-surface-elevated p-1 shadow-lg",
        !pos && "invisible top-0 left-0"
      )}
      style={pos ? { top: pos.top, left: pos.left } : undefined}
      role="menu"
    >
      <button
        onClick={handleDelete}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] text-red-400 transition-colors hover:bg-red-500/10"
        role="menuitem"
      >
        <Trash2 size={15} />
        Delete table
      </button>
    </div>
  );
}