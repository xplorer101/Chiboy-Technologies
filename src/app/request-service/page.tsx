import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";

import { ContactChannels } from "@/components/contact/ContactChannels";
import { ServiceRequestForm } from "@/components/forms/ServiceRequestForm";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/ui/Breadcrumbs";
import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { services } from "@/content/services";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import { acceptedFileTypes } from "@/lib/upload/detect";
import { MAX_ATTACHMENTS } from "@/lib/upload/storage";

/**
 * The service request page.
 *
 * THE ONLY FORM THAT TAKES ATTACHMENTS
 * -----------------------------------
 * A request is the one route that lets a visitor show rather than tell, so it
 * carries a file picker, a location field and a contact preference — a phone
 * call is usually the fastest way to resolve a technical problem, and the form
 * says so rather than assuming email.
 *
 * WHY THE PAGE IS STATIC
 * ----------------------
 * The service dropdown is built from `src/content/services.ts`, and the form
 * sends the slug, not a database id. So nothing here reads the database, the
 * route prerenders, and the form still works if the database is briefly
 * unreachable — the submission fails with a clear message instead of the page
 * itself being unavailable.
 *
 * WHY THE FORM IS A MAJORITY OF THE PAGE
 * ---------------------------------------
 * On a small screen the form is the first thing below the heading. A visitor who
 * arrived from a service page's own button has already decided; making them
 * scroll past a sales pitch to reach the form is a pointless obstacle.
 */

export const metadata: Metadata = {
  // Bare, because the root layout's `title.template` appends the brand.
  title: "Request a Service",
  description:
    "Tell CHIBOY TECHNOLOGIES what you need. Describe the problem, say where the work is needed, and attach a photo if it helps — we will contact you by phone, WhatsApp or email.",
  alternates: { canonical: "/request-service" },
  openGraph: {
    title: "Request a Service | CHIBOY TECHNOLOGIES",
    description:
      "Describe the job or the problem, and attach a photo if it helps. We will contact you by phone, WhatsApp or email.",
    url: "/request-service",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Request a Service | CHIBOY TECHNOLOGIES",
    description:
      "Describe the job or the problem, and attach a photo if it helps. We will contact you by phone, WhatsApp or email.",
  },
};

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Request a Service" },
];

type PageProps = {
  /** `?service=networking` preselects a service when arriving from its page. */
  searchParams: Promise<{ service?: string | string[] | undefined }>;
};

export default async function RequestServicePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preselected = preselectService(params.service);

  const env = getServerEnv();
  const { siteUrl } = getPublicEnv();
  // The page's `accept` attribute and the on-page explanation are both derived
  // from the same allowlist the server enforces, so the two cannot disagree
  // about what is uploadable.
  const accept = acceptedFileTypes()
    .map((type) => type.mime)
    .join(",");

  return (
    <>
      <script
        type="application/ld+json"
        // Breadcrumbs only. The organisation itself is the `LocalBusiness` the
        // root layout already emits, and repeating it here would describe the
        // same business twice in two slightly different ways.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Request a Service",
            url: `${siteUrl}/request-service`,
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />

      <Section tone="muted" size="compact">
        <Container>
          <Breadcrumbs items={crumbs} />
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <SectionHeading
                as="h1"
                eyebrow="Request a Service"
                title="Tell us what you need"
                lead="The more you tell us about the problem, the faster we can help — and a photo of a screen or a fault often says more than a description."
              />

              <p className="mt-6 flex items-start gap-2.5 rounded-lg border border-navy-200 bg-navy-50 p-4 text-sm leading-relaxed text-navy-900">
                <Info className="mt-0.5 size-4.5 shrink-0 text-navy-600" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">Not sure which service you need?</strong>{" "}
                  Leave the service blank and describe the problem instead. We would rather
                  read your description than have you guess and be wrong.
                </span>
              </p>

              <div className="mt-8">
                <ServiceRequestForm
                  services={services.map((service) => ({
                    id: service.slug,
                    name: service.name,
                  }))}
                  maxFiles={MAX_ATTACHMENTS}
                  maxMb={env.MAX_UPLOAD_MB}
                  accept={accept}
                  preselectedService={preselected}
                />
              </div>
            </div>

            <aside className="lg:pt-2">
              <div className="lg:sticky lg:top-28">
                <ContactChannels heading="Prefer to talk?" />

                <div className="mt-10 border-t border-charcoal-200 pt-8">
                  <h2 className="text-xl font-bold text-navy-900">Or pick a service</h2>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
                    Each page explains what is included and what it costs to work
                    through.
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm">
                    {services.map((service) => (
                      <li key={service.slug}>
                        <Link
                          href={`/services/${service.slug}`}
                          className="text-navy-800 underline decoration-charcoal-300 underline-offset-2 transition-colors hover:text-navy-600 hover:decoration-navy-400"
                        >
                          {service.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}

/**
 * Accepts a `?service=` value only if it names a service this site publishes.
 *
 * An unrecognised value is discarded rather than passed through. The value ends
 * up in a `<select>` and is checked again on the server, so an arbitrary string
 * could not do much — but the preselect is a presentation nicety, and there is
 * no reason for the page to render a selected option that resolves to nothing.
 */
function preselectService(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return undefined;
  return services.some((service) => service.slug === candidate) ? candidate : undefined;
}
