"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  X,
  FileText,
  Clock,
} from "lucide-react";
import { useNotes } from "@/store/notes-store";
import { cn } from "@/lib/utils";
import { formatTime, noteColor, plainText } from "@/lib/notes";
import type { Note } from "@/types";
import { NOTE_TINT } from "@/lib/notes";

export function NotesContent() {
  const { notes, removeNote, togglePin } = useNotes();
  const [search, setSearch] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const filtered = search
      ? notes.filter(
          (n) =>
            n.title.toLowerCase().includes(search.toLowerCase()) ||
            n.content.toLowerCase().includes(search.toLowerCase())
        )
      : notes;
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, search]);

  const pinnedCount = useMemo(() => notes.filter((n) => n.pinned).length, [notes]);

  return (
    <div className="space-y-5">
      <header className="motion-stagger">
        <h1 className="text-[24px] font-bold tracking-tight text-primary">Notes</h1>
        <p className="mt-1 text-[14px] text-secondary">
          {notes.length} note{notes.length !== 1 ? "s" : ""}
          {pinnedCount > 0 && ` · ${pinnedCount} pinned`}
        </p>
      </header>

      {/* Search + New */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-elevated py-2.5 pl-9 pr-3 text-[14px] text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Link
          href="/notes?new"
          aria-label="Create new note"
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[14px] font-semibold text-[#061B14] transition-colors hover:bg-accent-soft"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">New</span>
        </Link>
      </div>

      {/* Note list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[22px] border border-border bg-surface py-16 text-center">
          <FileText size={32} className="mb-3 text-muted" />
          <p className="text-[15px] font-semibold text-primary">
            {search ? "No notes match your search" : "No notes yet"}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            {search ? "Try a different search term" : "Create your first note to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onTogglePin={() => togglePin(note.id)}
              onDelete={() => setDeleteConfirmId(note.id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-[18px] border border-border bg-surface p-5">
            <h3 className="text-[17px] font-bold text-primary">Delete note?</h3>
            <p className="mt-2 text-[14px] text-secondary">
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-border bg-surface-elevated px-4 py-2 text-[13px] font-medium text-secondary transition-colors hover:text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmId) {
                    removeNote(deleteConfirmId);
                  }
                  setDeleteConfirmId(null);
                }}
                className="rounded-xl bg-red-500/10 px-4 py-2 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  onTogglePin,
  onDelete,
}: {
  note: Note;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const plain = plainText(note.content);
  const tint = NOTE_TINT[noteColor(note)];

  return (
    <div
      className={cn(
        "group rounded-[18px] border p-4 transition-colors",
        tint.card,
        note.pinned ? tint.borderActive : tint.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Link href={`/notes?note=${note.id}`} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            {note.pinned && <Pin size={12} className={cn("shrink-0", tint.accent)} />}
            <h3 className={cn("truncate text-[15px] font-semibold", tint.accent)}>
              {note.title || "Untitled"}
            </h3>
          </div>
          {plain && (
            <p className={cn("mt-1 whitespace-pre-line line-clamp-2 text-[13px]", tint.accent, "opacity-60")}>
              {plain.slice(0, 120)}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatTime(note.updatedAt)}
            </span>
            <span className="tabular-nums">{plain.replace(/\n/g, " ").length} chars</span>
          </div>
        </Link>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-sm:opacity-100">
          <button
            onClick={onTogglePin}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-primary"
            aria-label={note.pinned ? "Unpin" : "Pin"}
          >
            {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}