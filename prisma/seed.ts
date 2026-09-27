#!/usr/bin/env tsx
/**
 * Database seed.
 *
 * Two things are seeded:
 *
 *  1. `ServiceCategory` — the six services, mirroring src/content/services.ts.
 *     Categories are stored in the database because a service request needs a
 *     foreign key target; the *page content* stays in the content file. The
 *     slugs are asserted to match so the two can never drift apart silently.
 *
 *  2. `PortfolioProject` — clearly labelled placeholder entries only. No real
 *     client names, results or statistics are invented. Every row has
 *     `isPlaceholder: true`, which the UI uses to render a visible marker, and
 *     the body text says so explicitly. The rows themselves come from
 *     `src/content/placeholder-projects.ts`, which is shared with the cover
 *     artwork generator and the service catalogue.
 *
 * The seed is idempotent (upsert by slug), so it is safe to re-run.
 *
 * Usage: npm run db:seed
 */

import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildPoolConfig } from "../src/lib/db-config";
import { services } from "../src/content/services";
import { placeholderProjects } from "../src/content/placeholder-projects";

// Prisma 7 no longer loads .env automatically, so it is loaded here rather than
// relying on the CLI. Nothing in this script is ever bundled for the browser.
for (const file of [".env", ".env.local"]) {
  if (existsSync(file)) loadEnvFile(file);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(buildPoolConfig(process.env.DATABASE_URL ?? "")),
});

async function seedServiceCategories(): Promise<void> {
  for (const [index, service] of services.entries()) {
    const data = {
      name: service.name,
      description: service.cardDescription,
      sortOrder: index,
      isActive: true,
    };

    await prisma.serviceCategory.upsert({
      where: { slug: service.slug },
      create: { slug: service.slug, ...data },
      update: data,
    });
  }

  console.log(`Service categories: ${services.length} synced.`);
}

async function seedPortfolioProjects(): Promise<void> {
  for (const [index, project] of placeholderProjects.entries()) {
    const data = {
      title: project.title,
      summary: project.summary,
      category: project.category,
      problem: project.problem,
      solution: project.solution,
      toolsUsed: project.toolsUsed,
      result: project.result,
      coverImage: project.coverImage,
      // No gallery images: inventing screenshots or photographs of work that
      // has not happened would misrepresent the company.
      images: [] as string[],
      serviceSlug: project.serviceSlug,
      isPlaceholder: true,
      visibility: "PUBLISHED" as const,
      sortOrder: index,
    };

    await prisma.portfolioProject.upsert({
      where: { slug: project.slug },
      create: { slug: project.slug, ...data },
      update: data,
    });
  }

  console.log(`Portfolio projects: ${placeholderProjects.length} placeholder entries seeded.`);
}

/**
 * Guards against the database catalogue and the content file drifting apart,
 * which would mean a service request could be saved against a category that no
 * longer corresponds to a real service page.
 */
function assertCatalogueMatchesContent(): void {
  const contentSlugs = new Set(services.map((service) => service.slug));
  const projectSlugs = new Set(
    placeholderProjects.map((project) => project.serviceSlug),
  );

  for (const slug of projectSlugs) {
    if (!contentSlugs.has(slug)) {
      throw new Error(
        `Seed references service "${slug}" which does not exist in src/content/services.ts`,
      );
    }
  }
}

async function main(): Promise<void> {
  assertCatalogueMatchesContent();

  await seedServiceCategories();
  await seedPortfolioProjects();

  const [categoryCount, projectCount] = await Promise.all([
    prisma.serviceCategory.count(),
    prisma.portfolioProject.count(),
  ]);

  console.log(`\nSeed complete. ${categoryCount} categories, ${projectCount} projects.`);
  console.log(
    "Portfolio rows are PLACEHOLDERS. Replace them with real projects as they are supplied.",
  );
}

main()
  .catch((error: unknown) => {
    // Logged locally for the developer; never returned to a visitor.
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
