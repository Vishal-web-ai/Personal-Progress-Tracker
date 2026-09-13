"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Note } from "@/types";
import { readNotes, writeNotes } from "@/lib/db";

interface NotesContextValue {
  notes: Note[];
  addNote: (title: string, content: string) => Note;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "content" | "pinned">>) => void;
  removeNote: (id: string) => void;
  togglePin: (id: string) => void;
}

const LEGACY_STORAGE_KEY = "pulse-notes-v1";

function loadLegacyNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Note[];
  } catch {
    // corrupt data
  }
  return [];
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored = await readNotes();
      if (stored === null) {
        const legacy = loadLegacyNotes();
        if (legacy.length > 0) {
          stored = legacy;
          void writeNotes(legacy);
          try {
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch {
            // ignore
          }
        }
      }
      if (cancelled) return;
      setNotes(stored ?? []);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void writeNotes(notes);
  }, [notes, ready]);

  const addNote = useCallback((title: string, content: string): Note => {
    const now = Date.now();
    const note: Note = {
      id: `n-${now}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      content,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [note, ...prev]);
    return note;
  }, []);

  const updateNote = useCallback(
    (id: string, patch: Partial<Pick<Note, "title" | "content" | "pinned">>) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
        )
      );
    },
    []
  );

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n))
    );
  }, []);

  const value = useMemo(
    () => ({ notes, addNote, updateNote, removeNote, togglePin }),
    [notes, addNote, updateNote, removeNote, togglePin]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
