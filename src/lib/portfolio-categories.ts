/**
 * Portfolio category helpers.
 *
 * Kept in their own module — rather than inside `ProjectCard.tsx` — for three
 * reasons:
 *
 *  1. `categoryLabel` was exported from a component file purely so the filter
 *     and the detail page could reuse it. Components are the wrong home for
 *     shared vocabulary.
 *  2. The `/portfolio` filter needs to turn an untrusted `?category=` query
 *     parameter into either a valid category or "no filter". That is a pure
 *     function and belongs somewhere testable, not inside a page component.
 *  3. This module is deliberately free of `server-only` and of database
 *     imports, so it is usable from a server component, a client component and
 *     a plain unit test without pulling anything heavy along.
 *
 * The category list is derived from the Prisma enum rather than restated, so
 * adding a value to `schema.prisma` makes it selectable here automatically. The
 * human labels are the one thing that has to be written by hand.
 */

import { PortfolioCategory } from "@/generated/prisma/enums";

/** Every category a project can be filed under, in display order. */
export const PORTFOLIO_CATEGORIES: readonly PortfolioCategory[] = [
  PortfolioCategory.SOFTWARE,
  PortfolioCategory.NETWORKING,
  PortfolioCategory.COMPUTER_SERVICES,
  PortfolioCategory.GRAPHICS_DESIGN,
  PortfolioCategory.OTHER,
];

const CATEGORY_LABELS: Record<string, string> = {
  SOFTWARE: "Software",
  NETWORKING: "Networking",
  COMPUTER_SERVICES: "Computer Services",
  GRAPHICS_DESIGN: "Graphics Design",
  OTHER: "Other",
};

/**
 * Human-readable category label. Falls back to the raw value rather than to an
 * empty string: a category this module has not been taught about should still
 * render as something, and an unfamiliar token is more debuggable than nothing.
 */
export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

/** True for a value that is one of the known categories. */
export function isPortfolioCategory(value: string): value is PortfolioCategory {
  return PORTFOLIO_CATEGORIES.includes(value as PortfolioCategory);
}

/**
 * Normalises the `?category=` query parameter.
 *
 * Returns `null` for anything unrecognised, which the page reads as "show
 * everything". A typo in a shared link then shows the full portfolio rather
 * than an empty grid that looks broken, and an attacker cannot inject an
 * arbitrary string into the rendered filter state.
 *
 * Case is folded so `/portfolio?category=networking` works — links get
 * hand-edited and retyped, and a filter that silently does nothing is worse
 * than one that is forgiving.
 *
 * `null` is accepted because that is what `URLSearchParams.get()` returns for a
 * key that is not present at all, which is the most common way a caller reaches
 * this function.
 */
export function parseCategoryParam(
  value: string | string[] | null | undefined,
): PortfolioCategory | null {
  // `searchParams` can legitimately be an array if a URL repeats the key;
  // only the first value is meaningful and the rest are ignored.
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim().toUpperCase();
  return isPortfolioCategory(trimmed) ? trimmed : null;
}

/** Minimal shape needed to filter, so this works with cards and with details. */
export type Categorised = { category: string };

/**
 * Filters projects by category, or returns them all when `category` is null.
 *
 * Written as a single expression rather than an early return so that "no
 * filter" and "filter matched everything" cannot drift apart: there is only
 * one code path, and it is the one that produces the unfiltered list.
 */
export function filterByCategory<T extends Categorised>(
  items: readonly T[],
  category: PortfolioCategory | null,
): T[] {
  if (category === null) return [...items];
  return items.filter((item) => item.category === category);
}

/** Builds the href for a filter link, collapsing the "All" case to the bare path. */
export function categoryHref(category: PortfolioCategory | null): string {
  return category === null ? "/portfolio" : `/portfolio?category=${category}`;
}
