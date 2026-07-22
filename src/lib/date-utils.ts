/**
 * Local-calendar-day ISO date helpers ("YYYY-MM-DD").
 *
 * `Date#toISOString()` always renders the UTC calendar day. For a user in a
 * positive UTC-offset timezone (e.g. Israel, UTC+2/+3), that silently shows
 * the *next* day for several hours every evening — "today" in a streak
 * calculation, a cook log, or the meal planner would jump a day early.
 * These helpers work from local date parts instead.
 */

export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIsoDate(): string {
  return toLocalIsoDate(new Date());
}

export function addDaysIso(iso: string, delta: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return toLocalIsoDate(d);
}
