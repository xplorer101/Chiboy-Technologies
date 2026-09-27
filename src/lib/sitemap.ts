/**
 * Sitemap construction.
 *
 * Kept separate from `app/sitemap.ts` and free of any database or `next`
 * import so the rules below are unit-testable. The route file supplies real
 * data; this module decides what belongs in the sitemap and with what weight.
 */

export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type SitemapEntry = {
  /** Absolute URL, including origin. */
  url: string;
  lastModified?: Date;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
};

/**
 * Static, always-present routes.
 *
 * `lastModified` is deliberately omitted rather than set to "now". A build
 * timestamp would change on every deployment and tell crawlers that content
 * nobody edited is newly published, which erodes trust in the signal.
 */
const STATIC_ROUTES: ReadonlyArray<{
  path: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/services", changeFrequency: "monthly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/portfolio", changeFrequency: "weekly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
  { path: "/request-service", changeFrequency: "monthly", priority: 0.9 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
] as const;

export type SitemapInput = {
  /** Site origin, e.g. `https://chiboytechnologies.com`. */
  baseUrl: string;
  /** Slugs from the services content file. */
  serviceSlugs: readonly string[];
  /** Published portfolio projects. */
  projects: readonly { slug: string; updatedAt?: Date | null }[];
};

/**
 * A slug is only usable if it is a single safe path segment. Rejecting
 * anything else is what stops a stray value from injecting an arbitrary URL
 * into the sitemap — including a full external URL, which would let the
 * sitemap point crawlers away from the site.
 */
const SAFE_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isSafeSegment(value: string): boolean {
  return value.length > 0 && value.length <= 100 && SAFE_SEGMENT.test(value);
}

/** Joins origin and path into an absolute URL with exactly one joining slash. */
function absoluteUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export function buildSitemap(input: SitemapInput): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  // A duplicate <url> is a protocol violation, and the duplicate is exactly
  // what a repeated slug in the content file or database would produce. Cheap
  // to prevent here; awkward to notice in a generated XML file.
  const seen = new Set<string>();

  const push = (path: string, changeFrequency: SitemapChangeFrequency, priority: number) => {
    add({
      url: absoluteUrl(input.baseUrl, path),
      changeFrequency,
      priority,
    });
  };

  const add = (entry: SitemapEntry) => {
    if (seen.has(entry.url)) return;
    seen.add(entry.url);
    entries.push(entry);
  };

  for (const route of STATIC_ROUTES) {
    push(route.path, route.changeFrequency, route.priority);
  }

  for (const slug of input.serviceSlugs) {
    if (!isSafeSegment(slug)) continue;
    push(`/services/${slug}`, "monthly", 0.8);
  }

  for (const project of input.projects) {
    if (!isSafeSegment(project.slug)) continue;
    add({
      url: absoluteUrl(input.baseUrl, `/portfolio/${project.slug}`),
      // A project's own edit time is a real signal. Projects without one
      // (a database that predates the column, or a stub) simply omit it.
      ...(project.updatedAt ? { lastModified: project.updatedAt } : {}),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}

export { STATIC_ROUTES };
