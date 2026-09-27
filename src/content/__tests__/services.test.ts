import { describe, expect, it } from "vitest";
import {
  OTHER_SERVICE_OPTION,
  getService,
  isServiceSlug,
  serviceRequestOptions,
  services,
} from "@/content/services";

/**
 * Regression tests for the service catalogue.
 *
 * The route list in the specification is fixed, so it is asserted literally: if
 * a slug is renamed, the corresponding URL 404s for anyone who has already
 * linked to it, and this test is what catches that before it ships.
 */

const REQUIRED_SLUGS = [
  "software-maintenance",
  "software-installation",
  "networking",
  "graphics-design",
  "sales",
  "consultancy",
] as const;

describe("service catalogue", () => {
  it("contains exactly the six specified services", () => {
    expect(services).toHaveLength(6);
  });

  it("exposes every required route slug", () => {
    expect(services.map((service) => service.slug).sort()).toEqual(
      [...REQUIRED_SLUGS].sort(),
    );
  });

  it("uses unique slugs", () => {
    const slugs = services.map((service) => service.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses unique names", () => {
    const names = services.map((service) => service.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every service complete content for its detail page", () => {
    for (const service of services) {
      expect(service.name.length, `${service.slug} name`).toBeGreaterThan(0);
      expect(service.cardDescription.length, `${service.slug} card`).toBeGreaterThan(10);
      expect(service.intro.length, `${service.slug} intro`).toBeGreaterThan(80);
      expect(service.problems.length, `${service.slug} problems`).toBeGreaterThan(0);
      expect(service.included.length, `${service.slug} included`).toBeGreaterThan(0);
      expect(service.faqs.length, `${service.slug} faqs`).toBeGreaterThan(0);
      expect(service.meta.title.length, `${service.slug} meta title`).toBeGreaterThan(0);
      expect(
        service.meta.description.length,
        `${service.slug} meta description`,
      ).toBeGreaterThan(20);
    }
  });

  it("gives every FAQ entry a question and a substantive answer", () => {
    for (const service of services) {
      for (const faq of service.faqs) {
        expect(faq.question.endsWith("?")).toBe(true);
        expect(faq.answer.length).toBeGreaterThan(30);
      }
    }
  });

  it("keeps every meta description within a sensible SEO length", () => {
    for (const service of services) {
      // Below ~160 characters so it is not truncated in search results.
      expect(service.meta.description.length, service.slug).toBeLessThanOrEqual(160);
    }
  });

  it("only references project slugs in a safe form", () => {
    for (const service of services) {
      for (const slug of service.relatedProjectSlugs) {
        expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      }
    }
  });
});

describe("getService", () => {
  it("finds a service by slug", () => {
    expect(getService("networking")?.name).toBe("Networking");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getService("does-not-exist")).toBeUndefined();
  });
});

describe("isServiceSlug", () => {
  it("narrows known slugs", () => {
    expect(isServiceSlug("graphics-design")).toBe(true);
    expect(isServiceSlug("nope")).toBe(false);
  });
});

describe("serviceRequestOptions", () => {
  it("offers all six services plus Other", () => {
    expect(serviceRequestOptions).toHaveLength(7);
    expect(serviceRequestOptions.at(-1)).toEqual({
      value: OTHER_SERVICE_OPTION,
      label: "Other",
    });
  });

  it("matches the catalogue slugs exactly", () => {
    const optionSlugs = serviceRequestOptions
      .map((option) => option.value)
      .filter((value) => value !== OTHER_SERVICE_OPTION);

    expect(optionSlugs).toEqual(services.map((service) => service.slug));
  });
});
