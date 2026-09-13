"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { useNotes } from "@/store/notes-store";
import { NotesContent } from "@/components/notes/NotesContent";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteView } from "@/components/notes/NoteView";
import { EmptyState } from "@/components/ui/EmptyState";

function flag(value: string | null): boolean {
  return value === "" || value === "1";
}

export function NotesRoute() {
  const search = useSearchParams();
  const { notes } = useNotes();
  const id = search.get("note");
  const isNew = flag(search.get("new"));
  const isEdit = flag(search.get("edit"));

  let content: React.ReactNode;
  let surfaceKey: string;

  if (isNew) {
    content = <NoteEditor note={null} />;
    surfaceKey = "new";
  } else if (id) {
    const note = notes.find((n) => n.id === id) ?? null;
    if (!note) {
      content = (
        <EmptyState
          icon={<FileText size={24} />}
          title="Note not found"
          message="It may have been deleted."
          action={
            <Link
              href="/notes"
              className="rounded-xl border border-border bg-surface-elevated px-4 py-2 text-[13px] font-medium text-secondary transition-colors hover:text-primary"
            >
              Back to notes
            </Link>
          }
        />
      );
      surfaceKey = `missing:${id}`;
    } else {
      content = isEdit ? <NoteEditor note={note} /> : <NoteView note={note} />;
      surfaceKey = `${isEdit ? "edit" : "read"}:${note.id}`;
    }
  } else {
    content = <NotesContent />;
    surfaceKey = "list";
  }

  return (
    <div key={surfaceKey} className="surface-in">
      {content}
    </div>
  );
}