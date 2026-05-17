import type { KeyboardEvent } from 'react';

/** Block minus, plus, and scientific notation in number inputs. */
export function blockNegativeNumberKeys(e: KeyboardEvent<HTMLInputElement>): void {
  if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
    e.preventDefault();
  }
}

export function sanitizeCount(value: string | number, min: number): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.floor(n));
}
