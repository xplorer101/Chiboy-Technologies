import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, FolderOpen } from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink, buttonStyles } from "@/components/ui/Button";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { CtaBand } from "@/components/layout/Footer";

import { cn } from "@/lib/utils/cn";

import { site } from "@/content/site";
import {
  categoryHref,
  categoryLabel,
  filterByCategory,
  parseCategoryParam,
  PORTFOLIO_CATEGORIES,
} from "@/lib/portfolio-categories";
import { buildPortfolioCollectionJsonLd } from "@/lib/portfolio-jsonld";
import { getPortfolioFeed } from "@/lib/portfolio";

/**
 * The portfolio index.
 *
 * WHY THE CATEGORY FILTER IS SERVER-SIDE
 * --------------------------------------
 * The filter is a `?category=` query parameter resolved on the server, not a
 * client component toggling a hidden class. That buys four things for free:
 *
 *  - It works with JavaScript disabled. A filter that only exists in React is
 *    simply not there for a meaningful number of visitors.
 *  - The filtered URL is shareable, and survives a reload, the back button and
 *    a bookmark.
 *  - A crawlable, linkable set of category URLs, rather than one page that
 *    changes but has one address.
 *  - No `useSearchParams`, and therefore no `Suspense` boundary and no static
 *    shell flashing to a client-rendered one.
 *
 * The cost is that awaiting `searchParams` makes this route dynamic, so the
 * listing is rendered per request instead of being served from the prerender.
 * That is the right trade for a grid: the query is a single indexed read of
 * roughly twenty rows, and a visitor reaching a page listing every project
 * wants current data.
 *
 * ONE QUERY, FILTERED IN MEMORY
 * -----------------------------
 * All published projects are read once and the category is applied to the
 * result, rather than pushing the filter into a `where` clause. The counts
 * shown next to each filter chip have to cover every category, so the full list
 * is needed regardless; filtering the same array in memory keeps the count and
 * the result guaranteed to agree, where two separate queries could disagree.
 */

