import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import {
  PortfolioPreview,
  ServicesPreview,
  TrustSection,
} from "@/components/sections/HomeSections";
import { CtaBand } from "@/components/layout/Footer";
import { getPublishedProjects } from "@/lib/portfolio";
import { SHOW_PORTFOLIO } from "@/lib/features";
import { getServiceArea, site } from "@/content/site";
import { services } from "@/content/services";

/**
 * Homepage.
 *
 * The portfolio preview is gated behind `SHOW_PORTFOLIO`. While it is off the
 * page reads no database and is served from the prerender; when it is on the
 * page is rendered at request time with a revalidation window, so a newly added
 * project appears without a redeploy.
 */

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: "/",
    type: "website",
  },
};

export const revalidate = 3600;

export default async function HomePage() {
  // Read only while the section is shown. The flag is a constant, so when it is
  // off this is an empty list and the page touches no database at all.
  const projects = SHOW_PORTFOLIO ? await getPublishedProjects(3) : [];
  const serviceArea = getServiceArea();

  return (
    <>
      <Hero />
      <TrustSection />
      <ServicesPreview />
      {SHOW_PORTFOLIO ? <PortfolioPreview projects={projects} /> : null}

      {/* Service names in structured data, derived from the same source as the
          visible cards so the two can never disagree. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            name: site.name,
            description: site.description,
            // Omitted entirely while the service area is unconfirmed. Emitting
            // a placeholder string here would put a literal "[PLACEHOLDER:
            // service area]" into structured data, which search engines would
            // read as the business's actual service area.
            ...(serviceArea ? { areaServed: serviceArea } : {}),
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: "Technology services",
              itemListElement: services.map((service) => ({
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: service.name,
                  description: service.cardDescription,
                  url: `/services/${service.slug}`,
                },
              })),
            },
          }),
        }}
      />

      <CtaBand />
    </>
  );
}
