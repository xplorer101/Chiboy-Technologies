import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/ui/Breadcrumbs";
import { ServiceCard } from "@/components/services/ServiceCard";
import { WorkflowSection } from "@/components/sections/WorkflowSteps";
import { CtaBand } from "@/components/layout/Footer";
import { services } from "@/content/services";
import { site, workflowSteps } from "@/content/site";

/**
 * Services overview.
 *
 * Entirely driven by the `services` array — adding a service to
 * `src/content/services.ts` adds it here with no edit to this file. The detail
 * pages are generated from the same array, so the overview and the six detail
 * routes can never fall out of step.
 */

const TITLE = "Our Services";
const DESCRIPTION =
  "Computer software maintenance, software installation and configuration, networking, graphics design, technology sales and IT consultancy for individuals and businesses.";

export const metadata: Metadata = {
  // Bare title: the root layout's `title.template` appends " | CHIBOY
  // TECHNOLOGIES". Including the brand here would render it twice.
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/services" },
  openGraph: {
    // Open Graph is not templated, so it needs the full title spelled out.
    title: `${TITLE} | ${site.name}`,
    description: DESCRIPTION,
    url: "/services",
    type: "website",
  },
};

export default function ServicesPage() {
  const crumbs = [
    { label: "Home", href: "/" },
    { label: TITLE },
  ];

  return (
    <>
      <PageHeader crumbs={crumbs} />

      <Section tone="white" labelledBy="services-grid-heading" size="compact">
        <Container>
          <SectionHeading
            id="services-grid-heading"
            eyebrow="What we do"
            title="Choose the service you need"
            lead="Each service below explains the problems it solves and what the work includes. If you are not sure which applies, send us a description of the situation and we will point you in the right direction."
          />

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </ul>
        </Container>
      </Section>

      <WorkflowSection steps={workflowSteps} id="services-workflow-heading" />

      <CtaBand />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd(crumbs),
            {
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `${site.name} services`,
              numberOfItems: services.length,
              itemListElement: services.map((service, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: service.name,
                description: service.cardDescription,
                url: `/services/${service.slug}`,
              })),
            },
          ]),
        }}
      />
    </>
  );
}

/** Navy page header shared by the overview and the detail pages. */
function PageHeader({ crumbs }: { crumbs: readonly { label: string; href?: string }[] }) {
  return (
    <section className="bg-navy-900">
      <Container className="py-12 sm:py-16">
        <Breadcrumbs items={crumbs} tone="dark" className="mb-6" />

        <p className="text-sm font-semibold tracking-wider text-gold-400 uppercase">
          Our services
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {TITLE}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-charcoal-300">
          Six areas of technology work for individuals and businesses. Every
          engagement starts with understanding the problem before anything is
          changed.
        </p>
      </Container>
    </section>
  );
}
