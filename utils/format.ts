/**
 * utils/format.ts
 * Pure formatting helpers — no side effects, fully testable.
 */

/** Convert cents to a dollar string: 1299 → "$12.99" */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format an ISO date string to a human-readable short date: "Jan 5, 2025" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a number with commas: 1234567 → "1,234,567" */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
