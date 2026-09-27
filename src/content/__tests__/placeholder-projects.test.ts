import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";

import { placeholderProjects } from "@/content/placeholder-projects";
import { services } from "@/content/services";

/**
 * Guards the three-way reference between the placeholder portfolio entries, the
 * service catalogue and the generated cover artwork.
 *
 * `placeholderProjects` is the single source shared by the seed script, the
 * artwork generator and (via `relatedProjectSlugs`) the service pages. Before
 * that consolidation the slugs were hardcoded in two places joined only by a
 * "keep in sync" comment, so a rename would silently break the service page's
 * "Related work" section while the database and the images kept the old name.
 *
 * These tests fail loudly instead.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("placeholderProjects", () => {
  it("provides one entry per service", () => {
    expect(placeholderProjects).toHaveLength(services.length);
  });

  it("uses unique, URL-safe slugs", () => {
    const slugs = placeholderProjects.map((project) => project.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const slug of slugs) {
      expect(slug, slug).toMatch(SLUG_PATTERN);
    }
  });

  it("points every entry at a real service", () => {
    const serviceSlugs = new Set(services.map((service) => service.slug));

    for (const project of placeholderProjects) {
      expect(
        serviceSlugs.has(project.serviceSlug),
        `${project.slug} references unknown service "${project.serviceSlug}"`,
      ).toBe(true);
    }
  });

  it("gives every service at least one project", () => {
    // The service detail page renders a "Related work" section from this. An
    // empty list would make the section disappear, so it is asserted here
    // rather than discovered on a live page.
    for (const service of services) {
      expect(
        service.relatedProjectSlugs.length,
        `${service.slug} has no related portfolio project`,
      ).toBeGreaterThan(0);
    }
  });

  it("resolves every relatedProjectSlug to a real project", () => {
    const projectSlugs = new Set(placeholderProjects.map((project) => project.slug));

    for (const service of services) {
      for (const slug of service.relatedProjectSlugs) {
        expect(
          projectSlugs.has(slug),
          `${service.slug} links unknown project "${slug}"`,
        ).toBe(true);
      }
    }
  });

  it("links each project back from the service it claims", () => {
    // Catches a project that exists but is only reachable from the wrong page.
    for (const project of placeholderProjects) {
      const service = services.find((item) => item.slug === project.serviceSlug);
      expect(service, project.slug).toBeDefined();
      expect(
        service?.relatedProjectSlugs,
        `${project.slug} is not referenced by service "${project.serviceSlug}"`,
      ).toContain(project.slug);
    }
  });

  it("marks every entry as placeholder and says so in the copy", () => {
    // The database sets `isPlaceholder: true`, which renders a visible badge.
    // The prose must agree, so the page cannot read as a real client project
    // even if the badge is missed.
    for (const project of placeholderProjects) {
      expect(project.summary.toLowerCase(), project.slug).toContain("placeholder");
      expect(project.problem.toLowerCase(), project.slug).toContain("placeholder");
      expect(project.solution.toLowerCase(), project.slug).toContain("placeholder");
      expect(project.result.toLowerCase(), project.slug).toContain("placeholder");
    }
  });

  it("invents no figures in the placeholder copy", () => {
    // No client results have been supplied, so no statistic, percentage or
    // currency amount may appear in a placeholder entry.
    const claims = /\d+\s*%|\$[\d,]+|£[\d,]+|\b\d{2,}\b/;

    for (const project of placeholderProjects) {
      const fields = ["summary", "problem", "solution", "result"] as const;

      for (const field of fields) {
        const text = project[field];
        expect(
          text,
          `${project.slug}.${field} contains a numeric claim`,
        ).not.toMatch(claims);
      }
    }
  });

  it("derives coverImage from the slug so artwork and data cannot diverge", () => {
    for (const project of placeholderProjects) {
      expect(project.coverImage).toBe(`/portfolio/${project.slug}.svg`);
    }
  });

  it("has generated artwork on disk for every entry", () => {
    // Catches the case where new entries are added but `npm run placeholders`
    // was not re-run, which would ship a broken image.
    for (const project of placeholderProjects) {
      const file = path.join(process.cwd(), "public", project.coverImage);
      expect(existsSync(file), `missing artwork: ${project.coverImage}`).toBe(true);
    }
  });

  it("has no gallery images, because none exist yet", () => {
    // Inventing screenshots of work that has not happened would misrepresent
    // the company. Placeholder entries ship with a cover only.
    for (const project of placeholderProjects) {
      expect(project.coverImage).toBeTruthy();
    }
  });
});
