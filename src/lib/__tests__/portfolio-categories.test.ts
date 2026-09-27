import { describe, expect, it } from "vitest";

import {
  categoryHref,
  categoryLabel,
  filterByCategory,
  isPortfolioCategory,
  parseCategoryParam,
  PORTFOLIO_CATEGORIES,
} from "@/lib/portfolio-categories";

/**
 * Guards the `/portfolio` filter.
 *
 * The filter is a plain `?category=` query read on the server, which means these
 * functions sit directly on an untrusted input path. Two consequences follow, and
 * both are pinned below: an unrecognised value must degrade to "show
 * everything" rather than to an empty grid, and a recognised value must never be
 * able to carry anything other than a known category into rendered state.
 */
describe("portfolio categories", () => {
  it("lists every category exactly once, with no duplicates", () => {
    expect(new Set(PORTFOLIO_CATEGORIES).size).toBe(PORTFOLIO_CATEGORIES.length);
  });

  it("labels every category, and never renders a raw enum token to a visitor", () => {
    for (const category of PORTFOLIO_CATEGORIES) {
      const label = categoryLabel(category);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe(category);
      // The label is the only thing that reaches the page, so it must not still
      // look like a database value.
      expect(label).not.toMatch(/_/);
    }
  });

  it("falls back to the raw value for a category it has not been taught about", () => {
    // A new enum value added to the schema must still render as something, and
    // the token is more debuggable than an empty string.
    expect(categoryLabel("SOLAR_INSTALLATION")).toBe("SOLAR_INSTALLATION");
  });

  it("recognises exactly the declared categories", () => {
    for (const category of PORTFOLIO_CATEGORIES) {
      expect(isPortfolioCategory(category)).toBe(true);
    }
    for (const value of ["", "software", "NOPE", "SOFTWARE ", "../../etc/passwd", "<script>"]) {
      expect(isPortfolioCategory(value), value).toBe(false);
    }
  });
});

describe("parseCategoryParam", () => {
  it("accepts a known category in any case, and tolerates stray whitespace", () => {
    // Links get hand-edited and retyped, and a filter that silently does
    // nothing is worse than one that is forgiving.
    expect(parseCategoryParam("SOFTWARE")).toBe("SOFTWARE");
    expect(parseCategoryParam("networking")).toBe("NETWORKING");
    expect(parseCategoryParam("  Graphics_Design  ")).toBe("GRAPHICS_DESIGN");
  });

  it("degrades to no filter rather than to an empty grid", () => {
    // The whole point: a mistyped shared link shows the full portfolio instead of
    // a page that looks broken.
    for (const value of ["nope", "", "   ", "SOFTWARE;DROP TABLE", "<img src=x>"]) {
      expect(parseCategoryParam(value), value).toBeNull();
    }
    expect(parseCategoryParam(undefined)).toBeNull();
    expect(parseCategoryParam(null)).toBeNull();
  });

  it("uses only the first value when a URL repeats the key", () => {
    expect(parseCategoryParam(["SOFTWARE", "NETWORKING"])).toBe("SOFTWARE");
    // A repeated key whose first value is junk must not fall through to a later
    // valid one, or the URL would mean two different things depending on order.
    expect(parseCategoryParam(["nope", "SOFTWARE"])).toBeNull();
  });

  it("never returns a value outside the declared set", () => {
    for (const value of ["SOFTWARE", "nope", "OTHER", "'; --"]) {
      const parsed = parseCategoryParam(value);
      if (parsed !== null) expect(PORTFOLIO_CATEGORIES).toContain(parsed);
    }
  });
});

describe("filterByCategory", () => {
  const items = [
    { slug: "a", category: "SOFTWARE" },
    { slug: "b", category: "NETWORKING" },
    { slug: "c", category: "SOFTWARE" },
  ];

  it("returns everything for a null filter, without handing back the original array", () => {
    const result = filterByCategory(items, null);
    expect(result).toHaveLength(3);
    // A copy, because the caller sorts it and a sort in place would reorder the
    // caller's list.
    expect(result).not.toBe(items);
  });

  it("keeps only the matching category", () => {
    expect(filterByCategory(items, "SOFTWARE").map((i) => i.slug)).toEqual(["a", "c"]);
  });

  it("returns an empty list for a category with no projects", () => {
    expect(filterByCategory(items, "OTHER")).toEqual([]);
  });

  it("preserves the input order, so the feed's own ordering survives the filter", () => {
    expect(filterByCategory(items, "NETWORKING").map((i) => i.slug)).toEqual(["b"]);
  });
});

describe("categoryHref", () => {
  it("collapses the All case to the bare path, so the page has one canonical URL", () => {
    expect(categoryHref(null)).toBe("/portfolio");
  });

  it("builds a filter link for a category", () => {
    expect(categoryHref("NETWORKING")).toBe("/portfolio?category=NETWORKING");
  });

  it("round-trips through the parser, so no link can point at a dead filter", () => {
    // The two functions are the write side and the read side of the same URL.
    // If either drifts, a filter link silently renders the unfiltered grid.
    for (const category of PORTFOLIO_CATEGORIES) {
      const href = categoryHref(category);
      const value = new URL(href, "https://example.test").searchParams.get("category");
      expect(parseCategoryParam(value)).toBe(category);
    }
    expect(parseCategoryParam(new URL(categoryHref(null), "https://example.test").searchParams.get("category"))).toBeNull();
  });
});
