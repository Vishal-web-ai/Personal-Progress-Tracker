import type { Task, WorkSession } from "@/types";
import { AREAS } from "@/data/initial";
import { startOfDay } from "@/lib/time";

/**
 * Rich 3-month sample history so the Analytics tab can be exercised in a local
 * dev build. Deliberately synthetic and clearly structured to show a trend:
 * completion daily/weekly/monthly, plus focused work sessions. Never shipped to
 * real users — only reachable via a dev-only Settings control.
 */

const DAY = 86400000;

const TASK_TITLES: Record<string, string[]> = {
  cloud: ["Finish EC2 deep-dive", "Deploy sandbox", "Review IAM policies", "Kubernetes practice", "CI/CD pipeline", "Terraform module"],
  health: ["Gym workout", "Morning run", "Track diet", "Stretch routine", "8k steps", "Hydration check"],
  personal: ["Read 20 pages", "Journal", "Meditate", "Weekly review", "English practice", "Plan tomorrow"],
  saas: ["Landing page copy", "Pricing page", "User onboarding flow", "Changelog", "Sales call notes", "MVP feature"],
  learning: ["Linux basics", "React course", "System design notes", "Book chapter", "Flashcards", "Tutorial recap"],
};

function rand(seed: { v: number }): number {
  seed.v = (seed.v * 1103515245 + 12345) & 0x7fffffff;
  return seed.v / 0x7fffffff;
}

function pick<T>(arr: T[], seed: { v: number }): T {
  return arr[Math.floor(rand(seed) * arr.length)];
}

export function buildSampleData(now: number = Date.now()): { tasks: Task[]; sessions: WorkSession[] } {
  const seed = { v: 7 };
  const tasks: Task[] = [];
  const sessions: WorkSession[] = [];

  const DAYS = 90;
  const today0 = startOfDay(new Date(now));

  // Tasks: new ones created most days, ~30% completed the same day they're made;
  // older ones mostly done within a day or two so historical rates look alive.
  for (let d = 0; d < DAYS; d++) {
    const created = today0 - (DAYS - 1 - d) * DAY; // oldest → newest
    const numNew = 1 + Math.floor(rand(seed) * 3); // 1–3 tasks created that day
    for (let i = 0; i < numNew; i++) {
      const area = pick(AREAS, seed);
      const title = pick(TASK_TITLES[area.id] ?? TASK_TITLES.cloud, seed);
      const done = rand(seed) < 0.55;
      const doneOffset = done ? 0 : rand(seed) < 0.6 ? 1 : 2; // complete same-day or 1–2d later
      const completedAt = done
        ? Math.min(created + doneOffset * DAY + 3600000, now)
        : undefined;
      tasks.push({
        id: `sample-t-${d}-${i}`,
        title: `${title}${i > 0 ? ` ${i + 1}` : ""}`,
        areaId: area.id,
        areaName: area.name,
        priority: rand(seed) < 0.3 ? "high" : rand(seed) < 0.7 ? "medium" : "low",
        status: done ? "done" : "todo",
        bucket: rand(seed) < 0.5 ? "daily" : rand(seed) < 0.75 ? "weekly" : "monthly",
        icon: area.icon,
        completedAt,
        createdAt: created + rand(seed) * 5 * 3600000,
      });
    }

    // Positive-feedback trend: today is busier/more consistent than ~3 months ago.
    const consistencyBoost = (d / DAYS) * 0.5;
    if (rand(seed) < 0.55 + consistencyBoost) {
      const mins = Math.round(30 + rand(seed) * 70 + consistencyBoost * 30);
      sessions.push({
        id: `sample-s-${d}`,
        taskId: `sample-t-${d}-0`,
        mode: rand(seed) < 0.5 ? "focus_target" : "stopwatch",
        startedAt: created + 9 * 3600000,
        endedAt: created + 9 * 3600000 + mins * 60000,
        activeDuration: mins * 60000,
        pausedDuration: 0,
        status: "saved",
      });
    }
  }

  return {
    tasks: tasks.sort((a, b) => b.createdAt - a.createdAt),
    sessions: sessions.sort((a, b) => b.startedAt - a.startedAt),
  };
}
