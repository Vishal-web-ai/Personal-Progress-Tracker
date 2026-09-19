"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pin, Pencil } from "lucide-react";
import { formatTime, noteColor, NOTE_TINT, plainText } from "@/lib/notes";
import { useNotes } from "@/store/notes-store";
import { cn } from "@/lib/utils";
import type { Note } from "@/types";

export function NoteView({ note }: { note: Note }) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  useNotes();
  const tint = NOTE_TINT[noteColor(note)];
  const [isTouch] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  );
  const plain = plainText(note.content);
  const hasContent = plain.length > 0;
  const charCount = plain.replace(/\n/g, " ").length;

  const handleToggleStrike = (e: React.MouseEvent) => {
    if (!isTouch || !contentRef.current) return;
    const target = e.target as HTMLElement;
    if (!contentRef.current.contains(target)) return;
    const li = target.closest("li");
    if (!li || !contentRef.current.contains(li)) return;
    if (li.hasAttribute("data-struck")) {
      li.removeAttribute("data-struck");
    } else {
      li.setAttribute("data-struck", "");
    }

  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[640px] flex-col rounded-[22px] border p-4 sm:p-5",
        tint.card,
        tint.border
      )}
    >
      {/* Header: back + title + edit */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <button
          onClick={() => router.back()}
          aria-label="Back to notes"
          className="pressable -ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-elevated hover:text-primary"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-tight text-primary">
          {note.title || "Untitled"}
        </h1>
        <Link
          href={`/notes?note=${note.id}&edit`}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-[#061B14] transition-colors hover:bg-accent-soft"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      {/* Rendered content */}
      <div className="tiptap-editor mt-4">
        {hasContent ? (
          <div
            ref={contentRef}
            className="tiptap notes-strike"
            dangerouslySetInnerHTML={{ __html: note.content }}
            onClick={handleToggleStrike}
          />
        ) : (
          <p className="text-[14px] text-muted">No content yet.</p>
        )}
      </div>

      {/* Footer meta */}
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-3.5 text-[12px] text-muted">
        <span>
          Updated{" "}
          <time dateTime={new Date(note.updatedAt).toISOString()}>{formatTime(note.updatedAt)}</time>
        </span>
        {note.pinned && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2.5 py-1 text-[11px] font-semibold text-accent">
            <Pin size={10} />
            Pinned
          </span>
        )}
        <span className="tabular-nums">
          {charCount} char{charCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}