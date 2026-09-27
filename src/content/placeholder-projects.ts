import type { PortfolioCategory } from "@/generated/prisma/enums";

/**
 * Placeholder portfolio entries.
 *
 * A SINGLE SOURCE OF TRUTH, shared by three consumers that must never disagree:
 *
 *   1. `prisma/seed.ts`                      — the rows written to the database
 *   2. `scripts/generate-placeholders.ts`    — the placeholder cover artwork
 *   3. `src/content/services.ts`             — via `relatedProjectSlugs`
 *
 * These previously lived in two separate hardcoded lists joined only by a
 * "keep in sync" comment, which is exactly the kind of arrangement that rots:
 * rename a slug in one place and the service page silently loses its related
 * work while the seed and the artwork still use the old name. Sharing the
 * array makes that failure impossible, and
 * `src/content/__tests__/placeholder-projects.test.ts` asserts the
 * cross-references actually resolve.
 *
 * These are PLACEHOLDERS. No real client names, results, figures or
 * statistics are recorded here, and none have been invented. Replace rows with
 * real projects as they are supplied; no schema change is needed.
 *
 * This module is deliberately free of database and framework imports so that
 * plain Node scripts can consume it. It imports only a generated *type*.
 */
export type PlaceholderProject = {
  slug: string;
  title: string;
  category: PortfolioCategory;
  /** Links the entry back to a service in `src/content/services.ts`. */
  serviceSlug: string;
  summary: string;
  problem: string;
  solution: string;
  toolsUsed: string[];
  result: string;
  /** Path under `public/`, produced by `npm run placeholders`. */
  coverImage: string;
};

/**
 * One entry per service, so that every service detail page has something to
 * show in its "Related work" section.
 */
export const placeholderProjects: readonly PlaceholderProject[] = [
  {
    slug: "placeholder-software-maintenance",
    title: "Software Maintenance Engagement",
    category: "SOFTWARE",
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
    category: "SOFTWARE",
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
    category: "NETWORKING",
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
    category: "GRAPHICS_DESIGN",
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
    category: "COMPUTER_SERVICES",
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
    category: "OTHER",
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
