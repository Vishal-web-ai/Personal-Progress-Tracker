import type { Note } from "@/types";

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:h[1-6]|p|div|ul|ol|li|blockquote|tr|th|td)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const NOTE_COLORS = ["mint", "teal", "tan", "sand", "violet"] as const;
export type NoteColorKey = (typeof NOTE_COLORS)[number];

export const NOTE_TINT: Record<
  NoteColorKey,
  { card: string; border: string; borderActive: string; accent: string; swatch: string }
> = {
  mint: {
    card: "bg-[var(--note-mint)]",
    border: "border-[var(--note-mint-border)]",
    borderActive: "border-[var(--note-mint-swatch)]/40",
    accent: "text-[var(--note-mint-swatch)]",
    swatch: "bg-[var(--note-mint-swatch)]",
  },
  teal: {
    card: "bg-[var(--note-teal)]",
    border: "border-[var(--note-teal-border)]",
    borderActive: "border-[var(--note-teal-swatch)]/40",
    accent: "text-[var(--note-teal-swatch)]",
    swatch: "bg-[var(--note-teal-swatch)]",
  },
  tan: {
    card: "bg-[var(--note-tan)]",
    border: "border-[var(--note-tan-border)]",
    borderActive: "border-[var(--note-tan-swatch)]/40",
    accent: "text-[var(--note-tan-swatch)]",
    swatch: "bg-[var(--note-tan-swatch)]",
  },
  sand: {
    card: "bg-[var(--note-sand)]",
    border: "border-[var(--note-sand-border)]",
    borderActive: "border-[var(--note-sand-swatch)]/40",
    accent: "text-[var(--note-sand-swatch)]",
    swatch: "bg-[var(--note-sand-swatch)]",
  },
  violet: {
    card: "bg-[var(--note-violet)]",
    border: "border-[var(--note-violet-border)]",
    borderActive: "border-[var(--note-violet-swatch)]/40",
    accent: "text-[var(--note-violet-swatch)]",
    swatch: "bg-[var(--note-violet-swatch)]",
  },
};

function hashString(s: string): number {
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function noteColor(note: Pick<Note, "id" | "color">): NoteColorKey {
  const { color, id } = note;
  if (color && NOTE_COLORS.includes(color as NoteColorKey)) return color as NoteColorKey;
  return NOTE_COLORS[hashString(id) % NOTE_COLORS.length];
}