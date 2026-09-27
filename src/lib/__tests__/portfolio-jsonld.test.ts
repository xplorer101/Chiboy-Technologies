import { describe, expect, it } from "vitest";

import {
  buildPortfolioCollectionJsonLd,
  buildProjectJsonLd,
} from "@/lib/portfolio-jsonld";

/**
 * The rule under test: structured data must never claim work that does not
 * exist.
 *
 * These assertions exist because the failure is invisible. A placeholder
 * described as a `CreativeWork` renders a perfectly good-looking page, passes a
 * JSON-LD validator, and tells a search engine that CHIBOY TECHNOLOGIES has
 * completed a project it never did. Nothing breaks; the site just quietly
 * misrepresents the company to the audience least able to check.
 */

const realProject = {
  slug: "network-refresh",
  title: "Network refresh",
  summary: "Replaced ageing switches across two floors.",
  isPlaceholder: false,
};

const sampleProject = {
  slug: "placeholder-networking",
  title: "Structured cabling for a small office",
  summary: "Placeholder entry describing the kind of work involved.",
  isPlaceholder: true,
};

const UNFILTERED = { isFiltered: false, crumbs: [] } as const;

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Network refresh" },
] as const;

/** Every `@type` in a JSON-LD graph, flattened. */
function typesOf(graph: unknown[]): string[] {
  return graph.map((node) => (node as { "@type": string })["@type"]);
}

