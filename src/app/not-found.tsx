import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Home, LifeBuoy, Wrench } from "lucide-react";
import { Container } from "@/components/ui/Layout";
import { ButtonLink } from "@/components/ui/Button";
import { services } from "@/content/services";

/**
 * Not found page.
 *
 * A visitor landing here typed or followed a bad link, so the page's job is to
 * get them somewhere useful in one click rather than to explain what happened.
 * Without this, Next.js serves an unstyled white page with no navigation.
 *
 * `robots: index: false` keeps 404 responses out of search results.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <section className="bg-navy-900">
        <Container className="py-16 sm:py-20">
          <p className="text-sm font-semibold tracking-wider text-gold-400 uppercase">
            Error 404
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-charcoal-300">
            The page may have moved, or the address may have been typed
            incorrectly. The links below will get you back on track.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/" variant="accent" size="lg">
              <Home className="size-4" aria-hidden="true" />
              Back to home
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghostDark" size="lg">
              Contact us
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section className="bg-white" aria-labelledby="not-found-suggestions">
        <Container className="py-14 sm:py-16">
          <h2 id="not-found-suggestions" className="text-2xl font-bold text-navy-900">
            Popular destinations
          </h2>

          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex h-full flex-col rounded-[var(--radius-card)] border border-charcoal-200 bg-white p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600"
                >
                  <span
                    aria-hidden="true"
                    className="inline-grid size-11 place-items-center rounded-lg bg-navy-50 text-navy-700 transition-colors group-hover:bg-navy-900 group-hover:text-gold-400"
                  >
                    <item.icon className="size-5" />
                  </span>

                  <span className="mt-4 text-lg font-semibold text-navy-900">
                    {item.label}
                  </span>
                  <span className="mt-2 flex-1 text-sm leading-relaxed text-charcoal-600">
                    {item.body}
                  </span>

                  <span
                    aria-hidden="true"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 transition-colors group-hover:text-navy-900"
                  >
                    Go there
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-12">
            <h2 className="text-lg font-semibold text-navy-900">Our services</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-charcoal-200 bg-white px-4 text-sm font-medium text-navy-800 transition-colors hover:border-navy-300 hover:bg-navy-50"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}

/** Kept out of the component so the page body reads as structure, not data. */
const suggestions = [
  {
    href: "/services",
    label: "Our services",
    body: "Software maintenance, installation, networking, design, sales and consultancy.",
    icon: Wrench,
  },
  {
    href: "/request-service",
    label: "Request a service",
    body: "Tell us what you need and we will come back to you with next steps.",
    icon: LifeBuoy,
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    body: "Examples of the kind of work we carry out.",
    icon: Compass,
  },
] as const;
