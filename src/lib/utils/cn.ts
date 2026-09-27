/**
 * Joins class names, dropping falsy values.
 *
 * Deliberately not `clsx` + `tailwind-merge`: this project has no conditional
 * class-collision cases, and a conflict-free single-purpose helper is easier to
 * reason about than two more dependencies. If conflicts start appearing, the
 * fix is to remove the redundant class at the call site.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
