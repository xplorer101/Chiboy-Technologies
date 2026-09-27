/**
 * Placeholder detection.
 *
 * A value is a placeholder if it is empty or wrapped in square brackets, e.g.
 * `[your-domain]`. This exists so the UI can label unfinished business details
 * as such instead of presenting them as fact.
 *
 * Deliberately dependency-free. `site.ts` needs this predicate, and `site.ts`
 * is imported by `Header.tsx`, which is a client component. When this lived in
 * `env.ts` it pulled that module — and therefore zod — into the client bundle
 * of every page, costing ~88 KB gzipped on routes that have no form and never
 * validate anything. A two-line string test has no business shipping a schema
 * library to the browser.
 */

const PLACEHOLDER_PATTERN = /^\[.*\]$/;

export function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length === 0 || PLACEHOLDER_PATTERN.test(trimmed);
}
