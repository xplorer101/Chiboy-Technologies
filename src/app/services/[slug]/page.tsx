import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check, MessageCircle } from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/ui/Breadcrumbs";
import { ServiceIcon } from "@/components/ui/Card";
import { FaqAccordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { ServiceCard } from "@/components/services/ServiceCard";
import { WorkflowSection } from "@/components/sections/WorkflowSteps";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { CtaBand } from "@/components/layout/Footer";

import { getService, services } from "@/content/services";
import { site, workflowSteps, getWhatsAppLink } from "@/content/site";
import { getProjectsBySlugs, type PortfolioCard } from "@/lib/portfolio";

/**
 * Service detail page.
 *
 * ONE component serves all six services. The slug is the only thing that
 * differs, and it is resolved against the `services` array — so adding a
 * seventh service to `src/content/services.ts` publishes a seventh page here
 * automatically, with no new route file and no duplicated markup.
 *
 * Structure follows the specification: title and intro, the problems it
 * solves, what is included, the six-step workflow, related portfolio, FAQ, and
 * a closing call to action.
 */

/**
 * Prerenders all six services at build time. `dynamicParams = false` means an
 * unknown slug returns a proper 404 rather than attempting a render, which
 * keeps the route set closed and predictable.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

/** The six detail pages are static; refresh hourly so a new related project
 *  can appear without a redeploy. */
export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) {
    // Next.js turns this into the not-found page; there is no useful metadata
    // to return for a route that does not exist.
    return { title: "Service not found" };
  }

  // Bare, because the root layout's `title.template` appends
  // " | CHIBOY TECHNOLOGIES". Spelling the brand out here would double it.
  const title = service.meta.title;
  const socialTitle = `${service.meta.title} | ${site.name}`;
  const url = `/services/${service.slug}`;

  return {
    title,
    description: service.meta.description,
    alternates: { canonical: url },
    openGraph: {
      // Open Graph and Twitter cards are not templated, so they carry the
      // full title explicitly.
      title: socialTitle,
      description: service.meta.description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: service.meta.description,
    },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) notFound();

  // Resolved by slug from the content file. Returns an empty list — rather than
  // failing the page — if the database is unavailable, so a service page is
  // never taken offline by a database problem.
  const relatedProjects: PortfolioCard[] = await getProjectsBySlugs(
    service.relatedProjectSlugs,
  );

  // Everything except the current service, so a visitor who picked the wrong
  // page can self-serve instead of going back to the overview.
  const otherServices = services.filter((item) => item.slug !== service.slug);

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: service.name },
  ];

  const whatsappHref = getWhatsAppLink(
    `Hello CHIBOY TECHNOLOGIES, I would like to enquire about ${service.name}.`,
  );

  return (
    <>
      {/* ---- Header: title + intro ---- */}
      <section className="bg-navy-900">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs items={crumbs} tone="dark" className="mb-6" />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-5">
            <span
              aria-hidden="true"
              className="inline-grid size-14 shrink-0 place-items-center rounded-xl bg-white/10"
            >
              <ServiceIcon name={service.icon} className="size-7 text-gold-400" />
            </span>

            <div className="max-w-3xl">
              <p className="text-sm font-semibold tracking-wider text-gold-400 uppercase">
                Service
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {service.name}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-charcoal-300">
                {service.intro}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink href="/request-service" variant="accent" size="lg">
                  Request a Service
                  <ArrowRight className="size-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/services" variant="ghostDark" size="lg">
                  All services
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ---- Problems it solves + what's included ---- */}
      <Section tone="white" size="compact">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <section aria-labelledby="problems-heading">
              <h2
                id="problems-heading"
                className="text-2xl font-bold text-navy-900 sm:text-3xl"
              >
                Problems this solves
              </h2>
              <p className="mt-3 text-charcoal-600">
                If any of these sound familiar, this is likely the service you
                need.
              </p>

              <ul className="mt-6 space-y-3">
                {service.problems.map((problem) => (
                  <li key={problem} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-grid size-5 shrink-0 place-items-center rounded-full bg-navy-50"
                    >
                      <Check className="size-3.5 text-navy-700" strokeWidth={3} />
                    </span>
                    <span className="leading-relaxed text-charcoal-700">
                      {problem}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="included-heading">
              <h2
                id="included-heading"
                className="text-2xl font-bold text-navy-900 sm:text-3xl"
              >
                What&apos;s included
              </h2>
              <p className="mt-3 text-charcoal-600">
                The scope of the work, agreed before we start.
              </p>

              <ul className="mt-6 space-y-3">
                {service.included.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-grid size-5 shrink-0 place-items-center rounded-full bg-gold-500/15"
                    >
                      <Check className="size-3.5 text-gold-700" strokeWidth={3} />
                    </span>
                    <span className="leading-relaxed text-charcoal-700">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Container>
      </Section>

      {/* ---- Workflow ---- */}
      <WorkflowSection steps={workflowSteps} id="workflow-heading" tone="white" />

      {/* ---- Related portfolio ---- */}
      {relatedProjects.length > 0 ? (
        <Section tone="muted" labelledBy="related-projects-heading" size="compact">
          <Container>
            <SectionHeading
              id="related-projects-heading"
              eyebrow="Related work"
              title={`Examples of ${service.name.toLowerCase()}`}
              lead="Sample entries are shown while we prepare real project examples."
            />

            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProjects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {/* ---- FAQ ---- */}
      <Section tone="white" labelledBy="faq-heading">
        <Container width="narrow">
          <SectionHeading
            id="faq-heading"
            eyebrow="Questions"
            title="Frequently asked questions"
            align="center"
          />

          <div className="mt-10">
            <FaqAccordion items={service.faqs} idPrefix={service.slug} />
          </div>

          <p className="mt-8 text-center text-charcoal-600">
            Still unsure whether this is the right service?{" "}
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-navy-700 underline underline-offset-4 hover:text-navy-900"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Ask us on WhatsApp
              </a>
            ) : (
              <span>
                <a
                  href="/contact"
                  className="font-semibold text-navy-700 underline underline-offset-4 hover:text-navy-900"
                >
                  Contact us
                </a>{" "}
                and we will point you in the right direction.
              </span>
            )}
          </p>
        </Container>
      </Section>

      {/* ---- Other services ---- */}
      <Section tone="muted" labelledBy="other-services-heading" size="compact">
        <Container>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              id="other-services-heading"
              eyebrow="Explore"
              title="Other services"
            />
            <ButtonLink
              href="/services"
              variant="secondary"
              className="shrink-0 self-start sm:self-auto"
            >
              All services
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((item) => (
              <ServiceCard key={item.slug} service={item} />
            ))}
          </ul>
        </Container>
      </Section>

      <CtaBand />

      {/* ---- Structured data ----
          BreadcrumbList, Service and FAQPage. Derived from the same `service`
          object that renders the visible page, so the structured data cannot
          drift from the copy a visitor actually reads. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd(crumbs),
            {
              "@context": "https://schema.org",
              "@type": "Service",
              name: service.name,
              description: service.meta.description,
              serviceType: service.name,
              url: `/services/${service.slug}`,
              provider: { "@type": "Organization", name: site.name },
              areaServed: "[PLACEHOLDER: service area]",
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: `${service.name} — what is included`,
                itemListElement: service.included.map((item) => ({
                  "@type": "Offer",
                  itemOffered: { "@type": "Service", name: item },
                })),
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: service.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            },
          ]),
        }}
      />
    </>
  );
}
