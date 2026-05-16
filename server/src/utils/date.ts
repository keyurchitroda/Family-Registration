/** Minimal same-day check without date-fns dependency on server bundle size */
export function parseISO(iso: string): Date {
  return new Date(iso);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
