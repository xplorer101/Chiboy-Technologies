import "server-only";

import { prisma } from "@/lib/prisma";
import { ProjectVisibility } from "@/generated/prisma/enums";
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
 * Returns the most recent published projects, newest first.
 * Never throws: an unreachable or unmigrated database yields an empty list so
 * the page can show a designed empty state.
 */
export async function getPublishedProjects(limit?: number): Promise<PortfolioCard[]> {
  try {
    const projects = await prisma.portfolioProject.findMany({
      where: { visibility: ProjectVisibility.PUBLISHED },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        slug: true,
        title: true,
        summary: true,
        category: true,
        coverImage: true,
        isPlaceholder: true,
        serviceSlug: true,
      },
    });

    return projects;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      // Logged server-side only. The exact reason is never shown to a visitor.
      console.error(
        "[portfolio] Falling back to an empty list:",
        error instanceof Error ? error.message : error,
      );
      return [];
    }
    throw error;
  }
}

export async function getPublishedProject(slug: string): Promise<PortfolioDetail | null> {
  try {
    return await prisma.portfolioProject.findFirst({
      where: { slug, visibility: ProjectVisibility.PUBLISHED },
      select: {
        slug: true,
        title: true,
        summary: true,
        category: true,
        coverImage: true,
        isPlaceholder: true,
        serviceSlug: true,
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

/** Resolves a service's related project slugs, silently dropping any missing. */
export async function getProjectsBySlugs(slugs: readonly string[]): Promise<PortfolioCard[]> {
  if (slugs.length === 0) return [];

  try {
    return await prisma.portfolioProject.findMany({
      where: { slug: { in: [...slugs] }, visibility: ProjectVisibility.PUBLISHED },
      select: {
        slug: true,
        title: true,
        summary: true,
        category: true,
        coverImage: true,
        isPlaceholder: true,
        serviceSlug: true,
      },
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) return [];
    throw error;
  }
}
