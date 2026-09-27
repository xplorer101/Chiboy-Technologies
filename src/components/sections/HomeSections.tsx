import { Card, ServiceIcon, TrustIcon } from "@/components/ui/Card";
import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { ButtonLink } from "@/components/ui/Button";
import { services } from "@/content/services";
import { trustPoints } from "@/content/site";
import type { PortfolioCard } from "@/lib/portfolio";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { ArrowRight } from "lucide-react";

/**
 * Homepage sections.
 *
 * Each section is a separate component so the page file reads as a summary of
 * the page rather than a wall of markup.
 */

export function TrustSection() {
  return (
    <Section tone="white" labelledBy="trust-heading">
      <Container>
        <SectionHeading
          id="trust-heading"
          eyebrow="Why work with us"
          title="Straightforward technology support"
          lead="We focus on solving the problem in front of us and explaining what we did, rather than selling more than you need."
          align="center"
        />

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point) => (
            <Card as="li" key={point.title} className="h-full">
              <span className="inline-grid size-11 place-items-center rounded-lg bg-navy-50">
                <TrustIcon name={point.icon} className="size-5 text-navy-700" />
              </span>
              <h3 className="mt-4 font-semibold text-navy-900">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
                {point.body}
              </p>
            </Card>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

export function ServicesPreview() {
  return (
    <Section tone="muted" labelledBy="services-preview-heading">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="services-preview-heading"
            eyebrow="What we do"
            title="Services"
            lead="Six areas of technology work, for individuals and businesses."
          />
          <ButtonLink href="/services" variant="secondary" className="shrink-0 self-start sm:self-auto">
            All services
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServicePreviewCard key={service.slug} service={service} />
          ))}
        </ul>
      </Container>
    </Section>
  );
}

function ServicePreviewCard({
  service,
}: {
  service: (typeof services)[number];
}) {
  return (
    <Card
      as="li"
      className="group relative h-full transition-shadow hover:shadow-[var(--shadow-lift)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-600"
    >
      <span className="inline-grid size-11 place-items-center rounded-lg bg-navy-50 transition-colors group-hover:bg-navy-900">
        <ServiceIcon
          name={service.icon}
          className="size-5 text-navy-700 transition-colors group-hover:text-gold-400"
        />
      </span>

      <h3 className="mt-4 text-lg font-semibold text-navy-900">
        <a href={`/services/${service.slug}`} className="after:absolute after:inset-0">
          {/* The `::after` overlay stretches the hit area to the whole card
              while the accessible name stays just the service name.

              The text link deliberately keeps the global :focus-visible
              outline; the card additionally shows a focus-within ring so
              keyboard users can see which card they are on. Suppressing one
              without replacing the other would break visible focus. */}
          {service.name}
        </a>
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
        {service.cardDescription}
      </p>
    </Card>
  );
}

export function PortfolioPreview({ projects }: { projects: readonly PortfolioCard[] }) {
  return (
    <Section tone="white" labelledBy="portfolio-preview-heading">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="portfolio-preview-heading"
            eyebrow="Selected work"
            title="Projects"
            lead="Examples of the kind of work we carry out."
          />
          <ButtonLink
            href="/portfolio"
            variant="secondary"
            className="shrink-0 self-start sm:self-auto"
          >
            View portfolio
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        </div>

        {projects.length === 0 ? (
          <EmptyPortfolio />
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </ul>
        )}
      </Container>
    </Section>
  );
}

/**
 * Shown when the portfolio is empty — which is the honest state until real
 * projects are supplied. It points to the enquiry route rather than inventing
 * content to fill the space.
 */
function EmptyPortfolio() {
  return (
    <div className="mt-12 rounded-[var(--radius-card)] border border-dashed border-charcoal-300 bg-charcoal-50 p-10 text-center">
      <p className="text-sm font-semibold tracking-wide text-navy-700 uppercase">
        Portfolio coming soon
      </p>
      <p className="mx-auto mt-3 max-w-md text-charcoal-600">
        We are preparing examples of completed work to publish here. In the
        meantime, please get in touch and we will happily discuss your
        requirements.
      </p>
      <ButtonLink href="/request-service" variant="accent" className="mt-6">
        Request a Service
      </ButtonLink>
    </div>
  );
}
