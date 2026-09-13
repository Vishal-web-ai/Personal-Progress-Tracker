"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { Note, Task, WorkSession } from "@/types";

export interface PersistedSnapshot {
  tasks: Task[];
  sessions: WorkSession[];
  settings: { userName: string; avatarUrl?: string };
}

interface KvRecord<T> {
  key: string;
  value: T;
}

const DB_NAME = "pulse";
const DB_VERSION = 1;
const STORE = "kv";
const KEYS = {
  tasks: "tasks",
  sessions: "sessions",
  settings: "settings",
  notes: "notes",
  meta: "meta",
} as const;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function readSnapshot(): Promise<PersistedSnapshot | null> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readonly");
  const [tasks, sessions, settings] = await Promise.all([
    tx.store.get(KEYS.tasks),
    tx.store.get(KEYS.sessions),
    tx.store.get(KEYS.settings),
  ]);
  await tx.done;
  if (!tasks && !sessions && !settings) return null;
  return {
    tasks: (tasks as KvRecord<Task[]> | undefined)?.value ?? [],
    sessions: (sessions as KvRecord<WorkSession[]> | undefined)?.value ?? [],
    settings: (settings as KvRecord<{ userName: string; avatarUrl?: string }> | undefined)?.value ?? {
      userName: "Vishal",
    },
  };
}

export async function writeSnapshot(snapshot: PersistedSnapshot): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.store.put({ key: KEYS.tasks, value: snapshot.tasks });
  tx.store.put({ key: KEYS.sessions, value: snapshot.sessions });
  tx.store.put({ key: KEYS.settings, value: snapshot.settings });
  tx.store.put({ key: KEYS.meta, value: { savedAt: Date.now() } });
  await tx.done;
}

export async function readNotes(): Promise<Note[] | null> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readonly");
  const notes = await tx.store.get(KEYS.notes);
  await tx.done;
  return (notes as KvRecord<Note[]> | undefined)?.value ?? null;
}

export async function writeNotes(notes: Note[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.store.put({ key: KEYS.notes, value: notes });
  await tx.done;
}
