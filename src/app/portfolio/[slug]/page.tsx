import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Wrench } from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { Badge } from "@/components/ui/Card";
import { ButtonLink, buttonStyles } from "@/components/ui/Button";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { CtaBand } from "@/components/layout/Footer";

import { getService } from "@/content/services";
import { getWhatsAppLink, site } from "@/content/site";
import { categoryLabel } from "@/lib/portfolio-categories";
import { buildProjectJsonLd } from "@/lib/portfolio-jsonld";
import {
  getPublishedProject,
  getPublishedProjectSlugs,
  getRelatedProjects,
  type PortfolioDetail,
} from "@/lib/portfolio";

/**
 * A single portfolio project.
 *
 * One component serves every project, resolved by slug from the database. There
 * is no per-project file and no duplicated markup, so publishing a project is a
 * database row rather than a code change.
 *
 * PLACEHOLDER ENTRIES ARE MARKED, NOT DISGUISED
 * ----------------------------------------------
 * An entry with `isPlaceholder` set is labelled as one in the page title area,
 * carries a notice above the body copy, and is excluded from the `CreativeWork`
 * structured data. Each of those three is a place where a placeholder could
 * quietly read as real work, and each is closed separately: a visitor who never
 * scrolls must still see the marker, and a crawler reading only the JSON-LD
 * must not be told a case study exists when it does not.
 */

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Prerenders every published project at build time.
 *
 * `dynamicParams` is left at its default of `true`, unlike the service pages.
 * The service catalogue is a compile-time array, so the set of service routes
 * is known exactly and can be closed. Projects live in the database and are
 * added one at a time, so a new project has to be renderable without a
 * redeploy. `getPublishedProjectSlugs` returns an empty list rather than
 * throwing when the database is unreachable, which means a build during an
 * outage produces no prerendered pages instead of failing — the routes are then
 * generated on first request.
 */