export const metadata: Metadata = {
  // Bare, because the root layout's `title.template` appends the brand.
  title: "Portfolio",
  description:
    "Selected technology work from CHIBOY TECHNOLOGIES, covering software maintenance and installation, networking, computer services and graphics design.",
  // Canonical to the unfiltered path for every filter state. A filtered view is
  // the same content in a different order, so indexing each variant separately
  // would only create duplicates competing with each other.
  alternates: { canonical: "/portfolio" },
  openGraph: {
    title: `Portfolio | ${site.name}`,
    description:
      "Selected technology work from CHIBOY TECHNOLOGIES, covering software maintenance and installation, networking, computer services and graphics design.",
    url: "/portfolio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Portfolio | ${site.name}`,
    description:
      "Selected technology work from CHIBOY TECHNOLOGIES, covering software maintenance and installation, networking, computer services and graphics design.",
  },
};

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Portfolio" },
] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Awaiting `searchParams` is what makes this route dynamic. From here on the
  // rest of the page is an ordinary server render.
  const params = await searchParams;
  const active = parseCategoryParam(params["category"]);

  // One read for the grid and for every filter count.
  const { projects, unavailable } = await getPortfolioFeed();
  const visible = filterByCategory(projects, active);
  const placeholderCount = visible.filter((p) => p.isPlaceholder).length;

  const counts = PORTFOLIO_CATEGORIES.map(
    (category) =>
      [category, projects.filter((p) => p.category === category).length] as const,
  );

  return (
    <>
      {/* ---- Header ---- */}
      <section className="bg-navy-900">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs items={crumbs} tone="dark" className="mb-6" />

          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-wider text-gold-400 uppercase">
              Our work
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Portfolio
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-charcoal-300">
              A selection of the kinds of problems we work on, grouped by the
              service that usually applies. Each entry sets out the problem, the
              approach and what was involved.
            </p>
          </div>
        </Container>
      </section>

      <Section tone="white" size="compact">
        <Container>
          {/* ---- Category filter ---- */}
          {projects.length > 0 ? (
            <nav aria-label="Filter portfolio by category" className="border-b border-charcoal-200 pb-6">
              <ul className="-mx-1 flex flex-wrap gap-2">
                <li>
                  <FilterChip
                    href={categoryHref(null)}
                    label="All"
                    count={projects.length}
                    isActive={active === null}
                  />
                </li>
                {counts.map(([category, count]) => (
                  <li key={category}>
                    <FilterChip
                      href={categoryHref(category)}
                      label={categoryLabel(category)}
                      count={count}
                      // A category with nothing in it is still shown, so the
                      // shape of the portfolio is visible — but as a disabled
                      // button, because a link to an empty grid is a dead end.
                      disabled={count === 0}
                      isActive={active === category}
                    />
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {/* ---- Result summary ---- */}
          {visible.length > 0 ? (
            <p aria-live="polite" className="mt-6 text-sm text-charcoal-600">
              Showing <strong className="font-semibold text-navy-900">{visible.length}</strong>{" "}
              {visible.length === 1 ? "project" : "projects"}
              {active ? (
                <>
                  {" "}
                  in <strong className="font-semibold text-navy-900">{categoryLabel(active)}</strong>
                </>
              ) : null}
              {placeholderCount > 0 ? (
                <>
                  {" "}
                  &mdash; {placeholderCount} of them placeholder{" "}
                  {placeholderCount === 1 ? "entry" : "entries"} while real project
                  examples are prepared.
                </>
              ) : null}
            </p>
          ) : null}

          {/* ---- Grid, or the honest reason there is not one ---- */}
          {visible.length > 0 ? (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((project, index) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  // Only the first row is above the fold; the rest lazy-load.
                  priority={index < 3}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              unavailable={unavailable}
              isFiltered={active !== null}
              hasAnyProjects={projects.length > 0}
            />
          )}

          {/* ---- Offer the work, not just the archive ---- */}
          {visible.length > 0 ? (
            <div className="mt-14 flex flex-col items-start gap-4 rounded-2xl bg-navy-50 p-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-charcoal-700">
                None of these look like your situation? That is normal — tell us
                what is wrong and we will tell you which service fits, or whether
                you need one at all.
              </p>
              <ButtonLink href="/request-service" variant="primary" className="shrink-0">
                Request a Service
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          ) : null}
        </Container>
      </Section>

      {/* ---- What the placeholder marker means ---- */}
      {placeholderCount > 0 ? (
        <Section tone="muted" size="compact" labelledBy="placeholder-note-heading">
          <Container width="narrow">
            <SectionHeading
              id="placeholder-note-heading"
              eyebrow="About these entries"
              title="Why some entries are marked as placeholders"
            />

            <div className="mt-6 space-y-4 leading-relaxed text-charcoal-700">
              <p>
                An entry marked <strong>Placeholder</strong> describes a{" "}
                <em>kind</em> of work, not a completed engagement. The problem and
                the approach are realistic for that category, but no client has
                been named and no outcome has been claimed.
              </p>
              <p>
                We have marked them rather than removed them, and rather than
                presenting them as case studies, because a portfolio that looks
                fuller than the work behind it is worse than an honest sparse
                one. Real entries replace these as they are supplied and approved
                for publication.
              </p>
              <p>
                If you would like to see specific work, or to discuss a situation
                similar to one of these, please get in touch.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/contact" variant="primary">
                Contact us
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <Link
                href="/services"
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-2.5 font-semibold text-navy-800 transition-colors hover:bg-navy-50"
              >
                Browse our services
              </Link>
            </div>
          </Container>
        </Section>
      ) : null}

      <CtaBand />

      {/* ---- Structured data ----
          `ItemList` is emitted only when at least one real project is in the
          list. A list of placeholder entries dressed up as published creative
          work would tell a search engine something untrue, and would do it in
          the one place structured data is trusted without question. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildPortfolioCollectionJsonLd(visible, {
              isFiltered: active !== null,
              crumbs,
            }),
          ),
        }}
      />
    </>
  );
}

/**
 * One filter control.
 *
 * An anchor rather than a button, so it is a real link: middle-click and
 * open-in-new-tab work, and the state is in the URL rather than in memory.
 * `aria-current` carries the active state to assistive technology, because the
 * gold fill is a colour difference on its own.
 */
function FilterChip({
  href,
  label,
  count,
  isActive,
  disabled = false,
}: {
  href: string;
  label: string;
  count: number;
  isActive: boolean;
  disabled?: boolean;
}) {
  const base =
    "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors";

  if (disabled) {
    return (
      <span
        aria-hidden="true"
        className={cn(base, "border-dashed border-charcoal-200 text-charcoal-400")}
        title="No entries in this category yet"
      >
        {label}
        <span className="text-charcoal-400">{count}</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={
        isActive
          ? `${base} border-navy-900 bg-navy-900 text-white`
          : `${base} border-charcoal-200 bg-white text-charcoal-700 hover:border-navy-300 hover:bg-navy-50`
      }
    >
      {label}
      <span className={isActive ? "text-charcoal-300" : "text-charcoal-400"}>
        {count}
      </span>
    </Link>
  );
}

/**
 * Why there is no grid, stated honestly.
 *
 * Three genuinely different situations collapse into the same visual, so they
 * are told apart here: the database was unreachable, the filter matched nothing,
 * and there is genuinely nothing published. Only the first is a fault; the
 * second is the visitor's own doing and the third is a fact about the business.
 * Collapsing them into one "no projects" message would tell a visitor their
 * filter emptied the page when the site was actually broken.
 */
function EmptyState({
  unavailable,
  isFiltered,
  hasAnyProjects,
}: {
  unavailable: boolean;
  isFiltered: boolean;
  hasAnyProjects: boolean;
}) {
  if (unavailable) {
    return (
      <div
        role="status"
        className="mt-8 rounded-2xl border border-charcoal-200 bg-charcoal-50 p-8 text-center"
      >
        <AlertTriangle className="mx-auto size-8 text-gold-600" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-navy-900">
          The portfolio is temporarily unavailable
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-charcoal-700">
          We could not load the project list just now. This is a fault on our
          side, not something wrong with your browser. Please try again in a
          moment, or get in touch and we will answer directly.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/contact" className={buttonStyles({ variant: "primary" })}>
            Contact us
          </Link>
          <Link href="/services" className={buttonStyles({ variant: "secondary" })}>
            Browse our services
          </Link>
        </div>
      </div>
    );
  }

  if (isFiltered && hasAnyProjects) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-charcoal-300 p-8 text-center">
        <FolderOpen className="mx-auto size-8 text-navy-400" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-navy-900">
          Nothing in this category yet
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-charcoal-700">
          There are entries in other categories. Try one of those, or view
          everything.
        </p>
        <Link href="/portfolio" className={buttonStyles({ variant: "primary", className: "mt-6" })}>
          Show all projects
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-charcoal-300 p-8 text-center">
      <FolderOpen className="mx-auto size-8 text-navy-400" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-navy-900">
        No projects published yet
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-charcoal-700">
        We are putting real project examples together. In the meantime, every
        service page describes the problems it solves and what is included, which
        is the more useful starting point.
      </p>
      <Link href="/services" className={buttonStyles({ variant: "primary", className: "mt-6" })}>
        Browse our services
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

