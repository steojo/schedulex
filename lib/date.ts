// Month-grid math. A calendar dependency would be more configuration than the
// code it replaces.

export type Month = { year: number; month: number }; // month is 0-indexed

export function parseMonth(param: string | undefined): Month {
  const match = /^(\d{4})-(\d{2})$/.exec(param ?? "");
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month >= 0 && month <= 11) return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function formatMonthParam({ year, month }: Month): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function shiftMonth({ year, month }: Month, delta: number): Month {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function monthLabel({ year, month }: Month): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Always 42 days (6 weeks from the Sunday on or before the 1st) so the grid
 * height never jumps when navigating between months.
 */
export function monthGrid({ year, month }: Month): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Local-time YYYY-MM-DD. Used to bucket posts into day cells. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function isSameMonth(date: Date, { year, month }: Month): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

export function isToday(date: Date): boolean {
  return dayKey(date) === dayKey(new Date());
}

/** `datetime-local` input value for a given instant, in local time. */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
