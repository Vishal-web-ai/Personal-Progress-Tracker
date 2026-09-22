"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { Goal, Note, PhaseRetrospective, Task, WorkSession } from "@/types";

export interface PersistedSnapshot {
  tasks: Task[];
  sessions: WorkSession[];
  goals: Goal[];
  phaseRetrospectives: PhaseRetrospective[];
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
  goals: "goals",
  phaseRetrospectives: "phaseRetrospectives",
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
  const [tasks, sessions, goals, phaseRetrospectives, settings] = await Promise.all([
    tx.store.get(KEYS.tasks),
    tx.store.get(KEYS.sessions),
    tx.store.get(KEYS.goals),
    tx.store.get(KEYS.phaseRetrospectives),
    tx.store.get(KEYS.settings),
  ]);
  await tx.done;
  if (!tasks && !sessions && !goals && !phaseRetrospectives && !settings) return null;
  return {
    tasks: (tasks as KvRecord<Task[]> | undefined)?.value ?? [],
    sessions: (sessions as KvRecord<WorkSession[]> | undefined)?.value ?? [],
    goals: (goals as KvRecord<Goal[]> | undefined)?.value ?? [],
    phaseRetrospectives: (phaseRetrospectives as KvRecord<PhaseRetrospective[]> | undefined)?.value ?? [],
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
  tx.store.put({ key: KEYS.goals, value: snapshot.goals });
  tx.store.put({ key: KEYS.phaseRetrospectives, value: snapshot.phaseRetrospectives });
  tx.store.put({ key: KEYS.settings, value: snapshot.settings });
  tx.store.put({ key: KEYS.meta, value: { savedAt: Date.now() } });
  await tx.done;
}

/** When the stored snapshot was last written (0 if it has never been persisted). */
export async function readSavedAt(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readonly");
  const meta = await tx.store.get(KEYS.meta);
  await tx.done;
  return (meta as KvRecord<{ savedAt?: number }> | undefined)?.value?.savedAt ?? 0;
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
