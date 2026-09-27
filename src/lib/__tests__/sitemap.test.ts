import { describe, expect, it } from "vitest";

import { buildSitemap, type SitemapInput } from "@/lib/sitemap";

/**
 * The rule under test: `sitemap.xml` must list exactly the real, indexable
 * pages of this site, and nothing else.
 *
 * A sitemap is a machine-readable claim about the site. Two failure modes
 * matter and neither is visible on the page itself:
 *
 *  - Listing a URL that does not exist, or one carrying a query string, sends
 *    crawlers to a dead end and spends crawl budget on it.
 *  - Emitting a slug that is not a single safe path segment would let a
 *    stray value in the database or content file place an arbitrary — possibly
 *    external — URL into the sitemap, pointing crawlers off-site.
 */

const base = "https://chiboytechnologies.com";

function input(overrides: Partial<SitemapInput> = {}): SitemapInput {
  return {
    baseUrl: base,
    serviceSlugs: ["networking", "graphics-design"],
    projects: [{ slug: "network-refresh", updatedAt: new Date("2026-01-15T00:00:00Z") }],
    ...overrides,
  };
}

const paths = (i: SitemapInput) => buildSitemap(i).map((e) => new URL(e.url).pathname);

describe("buildSitemap", () => {
  it("lists every static route", () => {
    expect(paths(input())).toEqual(
      expect.arrayContaining([
        "/",
        "/services",
        "/about",
        "/portfolio",
        "/contact",
        "/request-service",
        "/privacy",
      ]),
    );
  });

  it("lists each service and project under its own route", () => {
    const p = paths(input());
    expect(p).toContain("/services/networking");
    expect(p).toContain("/services/graphics-design");
    expect(p).toContain("/portfolio/network-refresh");
  });

  it("produces only absolute URLs on the configured origin", () => {
    for (const entry of buildSitemap(input())) {
      expect(entry.url.startsWith(`${base}/`)).toBe(true);
    }
  });

  it("never repeats a URL", () => {
    const urls = buildSitemap(input({ serviceSlugs: ["networking", "networking"] })).map(
      (e) => e.url,
    );
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("emits no query string or fragment", () => {
    for (const entry of buildSitemap(input())) {
      expect(entry.url).not.toContain("?");
      expect(entry.url).not.toContain("#");
    }
  });

  it("rejects slugs that are not a single safe path segment", () => {
    // Each of these would escape the intended route if concatenated naively.
    const hostile = [
      "../admin",
      "../../etc/passwd",
      "//evil.example.com",
      "https://evil.example.com",
      "net working",
      "Networking",
      "networking/../admin",
      "networking?x=1",
      "",
      "a".repeat(101),
    ];
    const p = paths(input({ serviceSlugs: hostile, projects: [] }));
    for (const bad of hostile) {
      expect(p.some((path) => path.includes(bad.slice(0, 12)) && bad !== "")).toBe(false);
    }
    // The static routes survive regardless of hostile input.
    expect(p).toContain("/services");
  });

  it("refuses to place an external URL in the sitemap", () => {
    const p = paths(
      input({ serviceSlugs: [], projects: [{ slug: "//evil.example.com" }] }),
    );
    expect(p.some((path) => path.includes("evil.example.com"))).toBe(false);
  });

  it("handles a base URL with a trailing slash without doubling it", () => {
    const p = paths(input({ baseUrl: `${base}/` }));
    expect(p).toContain("/services");
    for (const path of p) expect(path.startsWith("//")).toBe(false);
  });

  it("carries a project's own edit time, and omits it when unknown", () => {
    const entries = buildSitemap(
      input({
        projects: [
          { slug: "has-date", updatedAt: new Date("2026-01-15T00:00:00Z") },
          { slug: "no-date", updatedAt: null },
        ],
      }),
    );
    const dated = entries.find((e) => e.url.endsWith("/has-date"));
    const undated = entries.find((e) => e.url.endsWith("/no-date"));
    expect(dated?.lastModified?.toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(undated?.lastModified).toBeUndefined();
  });

  it("does not stamp a build time onto static routes", () => {
    // A "last modified = now" on untouched pages teaches crawlers that
    // `lastmod` is noise, which costs the signal its value on real edits.
    for (const entry of buildSitemap(input())) {
      if (new URL(entry.url).pathname === "/privacy") {
        expect(entry.lastModified).toBeUndefined();
      }
    }
  });

  it("keeps priority within the range search engines expect", () => {
    for (const entry of buildSitemap(input())) {
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
  });

  it("still returns the static routes when there is no data at all", () => {
    const p = paths(input({ serviceSlugs: [], projects: [] }));
    expect(p).toContain("/");
    expect(p).toContain("/privacy");
  });
});
