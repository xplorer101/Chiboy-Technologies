import "server-only";

import { prisma } from "@/lib/prisma";
import { PortfolioCategory, ProjectVisibility } from "@/generated/prisma/enums";
import { isDatabaseUnavailableError } from "@/lib/db-errors";

/**
 * Read layer for portfolio projects.
 *
 * Queries live here rather than in components so that page code never talks to
 * Prisma directly, and so a future /admin can reuse the same access rules. Only
 * PUBLISHED projects are ever returned, and `internalNotes`-style fields are
 * never selected.
 *
 * All reads are wrapped so that a database outage produces a graceful empty
 * state rather than a 500 page. A portfolio section is never a reason for the
 * rest of the page to fail.
 */

export type PortfolioCard = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  coverImage: string;
  isPlaceholder: boolean;
  serviceSlug: string | null;
};

export type PortfolioDetail = PortfolioCard & {
  problem: string;
  solution: string;
  toolsUsed: string[];
  result: string;
  images: string[];
};

/**
 * A read that also reports WHY it came back empty.
 *
 * "No projects published yet" and "the database is unreachable" both produce
 * zero rows, and a visitor shown the same message for both is being told
 * something untrue in one of the two cases — that the portfolio is empty
 * rather than temporarily unavailable. The dedicated `/portfolio` page uses
 * this so it can say which it is; the homepage and service pages keep using
 * `getPublishedProjects`, where a section is a decoration and the distinction
 * does not matter.
 */
export type PortfolioFeed = {
  projects: PortfolioCard[];
  /** True when the read failed because the database was unavailable. */
  unavailable: boolean;
};

/** Columns needed for a project card. Selected explicitly so new schema fields
 *  are never exposed to a public page by accident. */
const CARD_SELECT = {
  slug: true,
  title: true,
  summary: true,
  category: true,
  coverImage: true,
  isPlaceholder: true,
  serviceSlug: true,
} as const;

const PUBLISHED_ORDER = [
  { sortOrder: "asc" },
  { createdAt: "desc" },
] as const;

/**
 * The full published portfolio, with an availability flag.
 * Never throws: an unreachable or unmigrated database yields an empty list and
 * `unavailable: true` rather than a 500 page.
 */
export async function getPortfolioFeed(limit?: number): Promise<PortfolioFeed> {
  try {
    const projects = await prisma.portfolioProject.findMany({
      where: { visibility: ProjectVisibility.PUBLISHED },
      orderBy: [...PUBLISHED_ORDER],
      take: limit,
      select: CARD_SELECT,
    });

    return { projects, unavailable: false };
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      // Logged server-side only. The exact reason is never shown to a visitor.
      console.error(
        "[portfolio] Falling back to an empty list:",
        error instanceof Error ? error.message : error,
      );
      return { projects: [], unavailable: true };
    }
    throw error;
  }
}

/**
 * Returns the most recent published projects, newest first.
 * Never throws: an unreachable or unmigrated database yields an empty list so
 * the page can show a designed empty state.
 */
export async function getPublishedProjects(limit?: number): Promise<PortfolioCard[]> {
  const { projects } = await getPortfolioFeed(limit);
  return projects;
}

export async function getPublishedProject(slug: string): Promise<PortfolioDetail | null> {
  try {
    return await prisma.portfolioProject.findFirst({
      where: { slug, visibility: ProjectVisibility.PUBLISHED },
      select: {
        ...CARD_SELECT,
        problem: true,
        solution: true,
        toolsUsed: true,
        result: true,
        images: true,
      },
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      console.error(
        "[portfolio] Lookup failed:",
        error instanceof Error ? error.message : error,
      );
      return null;
    }
    throw error;
  }
}

/** Slugs for `generateStaticParams`. */
export async function getPublishedProjectSlugs(): Promise<string[]> {
  try {
    const projects = await prisma.portfolioProject.findMany({
      where: { visibility: ProjectVisibility.PUBLISHED },
      select: { slug: true },
    });
    return projects.map((project) => project.slug);
  } catch {
    // An empty list simply means those routes are generated on demand.
    return [];
  }
}

/**
 * Slug and edit time for every published project, for `sitemap.xml`.
 *
 * Deliberately narrower than `getPublishedProjects`: the sitemap needs no
 * titles, summaries or cover art, and selecting them would pull a row's worth
 * of text and image paths into a route that renders none of it.
 */
export async function getPublishedProjectTimestamps(): Promise<
  { slug: string; updatedAt: Date | null }[]
> {
  try {
    return await prisma.portfolioProject.findMany({
      where: { visibility: ProjectVisibility.PUBLISHED },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    // A sitemap without project entries is still valid; the static routes
    // carry the important pages. Failing the whole sitemap over one query
    // would be a worse outcome than an incomplete one.
    return [];
  }
}

/** Resolves a service's related project slugs, silently dropping any missing. */
export async function getProjectsBySlugs(slugs: readonly string[]): Promise<PortfolioCard[]> {
  if (slugs.length === 0) return [];

  try {
    return await prisma.portfolioProject.findMany({
      where: { slug: { in: [...slugs] }, visibility: ProjectVisibility.PUBLISHED },
      select: CARD_SELECT,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) return [];
    throw error;
  }
}

/**
 * Other projects in the same category, for the "more like this" block at the
 * bottom of a project page.
 *
 * The current project is excluded in the query rather than filtered out
 * afterwards, so `limit` is the number of cards the visitor actually sees. It
 * falls back to other categories when the whole category is the current
 * project, which keeps the section populated for a category that only has one
 * entry.
 */
export async function getRelatedProjects(
  current: { slug: string; category: string },
  limit = 3,
): Promise<PortfolioCard[]> {
  if (limit <= 0) return [];

  try {
    const sameCategory = await prisma.portfolioProject.findMany({
      where: {
        slug: { not: current.slug },
        category: current.category as PortfolioCategory,
        visibility: ProjectVisibility.PUBLISHED,
      },
      orderBy: [...PUBLISHED_ORDER],
      take: limit,
      select: CARD_SELECT,
    });

    if (sameCategory.length >= limit) return sameCategory;

    // Top up with anything else published, avoiding slugs already chosen.
    const alreadyPicked = new Set([current.slug, ...sameCategory.map((p) => p.slug)]);
    const filler = await prisma.portfolioProject.findMany({
      where: {
        slug: { notIn: [...alreadyPicked] },
        visibility: ProjectVisibility.PUBLISHED,
      },
      orderBy: [...PUBLISHED_ORDER],
      take: limit - sameCategory.length,
      select: CARD_SELECT,
    });

    return [...sameCategory, ...filler];
  } catch (error) {
    if (isDatabaseUnavailableError(error)) return [];
    throw error;
  }
}