export async function generateStaticParams() {
  const slugs = await getPublishedProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

/** Static, refreshed hourly so a newly published project appears on its own. */
export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);

  if (!project) {
    // A route that does not exist has nothing to describe. Returning a title
    // here would put a real page's name into the 404's `<title>`.
    return { title: "Project not found" };
  }

  const url = `/portfolio/${project.slug}`;
  // Bare, because the root layout's `title.template` appends the brand.
  const title = project.title;
  const socialTitle = `${project.title} | ${site.name}`;

  return {
    title,
    description: project.summary,
    alternates: { canonical: url },
    openGraph: {
      // Open Graph and Twitter cards are not templated, so they carry the full
      // title explicitly.
      title: socialTitle,
      description: project.summary,
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: project.summary,
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getPublishedProject(slug);

  if (!project) notFound();

  // Same category first, topped up from the rest, so the block is rarely empty.
  const related = await getRelatedProjects(project, 3);

  const service = project.serviceSlug ? getService(project.serviceSlug) : null;
  const whatsappHref = getWhatsAppLink(
    `Hello CHIBOY TECHNOLOGIES, I would like to discuss a project like "${project.title}".`,
  );

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Portfolio", href: "/portfolio" },
    { label: project.title },
  ];

  return (
    <>
      {/* ---- Header ---- */}
      <section className="bg-navy-900">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs items={crumbs} tone="dark" className="mb-6" />

          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="navy">{categoryLabel(project.category)}</Badge>
              {project.isPlaceholder ? <Badge tone="placeholder">Placeholder</Badge> : null}
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {project.title}
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-charcoal-300">
              {project.summary}
            </p>

            {service ? (
              <p className="mt-6 text-sm text-charcoal-300">
                Usually delivered under{" "}
                <Link
                  href={`/services/${service.slug}`}
                  className="font-semibold text-gold-400 underline underline-offset-4 hover:text-gold-300"
                >
                  {service.name}
                </Link>
              </p>
            ) : null}

            <Link
              href="/portfolio"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal-300 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              All projects
            </Link>
          </div>
        </Container>
      </section>

      {/* ---- Cover ---- */}
      {project.coverImage ? (
        <div className="bg-navy-950">
          <Container className="py-0">
            <div className="relative aspect-16/9 w-full overflow-hidden sm:aspect-21/9">
              {/* The cover is the page's one large image, so it loads eagerly.
                  Everything below it is lazy. */}
              <img
                src={project.coverImage}
                alt={coverAlt(project)}
                width={1600}
                height={900}
                className="size-full object-cover"
                decoding="async"
              />
            </div>
          </Container>
        </div>
      ) : null}

      {/* ---- Placeholder notice, above the body copy ----
          Deliberately the first thing under the cover. A visitor who arrives
          from a search result and stops reading at the first paragraph must
          still have seen that this is a sample entry, not a completed job. */}
      {project.isPlaceholder ? (
        <Section tone="white" size="compact">
          <Container>
            <div
              role="note"
              className="flex gap-4 rounded-2xl border border-dashed border-gold-600/60 bg-gold-500/5 p-6"
            >
              <AlertTriangle
                className="mt-0.5 size-5 shrink-0 text-gold-600"
                aria-hidden="true"
              />
              <div className="text-sm leading-relaxed text-charcoal-700">
                <p className="font-semibold text-navy-900">
                  This is a placeholder entry
                </p>
                <p className="mt-1">
                  It describes the <em>kind</em> of work this category usually
                  involves. No client has been named and no outcome has been
                  claimed. Real entries replace it as they are supplied and
                  approved for publication.
                </p>
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ---- The case study body ---- */}
      <Section tone="white" size="compact">
        <Container>
          <div className="grid gap-12 lg:grid-cols-3 lg:gap-16">
            <div className="space-y-10 lg:col-span-2">
              <ProseBlock title="The problem" headingId="problem-heading">
                {project.problem}
              </ProseBlock>

              <ProseBlock title="What we did" headingId="solution-heading">
                {project.solution}
              </ProseBlock>

              <ProseBlock title="The outcome" headingId="result-heading">
                {project.result}
              </ProseBlock>
            </div>

            <aside className="lg:col-span-1">
              <div className="rounded-2xl border border-navy-100 bg-navy-50 p-6 lg:sticky lg:top-24">
                <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-charcoal-500 uppercase">
                  <Wrench className="size-4" aria-hidden="true" />
                  What it involved
                </h2>

                {project.toolsUsed.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {project.toolsUsed.map((tool) => (
                      <li key={tool} className="flex gap-2.5 text-sm text-charcoal-700">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-navy-600"
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                        {tool}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-charcoal-600">
                    No tools recorded for this entry.
                  </p>
                )}

                <div className="mt-6 space-y-3 border-t border-navy-100 pt-6">
                  <p className="text-sm text-charcoal-700">
                    Have something similar?
                  </p>
                  <Link
                    href="/request-service"
                    className={buttonStyles({ variant: "primary", size: "sm", className: "w-full" })}
                  >
                    Request a Service
                  </Link>
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonStyles({
                        variant: "secondary",
                        size: "sm",
                        className: "w-full",
                      })}
                    >
                      Ask on WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      {/* ---- Related ---- */}
      {related.length > 0 ? (
        <Section tone="muted" labelledBy="related-heading" size="compact">
          <Container>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                id="related-heading"
                eyebrow="More work"
                title="Related projects"
              />
              <ButtonLink
                href="/portfolio"
                variant="secondary"
                className="shrink-0 self-start sm:self-auto"
              >
                All projects
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            </div>

            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ProjectCard key={item.slug} project={item} />
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <CtaBand />

      {/* ---- Structured data ----
          `CreativeWork` is emitted only for a real project. Structured data is
          the one thing on a page that a machine trusts without checking against
          what is visible, so a placeholder must not appear in it. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProjectJsonLd(project, crumbs)) }}
      />
    </>
  );
}

/**
 * A titled prose block, as a labelled `section` so the heading is programmatically
 * associated with the text under it rather than merely sitting above it.
 */
function ProseBlock({
  title,
  headingId,
  children,
}: {
  title: string;
  headingId: string;
  children: string;
}) {
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-xl font-bold text-navy-900 sm:text-2xl">
        {title}
      </h2>
      <p className="mt-3 leading-relaxed text-charcoal-700">{children}</p>
    </section>
  );
}

/**
 * The cover image's alt text.
 *
 * For a real project the cover is a photograph of the work, which on its own
 * adds nothing a visitor does not already get from the title — so it is
 * described as an image of the project rather than inventing detail. For a
 * placeholder the cover is generated artwork, and saying so is more honest than
 * describing it as a picture of something that was never built.
 */
function coverAlt(project: PortfolioDetail): string {
  return project.isPlaceholder
    ? `Placeholder cover artwork for ${project.title}`
    : `Cover image for ${project.title}`;
}

