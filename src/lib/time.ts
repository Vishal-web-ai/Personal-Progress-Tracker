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

export function formatDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return formatDayLabel(new Date(y, m - 1, d).getTime());
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