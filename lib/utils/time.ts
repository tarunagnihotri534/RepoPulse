export function now(): number {
  return Date.now();
}

export function hoursBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Returns "YYYY-MM" for the current calendar month */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
