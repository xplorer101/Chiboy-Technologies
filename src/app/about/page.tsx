import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/ui/Breadcrumbs";
import { TrustIcon } from "@/components/ui/Card";
import { ButtonLink, buttonStyles } from "@/components/ui/Button";
import { ServiceCard } from "@/components/services/ServiceCard";
import { CtaBand } from "@/components/layout/Footer";

import { services } from "@/content/services";
import {
  aboutPage,
  approachSteps,
  getExperienceStatement,
  getServiceArea,
  getWhatsAppLink,
  site,
  trustPoints,
} from "@/content/site";

/**
 * About page.
 *
 * Assembled entirely from the content layer — `aboutPage`, `approachSteps`,
 * `trustPoints` and the service catalogue — so the page cannot state anything
 * the rest of the site does not also state, and adding a service updates this
 * page automatically.
 *
 * The page deliberately makes no claim it cannot substantiate. There is no
 * founding story, no team size, no client list and no testimonial, because none
 * has been supplied. What it does say is what the business does, how it works,
 * and what a customer can expect. See the note on `aboutPage` in
 * `src/content/site.ts`.
 */

/** Static content; the service list is baked in at build time. */
export const revalidate = 3600;

export const metadata: Metadata = {
  // Bare, because the root layout's `title.template` appends the brand.
  title: aboutPage.meta.title,
  description: aboutPage.meta.description,
  alternates: { canonical: "/about" },
  openGraph: {
    // Open Graph and Twitter cards are not templated, so they carry the full
    // title explicitly.
    title: `${aboutPage.meta.title} | ${site.name}`,
    description: aboutPage.meta.description,
    url: "/about",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${aboutPage.meta.title} | ${site.name}`,
    description: aboutPage.meta.description,
  },
};

const crumbs = [
  { label: "Home", href: "/" },
  { label: "About" },
];

export default function AboutPage() {
  const serviceArea = getServiceArea();
  const whatsappHref = getWhatsAppLink(
    "Hello CHIBOY TECHNOLOGIES, I would like to know more about your services.",
  );

  return (
    <>
      <script
        type="application/ld+json"
        // Breadcrumbs only. An `AboutPage` schema with no author, publisher or
        // founding date would be a set of empty fields dressed up as structured
        // data; the business facts it would carry are already on the homepage as
        // `LocalBusiness`.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />

      {/* ---- Header ---- */}
      <section className="bg-navy-900">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs items={crumbs} tone="dark" className="mb-6" />

          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-wider text-gold-400 uppercase">
              About us
            </p>
            {/* The heading names the page. The experience statement is the
                strongest line on it, but a heading that says what the page is
                beats one that says something quotable about the business — and
                a screen reader jumping by heading lands somewhere meaningful
                either way. */}
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {/* One text node, not `About {site.name}`. React separates adjacent
                  expressions with a comment marker, which leaves the heading as
                  two nodes in the served HTML — harmless to a screen reader, but
                  sloppy for anything scraping the text. */}
              {`About ${site.name}`}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-charcoal-300">
              {aboutPage.purpose}
            </p>

            <p className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1.5 text-sm font-semibold text-gold-300">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-gold-400" />
              {getExperienceStatement()}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/request-service" variant="accent" size="lg">
                Request a Service
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/services" variant="ghostDark" size="lg">
                See what we do
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* ---- What we do, and why ---- */}
      <Section tone="white">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">
                What we do
              </h2>
              <p className="mt-4 leading-relaxed text-charcoal-700">
                {aboutPage.rationale}
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">
                What to expect
              </h2>
              <ul className="mt-6 space-y-4">
                {aboutPage.commitments.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-grid size-5 shrink-0 place-items-center rounded-full bg-navy-50"
                    >
                      <Check className="size-3.5 text-navy-700" strokeWidth={3} />
                    </span>
                    <span>
                      <span className="font-semibold text-navy-900">{item.title}.</span>{" "}
                      <span className="leading-relaxed text-charcoal-700">
                        {item.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---- The six services ---- */}
      <Section tone="muted">
        <Container>
          <SectionHeading
            title="Our services"
            lead="Six areas of technology work. Each has its own page describing the problems it solves and what is included."
          />

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </ul>
        </Container>
      </Section>

      {/* ---- How we work ---- */}
      <Section tone="white">
        <Container>
          <SectionHeading
            title="How we work"
            lead="The same six steps apply to every service, whatever the size of the job."
          />

          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {approachSteps.map((step, index) => (
              <li key={step.title} className="relative">
                <span
                  aria-hidden="true"
                  className="inline-grid size-9 place-items-center rounded-full bg-navy-900 text-sm font-bold text-gold-400"
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-navy-900">
                  {/* The number above is decorative; the step order is carried by
                      the list semantics, so it is not announced twice. */}
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ---- Why choose us ---- */}
      <Section tone="muted">
        <Container>
          <SectionHeading
            title="Why work with us"
            lead="Four things we aim to be consistent about."
          />

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map((point) => (
              <li
                key={point.title}
                className="rounded-xl border border-navy-100 bg-white p-6 shadow-[var(--shadow-card)]"
              >
                <span
                  aria-hidden="true"
                  className="inline-grid size-11 place-items-center rounded-lg bg-navy-50"
                >
                  <TrustIcon name={point.icon} className="size-5 text-navy-700" />
                </span>
                <h3 className="mt-4 font-semibold text-navy-900">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ---- Getting in touch ---- */}
      <Section tone="white" size="compact">
        <Container>
          <div className="grid gap-8 rounded-2xl bg-navy-50 p-8 sm:p-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <h2 className="text-2xl font-bold text-navy-900">
                Talk to us about your situation
              </h2>
              <p className="mt-3 leading-relaxed text-charcoal-700">
                If you are not sure which service you need, describe the problem
                and we will point you at the right one.
              </p>

              {serviceArea ? (
                <p className="mt-5 text-sm text-charcoal-600">
                  <span className="font-semibold text-navy-900">
                    Service area:
                  </span>{" "}
                  {serviceArea}
                </p>
              ) : null}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/contact" variant="primary">
                  Contact details
                  <ArrowRight className="size-4" aria-hidden="true" />
                </ButtonLink>
                {whatsappHref ? (
                  /* `wa.me` leaves the site, so it is an anchor rather than a
                     router link, and it opens safely. */
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonStyles({ variant: "secondary" })}
                  >
                    WhatsApp us
                  </a>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col justify-center gap-3">
              <p className="text-sm font-semibold tracking-wider text-charcoal-500 uppercase">
                In a hurry
              </p>
              <p className="text-charcoal-700">
                Every service page lists the problems it solves, so you can
                probably self-diagnose before you call.
              </p>
              <Link
                href="/services"
                className="mt-1 inline-flex items-center gap-1.5 font-semibold text-navy-800 underline decoration-gold-500 decoration-2 underline-offset-4 hover:text-navy-950"
              >
                Browse all services
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      <CtaBand />
    </>
  );
}