describe("portfolio collection structured data", () => {
  it("describes the page as a CollectionPage", () => {
    const graph = buildPortfolioCollectionJsonLd([realProject], UNFILTERED);
    expect(typesOf(graph)).toContain("CollectionPage");
  });

  it("lists real projects, so a fully real portfolio is indexable", () => {
    const graph = buildPortfolioCollectionJsonLd([realProject], UNFILTERED);
    const list = graph.find((n) => (n as { "@type": string })["@type"] === "ItemList");

    expect(list).toBeDefined();
    expect((list as { numberOfItems: number }).numberOfItems).toBe(1);
  });

  /**
   * The load-bearing assertion. A list where every entry is a placeholder is a
   * claim that twenty-odd case studies exist.
   */
  it("omits the ItemList when any project in it is a placeholder", () => {
    const graph = buildPortfolioCollectionJsonLd([sampleProject], UNFILTERED);
    expect(typesOf(graph)).not.toContain("ItemList");
  });

  /**
   * A list is only as true as its weakest entry. One placeholder among nineteen
   * real projects still inflates the count, so the whole list is withheld
   * rather than filtering the placeholder out and publishing a shorter one —
   * which would look like a rendering bug and understate the real work.
   */
  it("withholds the list when a single placeholder is mixed in with real projects", () => {
    const graph = buildPortfolioCollectionJsonLd(
      [realProject, sampleProject, realProject],
      UNFILTERED,
    );
    expect(typesOf(graph)).not.toContain("ItemList");
  });

  it("still describes the page and its trail when the list is withheld", () => {
    // Withholding the `ItemList` must not leave the page with no
    // machine-readable description at all.
    const graph = buildPortfolioCollectionJsonLd([sampleProject], {
      isFiltered: false,
      crumbs,
    });
    expect(typesOf(graph)).toEqual(["CollectionPage", "BreadcrumbList"]);
  });

  it("builds its trail from the crumbs it is given, so the two cannot disagree", () => {
    const graph = buildPortfolioCollectionJsonLd([sampleProject], {
      isFiltered: false,
      crumbs,
    });
    const trail = graph.find(
      (n) => (n as { "@type": string })["@type"] === "BreadcrumbList",
    ) as { itemListElement: Array<{ name: string }> };

    expect(trail.itemListElement.map((i) => i.name)).toEqual([
      "Home",
      "Portfolio",
      "Network refresh",
    ]);
  });

  it("describes the list once, on the unfiltered page, not per category", () => {
    const graph = buildPortfolioCollectionJsonLd([realProject], { isFiltered: true, crumbs });
    expect(typesOf(graph)).not.toContain("ItemList");
    // A filtered view is still a real page and still needs describing.
    expect(typesOf(graph)).toContain("CollectionPage");
  });

  it("numbers list items from one, and links each to its own page", () => {
    const graph = buildPortfolioCollectionJsonLd(
      [realProject, { ...realProject, slug: "second" }],
      UNFILTERED,
    );
    const list = graph.find((n) => (n as { "@type": string })["@type"] === "ItemList") as {
      itemListElement: Array<{ position: number; url: string }>;
    };

    expect(list.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(list.itemListElement[0]?.url).toBe("/portfolio/network-refresh");
  });

  it("emits valid, self-contained JSON", () => {
    // The string goes into a `<script type="application/ld+json">`, so a `NaN`
    // or an `undefined` would produce a parse error in the consumer.
    for (const graph of [
      buildPortfolioCollectionJsonLd([realProject], UNFILTERED),
      buildPortfolioCollectionJsonLd([sampleProject], UNFILTERED),
    ]) {
      expect(() => JSON.parse(JSON.stringify(graph))).not.toThrow();
    }
  });
});

describe("project page structured data", () => {
  it("describes a real project as a CreativeWork", () => {
    const graph = buildProjectJsonLd(realProject, crumbs);
    expect(typesOf(graph)).toContain("CreativeWork");
  });

  /** The same rule, on the single-project page. */
  it("never describes a placeholder as a CreativeWork", () => {
    const graph = buildProjectJsonLd(sampleProject, crumbs);
    expect(typesOf(graph)).not.toContain("CreativeWork");
  });

  it("keeps the breadcrumb trail for a placeholder, because that is navigation", () => {
    // A breadcrumb describes where the page sits, not what work was done, so it
    // stays. Dropping it would leave the page with no structured data at all.
    const graph = buildProjectJsonLd(sampleProject, crumbs);
    expect(typesOf(graph)).toContain("BreadcrumbList");
  });

  it("builds the trail from the crumbs it is given, so the two cannot disagree", () => {
    const graph = buildProjectJsonLd(realProject, crumbs);
    const trail = graph.find((n) => (n as { "@type": string })["@type"] === "BreadcrumbList") as {
      itemListElement: Array<{ name: string; item?: string }>;
    };

    expect(trail.itemListElement).toHaveLength(crumbs.length);
    expect(trail.itemListElement[1]?.name).toBe("Portfolio");
    expect(trail.itemListElement[1]?.item).toBe("/portfolio");
  });

  it("attaches the work to the organisation, not to an unnamed author", () => {
    const graph = buildProjectJsonLd(realProject, crumbs);
    const work = graph.find((n) => (n as { "@type": string })["@type"] === "CreativeWork") as {
      creator: { "@type": string; name: string };
    };

    expect(work.creator["@type"]).toBe("Organization");
    expect(work.creator.name).toBe("CHIBOY TECHNOLOGIES");
  });

  /**
   * `areaServed` is omitted everywhere while the service area is unconfirmed.
   * A test that would fail the moment someone helpfully adds an empty string
   * keeps it omitted.
   */
  it("states no service area, rather than stating an empty one", () => {
    const graph = buildProjectJsonLd(realProject, crumbs);
    const work = graph.find((n) => (n as { "@type": string })["@type"] === "CreativeWork") as
      Record<string, unknown>;

    expect(work).not.toHaveProperty("areaServed");
  });

  it("emits no empty-string fields anywhere", () => {
    for (const graph of [
      buildProjectJsonLd(realProject, crumbs),
      buildPortfolioCollectionJsonLd([realProject], UNFILTERED),
    ]) {
      const walk = (node: unknown): void => {
        if (Array.isArray(node)) return void node.forEach(walk);
        if (node === null || typeof node !== "object") return;
        for (const [key, value] of Object.entries(node)) {
          // An empty string asserts that a value is known to be blank, which is
          // a stronger and usually false claim than omitting the key.
          expect(value === "", `expected no empty-string value for "${key}"`).toBe(false);
          expect(value, `expected "${key}" not to be undefined`).not.toBeUndefined();
          walk(value);
        }
      };
      walk(graph);
    }
  });
});
