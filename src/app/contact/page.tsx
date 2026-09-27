import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";

import { ContactChannels } from "@/components/contact/ContactChannels";
import { ContactForm } from "@/components/forms/ContactForm";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/ui/Breadcrumbs";
import { buttonStyles } from "@/components/ui/Button";
import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { services } from "@/content/services";
import { getContactDetails, getWhatsAppLink } from "@/content/site";
import { getPublicEnv } from "@/lib/env";

/**
 * The contact page.
 *
 * TWO ROUTES TO THE SAME PLACE, DELIBERATELY
 * ------------------------------------------
 * `/contact` is for someone who has a question. `/request-service` is for
 * someone who wants work done, and asks for more: a location, a preferred
 * contact method, and the option to attach a photo. Merging them would mean
 * either making the general enquiry form as long as the request form, or
 * making the request form too thin to be useful.
 *
 * The two are cross-linked in both directions, so someone who starts in the
 * wrong one is a click from the right one.
 *
 * WHY THE PHONE NUMBER APPEARS IN THE HEADING AREA
 * ------------------------------------------------
 * A phone call is frequently the fastest way to resolve a technical problem, and
 * the people most likely to need this page are the people least willing to fill
 * in a form. The call to action sits above the form, not below it, so it is the
 * first thing seen rather than a fallback at the end.
 */

export const metadata: Metadata = {
  // Bare, because the root layout's `title.template` appends the brand.
  title: "Contact",
  description:
    "Get in touch with CHIBOY TECHNOLOGIES. Send a message using the form, or reach us by phone, WhatsApp or email during business hours.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | CHIBOY TECHNOLOGIES",
    description:
      "Send us a message, or reach us by phone, WhatsApp or email during business hours.",
    url: "/contact",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact | CHIBOY TECHNOLOGIES",
    description:
      "Send us a message, or reach us by phone, WhatsApp or email during business hours.",
  },
};

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Contact" },
];

export default function ContactPage() {
  const contact = getContactDetails();
  const whatsappHref = getWhatsAppLink();
  const { siteUrl } = getPublicEnv();

  return (
    <>
      <script
        type="application/ld+json"
        // No `mainEntity` here. The root layout already emits the
        // `LocalBusiness` with the real, configured contact details; a second
        // copy of the same organisation on this page would be two competing
        // descriptions of one entity, and a worse one if the two ever drift.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact CHIBOY TECHNOLOGIES",
            url: `${siteUrl}/contact`,
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
          <SectionHeading
            as="h1"
            eyebrow="Contact"
            title="Get in touch"
            lead="Ask a question, describe a problem, or ask for a quotation. Whichever route you take, you are writing to the same people."
          />

          {/* The fastest routes, promoted above the fold and above the form. */}
          {contact.isPhonePlaceholder ? null : (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles({ variant: "accent", size: "lg" })}
                >
                  <MessageCircle className="size-5" aria-hidden="true" />
                  Message on WhatsApp
                </a>
              ) : null}

              <a
                href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                className={buttonStyles({ variant: "primary", size: "lg" })}
              >
                <Phone className="size-5" aria-hidden="true" />
                Call {contact.phone}
              </a>
            </div>
          )}

          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <h2 className="text-2xl font-bold text-navy-900">Send us a message</h2>
              <p className="mt-2 mb-8 leading-relaxed text-charcoal-600">
                Use this for anything that does not need an appointment — a question
                about a service, a request for a quotation, or a description of a
                problem you would like looked at.
              </p>

              <ContactForm />

              <noscript>
                <p className="mt-6 rounded-lg border border-gold-600/40 bg-gold-500/10 p-4 text-sm leading-relaxed text-gold-700">
                  This form needs JavaScript to submit. The phone number, WhatsApp
                  number and email address above all reach us directly, and are the
                  faster route if you are in a hurry.
                </p>
              </noscript>
            </div>

            <aside className="lg:pt-2">
              <div className="lg:sticky lg:top-28">
                <ContactChannels headingLevel="h2" heading="Where to find us" />

                <div className="mt-10 border-t border-charcoal-200 pt-8">
                  <h2 className="text-xl font-bold text-navy-900">
                    Looking for something specific?
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
                    If you already know what you need, the service request form asks
                    for more detail and lets you attach a photo.
                  </p>
                  <Link
                    href="/request-service"
                    className={buttonStyles({ variant: "primary", className: "mt-4" })}
                  >
                    Request a Service
                  </Link>

                  <ul className="mt-6 space-y-2.5 text-sm">
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
