const MS_PER_DAY = 86_400_000;

function toDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function countWorkingDays(start: string | Date, end: string | Date, holidays: string[]) {
  const first = toDate(start);
  const last = toDate(end);
  const excluded = new Set(holidays);
  let count = 0;
  for (let cursor = first; cursor <= last; cursor = new Date(cursor.getTime() + MS_PER_DAY)) {
    const day = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !excluded.has(iso)) count++;
  }
  return count;
}

export function addWorkingDays(start: string | Date, days: number, holidays: string[]) {
  let cursor = toDate(start);
  let remaining = days;
  const excluded = new Set(holidays);
  while (remaining > 0) {
    const day = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !excluded.has(iso)) remaining--;
    if (remaining > 0) cursor = new Date(cursor.getTime() + MS_PER_DAY);
  }
  return cursor.toISOString().slice(0, 10);
}
