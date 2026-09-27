import { breadcrumbJsonLd, type Crumb } from "@/components/ui/Breadcrumbs";
import { site } from "@/content/site";

/**
 * Portfolio structured data.
 *
 * Extracted from the two page files that use it, for the same reason
 * `portfolio-categories.ts` was: a correctness rule that can only be checked by
 * reading the rendered `<script>` tag is a rule that will eventually be broken.
 * These builders are pure, so the rule below is asserted directly.
 *
 * THE RULE THIS MODULE ENFORCES
 * -----------------------------
 * Structured data is the one part of a page a machine trusts without checking
 * it against what a human can see. A search engine reading a `CreativeWork` or
 * an `ItemList` has no way to know the entry behind it is a sample, so
 * publishing one for a placeholder tells a crawler that work exists which does
 * not. That is not a stylistic concern — it is the exact misrepresentation the
 * site's no-invented-facts rule exists to prevent, delivered to the one audience
 * least able to notice.
 *
 * So:
 *   - A placeholder project is never described as a `CreativeWork`. It still
 *     appears in the breadcrumb trail, which describes navigation rather than
 *     the work itself.
 *   - An `ItemList` is emitted only when EVERY project in it is real. A list
 *     containing one placeholder still overstates what exists, so the check is
 *     on the whole list, not per item.
 *
 * Both functions omit unknown fields entirely rather than emitting empty
 * strings. A `"areaServed": ""` is worse than an absent key: it asserts that a
 * value is known to be empty, and validators flag it.
 */

/** The minimum a project must expose to appear in an `ItemList`. */
export type ListedProject = { slug: string; isPlaceholder: boolean };

/** The minimum a project must expose to be described as a `CreativeWork`. */
export type DescribedProject = {
  slug: string;
  title: string;
  summary: string;
  isPlaceholder: boolean;
};

/**
 * `CollectionPage`, the breadcrumb trail, and — only when it would be true — an
 * `ItemList` of the projects.
 *
 * A filtered view is a re-ordering of the same content, so the list is described
 * once on the unfiltered page rather than duplicated across every category URL.
 * Combined with the canonical URL pointing at `/portfolio`, that keeps five
 * copies of the same content out of the index.
 *
 * `crumbs` is passed in rather than rebuilt, so the structured trail cannot
 * describe a different path than the one the page renders.
 */
export function buildPortfolioCollectionJsonLd(
  projects: readonly ListedProject[],
  options: { isFiltered: boolean; crumbs: readonly Crumb[] },
): unknown[] {
  const graph: unknown[] = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Portfolio",
      description: "Selected technology work from CHIBOY TECHNOLOGIES.",
      url: "/portfolio",
    },
    breadcrumbJsonLd(options.crumbs),
  ];

  if (options.isFiltered || projects.some((project) => project.isPlaceholder)) return graph;

  graph.push({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Projects",
    numberOfItems: projects.length,
    itemListElement: projects.map((project, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `/portfolio/${project.slug}`,
    })),
  });

  return graph;
}

/**
 * The breadcrumb trail for a project page, plus a `CreativeWork` for real
 * projects only.
 *
 * `crumbs` is passed in rather than rebuilt, so the structured trail cannot
 * describe a different path than the one the page renders.
 */
export function buildProjectJsonLd(
  project: DescribedProject,
  crumbs: readonly Crumb[],
): unknown[] {
  const graph: unknown[] = [breadcrumbJsonLd(crumbs)];

  if (project.isPlaceholder) return graph;

  graph.push({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    url: `/portfolio/${project.slug}`,
    creator: { "@type": "Organization", name: site.name },
    // `areaServed` is deliberately absent. The service area is unconfirmed and is
    // omitted everywhere rather than inferred from the office address, so there
    // is nothing honest to state here yet.
  });

  return graph;
}
