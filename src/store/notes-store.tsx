"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Note } from "@/types";

interface NotesContextValue {
  notes: Note[];
  addNote: (title: string, content: string) => Note;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "content" | "pinned">>) => void;
  removeNote: (id: string) => void;
  togglePin: (id: string) => void;
}

const STORAGE_KEY = "pulse-notes-v1";

function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Note[];
  } catch {
    // corrupt data
  }
  return [];
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // storage full
    }
  }, [notes]);

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
