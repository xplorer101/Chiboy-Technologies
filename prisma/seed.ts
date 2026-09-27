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
 *     the body text says so explicitly.
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

// Prisma 7 no longer loads .env automatically, so it is loaded here rather than
// relying on the CLI. Nothing in this script is ever bundled for the browser.
for (const file of [".env", ".env.local"]) {
  if (existsSync(file)) loadEnvFile(file);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(buildPoolConfig(process.env.DATABASE_URL ?? "")),
});

/**
 * Placeholder portfolio entries.
 *
 * One per service so that every service detail page has something to link to.
 * Titles are deliberately generic and the Problem/Solution/Result fields state
 * plainly that this is sample content. Replace these rows with real projects as
 * they become available — no schema change is needed.
 */
const PLACEHOLDER_PROJECTS = [
  {
    slug: "placeholder-software-maintenance",
    title: "Software Maintenance Engagement",
    category: "SOFTWARE" as const,
    serviceSlug: "software-maintenance",
    summary:
      "Placeholder entry — a sample software maintenance engagement. Replace with a real completed project.",
    problem:
      "This is placeholder content. It does not describe a real engagement. A real entry would summarise the situation the client presented, such as declining performance, recurring faults or a failed update.",
    solution:
      "This is placeholder content. A real entry would explain the approach taken, what was changed and why that approach was chosen over the alternatives.",
    toolsUsed: ["[PLACEHOLDER: tools used]"],
    result:
      "This is placeholder content. A real entry would state the outcome the client experienced. No figures have been supplied and none have been invented.",
    coverImage: "/portfolio/placeholder-software-maintenance.svg",
  },
  {
    slug: "placeholder-software-installation",
    title: "Software Installation Project",
    category: "SOFTWARE" as const,
    serviceSlug: "software-installation",
    summary:
      "Placeholder entry — a sample software installation project. Replace with a real completed project.",
    problem:
      "This is placeholder content. It does not describe a real engagement. A real entry would summarise the starting position, such as a new machine requiring setup or software that needed correct installation and licensing.",
    solution:
      "This is placeholder content. A real entry would explain what was installed, how it was configured and how it was tested before handover.",
    toolsUsed: ["[PLACEHOLDER: tools used]"],
    result:
      "This is placeholder content. A real entry would describe what the client was able to do once the work was complete.",
    coverImage: "/portfolio/placeholder-software-installation.svg",
  },
  {
    slug: "placeholder-networking",
    title: "Network Setup Project",
    category: "NETWORKING" as const,
    serviceSlug: "networking",
    summary:
      "Placeholder entry — a sample networking project. Replace with a real completed project.",
    problem:
      "This is placeholder content. It does not describe a real engagement. A real entry would describe the connectivity problem, coverage requirement or equipment involved.",
    solution:
      "This is placeholder content. A real entry would explain the network design, equipment used and how coverage and access control were handled.",
    toolsUsed: ["[PLACEHOLDER: tools used]"],
    result:
      "This is placeholder content. A real entry would describe the improvement in coverage, reliability or device access.",
    coverImage: "/portfolio/placeholder-networking.svg",
  },
  {
    slug: "placeholder-graphics-design",
    title: "Graphics Design Project",
    category: "GRAPHICS_DESIGN" as const,
    serviceSlug: "graphics-design",
    summary:
      "Placeholder entry — a sample graphics design project. Replace with a real completed project.",
    problem:
      "This is placeholder content. It does not describe a real engagement. A real entry would describe the brand or marketing requirement the client needed support with.",
    solution:
      "This is placeholder content. A real entry would explain the design approach, the deliverables produced and the formats they were supplied in.",
    toolsUsed: ["[PLACEHOLDER: design tools used]"],
    result:
      "This is placeholder content. A real entry would describe the assets delivered and where they were used.",
    coverImage: "/portfolio/placeholder-graphics-design.svg",
  },
  {
    slug: "placeholder-technology-sales",
    title: "Technology Supply Project",
    category: "COMPUTER_SERVICES" as const,
    serviceSlug: "sales",
    summary:
      "Placeholder entry — a sample technology supply project. Replace with a real completed project.",
    problem:
      "This is placeholder content. It does not describe a real engagement. A real entry would describe the equipment requirement and why existing hardware was not sufficient.",
    solution:
      "This is placeholder content. A real entry would explain the specification chosen, the reasoning behind it and how it was delivered and configured.",
    toolsUsed: ["[PLACEHOLDER: products supplied]"],
    result:
      "This is placeholder content. A real entry would describe what the client was able to do with the supplied equipment.",
    coverImage: "/portfolio/placeholder-technology-sales.svg",
  },
  {
    slug: "placeholder-it-consultancy",
    title: "IT Consultancy Review",
    category: "OTHER" as const,
    serviceSlug: "consultancy",
    summary:
      "Placeholder entry — a sample consultancy engagement. Replace with a real completed project.",
    problem:
      "This is placeholder content. It does not describe a real engagement. A real entry would describe the decision the client needed advice on before committing budget.",
    solution:
      "This is placeholder content. A real entry would explain the assessment carried out and the recommendations made.",
    toolsUsed: ["[PLACEHOLDER: tools used]"],
    result:
      "This is placeholder content. A real entry would describe the decision the client went on to take and why it was sound.",
    coverImage: "/portfolio/placeholder-it-consultancy.svg",
  },
];

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
  for (const [index, project] of PLACEHOLDER_PROJECTS.entries()) {
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

  console.log(`Portfolio projects: ${PLACEHOLDER_PROJECTS.length} placeholder entries seeded.`);
}

/**
 * Guards against the database catalogue and the content file drifting apart,
 * which would mean a service request could be saved against a category that no
 * longer corresponds to a real service page.
 */
function assertCatalogueMatchesContent(): void {
  const contentSlugs = new Set(services.map((service) => service.slug));
  const projectSlugs = new Set(
    PLACEHOLDER_PROJECTS.map((project) => project.serviceSlug),
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
