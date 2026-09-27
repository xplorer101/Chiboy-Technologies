import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Emblem } from "@/components/brand/Emblem";
import { ButtonLink } from "@/components/ui/Button";
import { PlaceholderValue } from "@/components/ui/Field";
import {
  getContactDetails,
  getEmailLink,
  getMapsLink,
  getPhoneLink,
  getWhatsAppLink,
  navigation,
  site,
} from "@/content/site";
import { services } from "@/content/services";

/**
 * Site footer. Renders on every page and links to every top-level destination,
 * which supports both navigation and crawlability.
 */
export function Footer() {
  const contact = getContactDetails();
  const whatsappHref = getWhatsAppLink();

  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-950 text-charcoal-300">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <Emblem className="size-10 shrink-0" />
              <p className="text-base font-bold tracking-tight text-white">
                CHIBOY
                <span className="block font-semibold text-gold-400">TECHNOLOGIES</span>
              </p>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Practical technology solutions for individuals and businesses — software,
              computers, networking, design, sales and consultancy.
            </p>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer">
            <h2 className="text-sm font-semibold tracking-wider text-white uppercase">
              Company
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {navigation.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-gold-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/request-service"
                  className="transition-colors hover:text-gold-400"
                >
                  Request a Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-gold-400">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </nav>

          {/* Services */}
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-white uppercase">
              Services
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="transition-colors hover:text-gold-400"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-white uppercase">
              Contact
            </h2>

            <ul className="mt-4 space-y-3.5 text-sm">
              <ContactRow icon={Phone} label="Phone">
                {contact.isPhonePlaceholder ? (
                  <PlaceholderValue value={contact.phone} isPlaceholder />
                ) : (
                  <FooterLink href={getPhoneLink()}>{contact.phone}</FooterLink>
                )}
              </ContactRow>

              <ContactRow icon={MessageCircle} label="WhatsApp">
                {contact.isWhatsappPlaceholder ? (
                  <PlaceholderValue value={contact.whatsapp} isPlaceholder />
                ) : (
                  <FooterLink href={getWhatsAppLink()} external>
                    {contact.whatsapp}
                  </FooterLink>
                )}
              </ContactRow>

              <ContactRow icon={Mail} label="Email">
                {contact.isEmailPlaceholder ? (
                  <PlaceholderValue value={contact.email} isPlaceholder />
                ) : (
                  <FooterLink href={getEmailLink()}>{contact.email}</FooterLink>
                )}
              </ContactRow>

              <ContactRow icon={MapPin} label="Location">
                {contact.isLocationPlaceholder ? (
                  <PlaceholderValue value={contact.location} isPlaceholder />
                ) : (
                  <FooterLink href={getMapsLink()} external>
                    {contact.location}
                  </FooterLink>
                )}
              </ContactRow>

              <ContactRow icon={Clock} label="Hours">
                <PlaceholderValue
                  value={contact.hours}
                  isPlaceholder={contact.isHoursPlaceholder}
                />
              </ContactRow>
            </ul>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Chat on WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {site.name}. All rights reserved.
          </p>

          {/* Service area is still unconfirmed, so it is labelled as pending
              rather than implying the office address is the whole coverage
              area. */}
          <p className="flex items-center gap-1.5 text-charcoal-400">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {contact.isLocationPlaceholder ? (
              <PlaceholderValue value={contact.location} isPlaceholder />
            ) : (
              <FooterLink href={getMapsLink()} external>
                {contact.location}
              </FooterLink>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-gold-500" aria-hidden="true" />
      <span className="min-w-0">
        <span className="sr-only">{label}: </span>
        {children}
      </span>
    </li>
  );
}

/**
 * A contact value that is a real, actionable link.
 *
 * `href` is nullable by design: if a value is present but a link could not be
 * built safely (an implausible phone number, an address-less email), the text
 * still renders as plain text rather than a broken link. External links carry
 * `rel="noopener noreferrer"`, and the underline is always visible so they are
 * distinguishable from static text without relying on colour alone.
 */
function FooterLink({
  href,
  children,
  external = false,
}: {
  href: string | null;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (!href) {
    return <span className="text-charcoal-300">{children}</span>;
  }

  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="rounded text-charcoal-300 underline decoration-charcoal-500 underline-offset-2 transition-colors hover:text-gold-400 hover:decoration-gold-400"
    >
      {children}
    </a>
  );
}

/**
 * Call-to-action band. Repeated above the footer so the primary conversion is
 * reachable from the bottom of every page.
 */
export function CtaBand() {
  const contact = getContactDetails();
  const whatsappHref = getWhatsAppLink();

  return (
    <section aria-labelledby="cta-band-heading" className="bg-navy-900">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2
              id="cta-band-heading"
              className="text-2xl font-bold text-white sm:text-3xl"
            >
              Tell us what you need help with.
            </h2>
            <p className="mt-3 leading-relaxed text-charcoal-300">
              Describe the problem or the project and we will get back to you. You can
              send the details through the form, or reach us directly on WhatsApp.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col xl:flex-row">
            <ButtonLink href="/request-service" variant="accent" size="lg" className="w-full sm:w-auto">
              Request a Service
            </ButtonLink>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/25 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
                WhatsApp
              </a>
            ) : (
              <span className="text-sm text-charcoal-400">
                <PlaceholderValue
                  value={contact.whatsapp}
                  isPlaceholder={contact.isWhatsappPlaceholder}
                />
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
