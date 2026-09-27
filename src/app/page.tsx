import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import {
  PortfolioPreview,
  ServicesPreview,
  TrustSection,
} from "@/components/sections/HomeSections";
import { CtaBand } from "@/components/layout/Footer";
import { getPublishedProjects } from "@/lib/portfolio";
import { site } from "@/content/site";
import { services } from "@/content/services";

/**
 * Homepage.
 *
 * Rendered at request time rather than fully static because it queries the
 * portfolio. The `revalidate` window means it is still served from cache and
 * regenerated in the background, so it stays fast while a newly added project
 * appears without a redeploy.
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
  // Three preview cards is enough to establish that work is shown without
  // turning the homepage into a second portfolio page.
  const projects = await getPublishedProjects(3);

  return (
    <>
      <Hero />
      <TrustSection />
      <ServicesPreview />
      <PortfolioPreview projects={projects} />

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
            areaServed: "[PLACEHOLDER: service area]",
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
