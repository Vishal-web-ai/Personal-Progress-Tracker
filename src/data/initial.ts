import type { Area, Task } from "@/types";

export const AREAS: Area[] = [
  { id: "cloud", name: "Cloud Engineering", icon: "cloud" },
  { id: "health", name: "Health", icon: "heart" },
  { id: "personal", name: "Personal Development", icon: "user" },
  { id: "saas", name: "SaaS Products", icon: "laptop" },
  { id: "learning", name: "Learning", icon: "book" },
];

export const AREA_ICONS: Record<string, string> = {
  cloud: "cloud",
  health: "heart",
  personal: "user",
  saas: "laptop",
  learning: "book",
};

export function sortByPriority<T extends { priority: Task["priority"]; createdAt: number }>(list: T[]): T[] {
  const order = { high: 0, medium: 1, low: 2 } as const;
  return [...list].sort((a, b) => {
    if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
    return a.createdAt - b.createdAt;
  });
}

export const PRIORITY_META: Record<
  "high" | "medium" | "low",
  { label: string; color: string; dot: string }
> = {
  high: {
    label: "High Priority",
    color: "var(--priority-high)",
    dot: "#ff6b6b",
  },
  medium: {
    label: "Medium Priority",
    color: "var(--priority-medium)",
    dot: "#e8c85a",
  },
  low: {
    label: "Low Priority",
    color: "var(--priority-low)",
    dot: "#6fde78",
  },
};
