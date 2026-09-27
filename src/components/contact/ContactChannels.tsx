import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { buttonStyles } from "@/components/ui/Button";
import { PlaceholderValue } from "@/components/ui/Field";
import {
  defaultWhatsAppMessage,
  getContactDetails,
  getEmailLink,
  getMapsLink,
  getPhoneLink,
  getWhatsAppLink,
} from "@/content/site";

/**
 * The business contact details, as a first-class block on both form pages.
 *
 * WHY THIS IS CONTENT AND NOT A FOOTER
 * ------------------------------------
 * Because the forms need JavaScript. A visitor with scripting disabled cannot
 * submit either form, and the footer's small print is not a reliable route out
 * of that situation — the point of this block is that there is always a working
 * way to reach the business, presented as part of the page rather than as an
 * afterthought at the bottom.
 *
 * The order is deliberate: the two channels that need no network round trip and
 * no third-party service — a phone call and an email — come before WhatsApp and
 * the map, which both depend on something else working.
 */
export function ContactChannels({
  heading = "Reach us directly",
  headingLevel: Heading = "h2",
  className,
}: {
  heading?: string;
  /** Match the surrounding document's heading order. */
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  const contact = getContactDetails();

  return (
    <div className={className}>
      <Heading className="text-xl font-bold text-navy-900">{heading}</Heading>
      <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
        If a form is not the easiest route for you, any of these reach the same
        people.
      </p>

      <ul className="mt-6 space-y-5">
        <Channel
          icon={Phone}
          label="Phone"
          value={contact.phone}
          isPlaceholder={contact.isPhonePlaceholder}
          href={getPhoneLink()}
        />
        <Channel
          icon={MessageCircle}
          label="WhatsApp"
          value={contact.whatsapp}
          isPlaceholder={contact.isWhatsappPlaceholder}
          href={getWhatsAppLink(defaultWhatsAppMessage)}
          external
          action="Message on WhatsApp"
        />
        <Channel
          icon={Mail}
          label="Email"
          value={contact.email}
          isPlaceholder={contact.isEmailPlaceholder}
          href={getEmailLink()}
        />
        <Channel
          icon={MapPin}
          label="Office"
          value={contact.location}
          isPlaceholder={contact.isLocationPlaceholder}
          href={getMapsLink()}
          external
        />
        <Channel icon={Clock} label="Opening hours" value={contact.hours} isPlaceholder={contact.isHoursPlaceholder} />
      </ul>
    </div>
  );
}

function Channel({
  icon: Icon,
  label,
  value,
  isPlaceholder,
  href,
  external = false,
  action,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  isPlaceholder: boolean;
  /** Null when the value is a placeholder, or no safe link could be built. */
  href?: string | null;
  external?: boolean;
  /** Verb for the explicit call-to-action link, where the value itself is long. */
  action?: string;
}) {
  return (
    <li className="flex items-start gap-3.5">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-50">
        <Icon className="size-4.5 text-navy-700" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy-900">{label}</p>

        {isPlaceholder ? (
          <PlaceholderValue value={value} isPlaceholder className="mt-0.5 block text-sm" />
        ) : href ? (
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="mt-0.5 block break-anywhere text-sm text-charcoal-800 underline decoration-charcoal-300 underline-offset-2 transition-colors hover:text-navy-700 hover:decoration-navy-400"
          >
            {value}
            {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
          </a>
        ) : (
          <p className="mt-0.5 break-anywhere text-sm text-charcoal-800">{value}</p>
        )}

        {action && !isPlaceholder && href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles({
              variant: "secondary",
              size: "sm",
              className: "mt-2.5",
            })}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {action}
          </a>
        ) : null}
      </div>
    </li>
  );
}
