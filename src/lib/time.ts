export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayKeyFor(ts?: number): string {
  return dayKey(ts ? new Date(ts) : new Date());
}

export function addDaysKey(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + delta));
}

/** Week of the month (1–5), Monday-based. Week 1 is the one containing the 1st. */
export function weekOfMonth(d: Date): number {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  return Math.max(1, Math.ceil((d.getDate() + offset) / 7));
}

/** Calendar range of a given week within `d`'s month, clamped to the month bounds. */
export function weekRange(week: number, d: Date): { start: Date; end: Date } {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const rawFrom = 1 + (week - 1) * 7 - offset;
  const rawTo = rawFrom + 6;
  const from = Math.max(1, Math.min(rawFrom, lastDay));
  const to = Math.min(lastDay, Math.max(1, rawTo));
  return {
    start: new Date(d.getFullYear(), d.getMonth(), from),
    end: new Date(d.getFullYear(), d.getMonth(), to),
  };
}

export function formatDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return formatDayLabel(new Date(y, m - 1, d).getTime());
}

/** Renders a week-start day key as a span caption, e.g. "Sep 15 – 21". */
export function formatWeekSpan(startKey: string): string {
  const endKey = addDaysKey(startKey, 6);
  const [y, m, d] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  const start = new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (y === ey && m === em) return `${start} – ${ed}`;
  const end = new Date(ey, em - 1, ed).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${start} – ${end}`;
}

/** "YYYY-MM" month key derived from a Date. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "September 2026" label from a "YYYY-MM" key. */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Shift a "YYYY-MM" key by `delta` months. */
export function addMonthsKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

export function isToday(ts: number): boolean {
  return isSameDay(ts, Date.now());
}

export function startOfWeek(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  x.setDate(x.getDate() - diff);
  return x.getTime();
}

export function startOfMonth(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(1);
  return x.getTime();
}

export function plural(n: number, word: string, pluralWord?: string): string {
  return `${n} ${n === 1 ? word : (pluralWord ?? `${word}s`)}`;
}

export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatDayLabel(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]}, ${d.getDate()} ${
    MONTHS[d.getMonth()].slice(0, 3)
  }`;
}

export function formatFullDate(ts: number): string {
  const d = new Date(ts);
  return `Mon, ${d.getDate()} ${
    d.toLocaleString("en-US", { month: "short" })
  } ${d.getFullYear()}`;
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}