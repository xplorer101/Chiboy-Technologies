import { ServiceCard } from "@/components/services/ServiceCard";
import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { ButtonLink } from "@/components/ui/Button";
import { services } from "@/content/services";
import { getContactDetails } from "@/content/site";
import type { PortfolioCard } from "@/lib/portfolio";
import { ProjectCard } from "@/components/portfolio/ProjectCard";

/**
 * Homepage sections.
 *
 * Each section is a separate component so the page file reads as a summary of
 * the page rather than a wall of markup.
 */

export function TrustSection() {
  const contact = getContactDetails();

  return (
    <Section tone="white" labelledBy="trust-heading">
      <Container>
        <SectionHeading
          id="trust-heading"
          title="Straightforward technology support"
          lead="We are a local technology business. We look at what is actually wrong, fix that, and explain what we did in plain terms."
        />

        <ul className="mt-8 space-y-3 text-charcoal-700">
          {!contact.isLocationPlaceholder ? (
            <li>
              <span className="font-semibold text-navy-900">Where we are:</span>{" "}
              {contact.location}
            </li>
          ) : null}

          {!contact.isHoursPlaceholder ? (
            <li>
              <span className="font-semibold text-navy-900">Opening hours:</span>{" "}
              {contact.hours}
            </li>
          ) : null}

          <li>We explain what we did and do not sell you more than you need.</li>
        </ul>
      </Container>
    </Section>
  );
}

export function ServicesPreview() {
  return (
    <Section tone="muted" labelledBy="services-preview-heading">
      <Container>
        <SectionHeading
          id="services-preview-heading"
          title="What we do"
          lead="Six areas of technology work. Each has its own page with more detail."
        />

        <ul className="mt-10 grid gap-x-12 gap-y-6 sm:grid-cols-2">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </ul>
      </Container>
    </Section>
  );
}

export function PortfolioPreview({ projects }: { projects: readonly PortfolioCard[] }) {
  return (
    <Section tone="white" labelledBy="portfolio-preview-heading">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="portfolio-preview-heading"
            title="Projects"
            lead="Examples of the kind of work we carry out."
          />
          <ButtonLink
            href="/portfolio"
            variant="secondary"
            className="shrink-0 self-start sm:self-auto"
          >
            View portfolio
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
      <p className="font-semibold text-navy-800">
        Examples of our work are being prepared
      </p>
      <p className="mx-auto mt-3 max-w-md text-charcoal-600">
        We are preparing examples of completed work to publish here. In the
        meantime, please get in touch and we will happily discuss your
        requirements.
      </p>
      <ButtonLink href="/request-service" className="mt-6">
        Request a Service
      </ButtonLink>
    </div>
  );
}
