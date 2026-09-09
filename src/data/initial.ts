import type { Area, Task, WorkSession } from "@/types";
import { dayKeyFor } from "@/lib/time";

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
    return b.createdAt - a.createdAt;
  });
}

export const INITIAL_TASKS: Task[] = [
  // Daily
  {
    id: "t1",
    title: "Finish AWS EC2 module",
    areaId: "cloud",
    areaName: "Cloud Engineering",
    priority: "high",
    status: "todo",
    bucket: "daily",
    icon: "cloud",
    day: dayKeyFor(),
    archived: false,
    createdAt: Date.now() - 86400000,
  },
  {
    id: "t2",
    title: "Gym Workout",
    areaId: "health",
    areaName: "Health",
    priority: "high",
    status: "todo",
    bucket: "daily",
    icon: "dumbbell",
    day: dayKeyFor(),
    archived: false,
    createdAt: Date.now() - 86400000,
  },
  {
    id: "t3",
    title: "English Speaking Practice",
    areaId: "personal",
    areaName: "Personal Development",
    priority: "medium",
    status: "done",
    bucket: "daily",
    icon: "message",
    completedAt: Date.now() - 86400000,
    day: dayKeyFor(),
    archived: false,
    createdAt: Date.now() - 86400000,
  },
  {
    id: "t4",
    title: "Track Daily Diet",
    areaId: "health",
    areaName: "Health",
    priority: "medium",
    status: "done",
    bucket: "daily",
    icon: "utensils",
    completedAt: Date.now() - 2 * 3600000,
    day: dayKeyFor(),
    archived: false,
    createdAt: Date.now() - 86400000,
  },
  // Weekly
  {
    id: "t5",
    title: "Work on SaaS Landing Page",
    areaId: "saas",
    areaName: "SaaS Products",
    priority: "medium",
    status: "todo",
    bucket: "weekly",
    icon: "laptop",
    createdAt: Date.now() - 86400000,
  },
  {
    id: "t6",
    title: "Read 20 Pages",
    areaId: "learning",
    areaName: "Learning",
    priority: "low",
    status: "done",
    bucket: "weekly",
    icon: "book",
    completedAt: Date.now() - 2 * 86400000,
    createdAt: Date.now() - 86400000,
  },
  {
    id: "t7",
    title: "Weekly Review of Notes",
    areaId: "personal",
    areaName: "Personal Development",
    priority: "low",
    status: "done",
    bucket: "weekly",
    icon: "pen",
    completedAt: Date.now() - 5 * 86400000,
    createdAt: Date.now() - 86400000,
  },
  // Monthly
  {
    id: "t8",
    title: "Cloud Certification Prep",
    areaId: "cloud",
    areaName: "Cloud Engineering",
    priority: "high",
    status: "todo",
    bucket: "monthly",
    icon: "grad",
    createdAt: Date.now() - 86400000,
  },
  {
    id: "t9",
    title: "Ship SaaS MVP",
    areaId: "saas",
    areaName: "SaaS Products",
    priority: "high",
    status: "todo",
    bucket: "monthly",
    icon: "code",
    createdAt: Date.now() - 86400000,
  },
  {
    id: "t10",
    title: "Finish Course: Linux Basics",
    areaId: "learning",
    areaName: "Learning",
    priority: "medium",
    status: "done",
    bucket: "monthly",
    icon: "book",
    completedAt: Date.now() - 12 * 86400000,
    createdAt: Date.now() - 86400000,
  },
];

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

/**
 * Demo focus sessions spread across the last ~7 weeks so goals, charts and
 * the streak read as a living system on first launch. Synthetic by design.
 * The user's real sessions append to these until they reset from Settings.
 */
export function buildSeedSessions(now: number = Date.now()): WorkSession[] {
  const DAY = 86400000;
  const taskCd = [
    { taskId: "t1", minutes: 95, rating: 4 },
    { taskId: "t2", minutes: 45, rating: 5 },
    { taskId: "t3", minutes: 40, rating: 4 },
    { taskId: "t4", minutes: 82, rating: 3 },
    { taskId: "t5", minutes: 55, rating: 4 },
    { taskId: "t6", minutes: 30, rating: 5 },
  ];

  // deterministic pseudo-random so re-seeds look stable
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const out: WorkSession[] = [];
  let k = 0;

  // Today: a few focused sessions (~4h25m) for a rich dashboard.
  const today0 = new Date(now);
  today0.setHours(9, 15, 0, 0);
  for (const [ti, cfg] of taskCd.slice(0, 4).entries()) {
    const started = today0.getTime() + ti * 7200000;
    out.push({
      id: `seed-today-${ti}`,
      taskId: cfg.taskId,
      mode: ti % 2 === 0 ? "focus_target" : "stopwatch",
      startedAt: started,
      endedAt: started + cfg.minutes * 60000,
      targetMinutes: ti % 2 === 0 ? 60 : undefined,
      activeDuration: cfg.minutes * 60000,
      pausedDuration: Math.round(cfg.minutes * 60000 * 0.06),
      focusRating: cfg.rating,
      notes: ti === 0 ? "Worked through the EC2 module — security groups are clear now." : undefined,
      status: "saved",
    });
  }

  // Past 7 weeks: daily-ish sessions with realistic gaps.
  const daysBack = 49;
  for (let d = daysBack; d >= 1; d--) {
    const date = new Date(now - d * DAY);
    const dow = date.getDay();
    // skip most Sundays, some Saturdays
    if (dow === 0 && rand() < 0.8) continue;
    if (dow === 6 && rand() < 0.5) continue;
    if (rand() < 0.18) continue; // occasional missed day
    const sessions = 1 + Math.floor(rand() * 2);
    for (let s = 0; s < sessions; s++) {
      const cfg = taskCd[Math.floor(rand() * taskCd.length)];
      const start = date.setHours(8 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0);
      const minutes = 20 + Math.floor(rand() * 80);
      k++;
      out.push({
        id: `seed-${k}`,
        taskId: cfg.taskId,
        mode: rand() < 0.5 ? "focus_target" : "stopwatch",
        startedAt: start,
        endedAt: start + minutes * 60000,
        targetMinutes: rand() < 0.5 ? 60 : undefined,
        activeDuration: minutes * 60000,
        pausedDuration: Math.round(minutes * 60000 * (0.02 + rand() * 0.08)),
        focusRating: 3 + Math.floor(rand() * 3),
        notes: undefined,
        status: "saved",
      });
    }
  }

  return out.sort((a, b) => b.startedAt - a.startedAt);
}
