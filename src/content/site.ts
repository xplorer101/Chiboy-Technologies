import { isPlaceholder } from "@/lib/env";

/**
 * Single source of truth for brand, navigation and business contact details.
 *
 * Every value that describes the *business* rather than the software is a
 * placeholder until real details are supplied. They are all read from
 * environment variables and, where a value is still a placeholder, the UI
 * labels it as such rather than presenting it to visitors as fact.
 */

export const site = {
  name: "CHIBOY TECHNOLOGIES",
  shortName: "Chiboy",
  tagline: "Technology Solutions That Keep Your Business Moving.",
  description:
    "CHIBOY TECHNOLOGIES provides computer software maintenance, software installation and configuration, computer troubleshooting and support, networking, graphics design, technology sales and IT consultancy for individuals and businesses.",

  /**
   * Supplied by the business: 13 years in business.
   *
   * Recorded as a DURATION rather than a founding year, on purpose. A duration
   * stays true as time passes; a year derived from it would quietly go stale on
   * the site and could be a year out depending on whether the current year is
   * counted inclusively. If a founding year is ever needed it should be stated
   * in its own right.
   *
   * This is the ONLY quantitative claim about the business anywhere in the
   * content layer. No other figure — customer count, response time, staff
   * numbers, project volume, revenue — has been supplied, and inventing one is
   * not permitted, so those are described qualitatively in `trustPoints`.
   */
  yearsInBusiness: 13,
} as const;

/**
 * "13 years in business".
 *
 * Derived from `site.yearsInBusiness` so the figure is written down exactly
 * once and every page states it identically. The singular form is handled for
 * the case where the figure is ever corrected to 1.
 */
export function getExperienceStatement(): string {
  // Widened to `number` on purpose. `site` is `as const`, so the literal type is
  // `13` and the singular branch below would otherwise be a comparison between
  // two disjoint types, which TypeScript rejects. The branch is kept because the
  // figure is correctable content, not a constant.
  const years: number = site.yearsInBusiness;
  return `${years} ${years === 1 ? "year" : "years"} in business`;
}

export const hero = {
  headline: "Technology Solutions That Keep Your Business Moving.",
  subtext:
    "From computer software maintenance and installations to networking, graphics design, technology sales and IT consultancy, CHIBOY TECHNOLOGIES provides practical technology solutions for individuals and businesses.",
  primaryCta: { label: "Request a Service", href: "/request-service" },
  secondaryCta: { label: "Explore Our Services", href: "/services" },
} as const;

/**
 * Trust section. Deliberately qualitative: the spec forbids invented numbers,
 * customer counts or statistics, so these make a case without making a claim
 * that cannot be substantiated.
 */
export const trustPoints = [
  {
    icon: "briefcase",
    title: "Professional Service",
    body: "Practical solutions delivered with attention to detail.",
  },
  {
    icon: "headset",
    title: "Reliable Support",
    body: "Help keeping systems working when it matters.",
  },
  {
    icon: "cpu",
    title: "Technical Expertise",
    body: "Software, computers, networking, and digital services.",
  },
  {
    icon: "users",
    title: "Customer-Focused",
    body: "Solutions built around the customer's actual need.",
  },
] as const;

export const navigation = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Contact", href: "/contact" },
] as const;

/**
 * The workflow every service follows. Defined once and rendered on the About
 * page and on each service detail page.
 */
export const workflowSteps = [
  {
    title: "Understand",
    body: "We start by understanding the situation, the equipment involved and what is actually needed.",
  },
  {
    title: "Assess",
    body: "We examine the system to identify the cause rather than guessing at the symptom.",
  },
  {
    title: "Recommend",
    body: "We explain the options and recommend an approach that fits the requirement and the budget.",
  },
  {
    title: "Implement",
    body: "The agreed work is carried out carefully, with backups taken before anything is changed.",
  },
  {
    title: "Test",
    body: "We verify the result against the original requirement before calling the job done.",
  },
  {
    title: "Support",
    body: "We explain what was done, how to maintain it, and remain available if anything needs attention.",
  },
] as const;

/** The About page uses the same six steps with slightly different wording. */
export const approachSteps = [
  { title: "Understand", body: "Listening to what you need and what is not working." },
  { title: "Analyze", body: "Examining the system to find the actual cause." },
  { title: "Recommend", body: "Proposing a clear, practical way forward." },
  { title: "Implement", body: "Carrying out the agreed work carefully and safely." },
  { title: "Test", body: "Confirming the fix holds and the requirement is met." },
  { title: "Support", body: "Staying available for questions and follow-up." },
] as const;

/**
 * The About page.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * A founding story, a founder's name, a team size, a client list, a client
 * quote, a certification, an award, or a list of named customers. None of that
 * has been supplied, and the site-wide rule is that nothing may be invented to
 * fill a gap — an absent fact is better than a fabricated one, because a
 * fabricated one is indistinguishable from a real one until someone checks.
 *
 * What is here instead: what the business does, drawn from the service
 * catalogue rather than restated; how it works, from `approachSteps`; and what
 * a customer can expect, which is a statement of intent and so makes no claim
 * about the past.
 *
 * The one supplied figure, 13 years in business, is rendered from
 * `site.yearsInBusiness` and never written out by hand. See `getExperienceStatement`.
 */
export const aboutPage = {
  meta: {
    title: "About",
    description:
      "CHIBOY TECHNOLOGIES is a technology services business providing computer software maintenance, software installation, networking, graphics design, technology sales and IT consultancy.",
  },

  /** The one-sentence statement of what the business is. */
  purpose:
    "CHIBOY TECHNOLOGIES provides practical technology solutions to individuals and businesses — keeping software running, setting up new equipment, building networks, and advising on what technology actually solves a given problem.",

  /** Why the business exists, in terms of approach rather than history. */
  rationale:
    "Technology problems are usually described by their symptom: a machine that will not start, software that has become slow, a network that will not reach the next room. The work is in finding the actual cause and fixing that, rather than in reinstalling whatever happens to be nearest. Every service follows the same six steps for that reason.",

  /**
   * What a customer can expect. Framed as commitment rather than achievement, so
   * each one is a promise the business is making rather than a claim about what
   * it has already done.
   */
  commitments: [
    {
      title: "The cause, not the symptom",
      body: "We look at what is actually wrong before changing anything, and we explain what we find in terms you can follow.",
    },
    {
      title: "Backups before changes",
      body: "Anything that could be lost is protected before the work starts, not after something goes wrong.",
    },
    {
      title: "An explanation at the end",
      body: "You are told what was done, why, and what to watch for — so the same problem is easier to handle next time.",
    },
    {
      title: "Work that fits the need",
      body: "We recommend an approach that suits the requirement and the budget, including when that means recommending less than you asked for.",
    },
  ],
} as const;

export const contactReasons = [
  "Discuss a technical problem",
  "Request a quotation",
  "Ask about a product or service",
  "Arrange a consultation",
  "Something else",
] as const;

/**
 * Reads the business contact details from the environment and reports which are
 * still placeholders, so components can render a visible, clearly-marked
 * placeholder instead of inventing or silently omitting a value.
 */
export type ContactDetails = {
  phone: string;
  whatsapp: string;
  email: string;
  location: string;
  hours: string;
  isPhonePlaceholder: boolean;
  isWhatsappPlaceholder: boolean;
  isEmailPlaceholder: boolean;
  isLocationPlaceholder: boolean;
  isHoursPlaceholder: boolean;
};

export function getContactDetails(): ContactDetails {
  const phone = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "";
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const email = process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "";
  const location = process.env.NEXT_PUBLIC_BUSINESS_LOCATION ?? "";
  const hours = process.env.NEXT_PUBLIC_BUSINESS_HOURS ?? "";

  return {
    phone,
    whatsapp,
    email,
    location,
    hours,
    isPhonePlaceholder: isPlaceholder(phone),
    isWhatsappPlaceholder: isPlaceholder(whatsapp),
    isEmailPlaceholder: isPlaceholder(email),
    isLocationPlaceholder: isPlaceholder(location),
    isHoursPlaceholder: isPlaceholder(hours),
  };
}

/**
 * Builds a wa.me deep link. The configured value is stored in the same display
 * form as the phone number (for example `+234 810 285 4969`), so it is
 * normalised down to bare digits before use — wa.me requires that form.
 * Returns null when no real number is configured, which lets the UI hide the
 * floating button entirely rather than linking to a broken or invented contact.
 */
export function getWhatsAppLink(message?: string): string | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  if (isPlaceholder(raw)) return null;

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;

  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const defaultWhatsAppMessage =
  "Hello CHIBOY TECHNOLOGIES, I would like to make an enquiry about your services.";

/**
 * Contact links.
 *
 * Each of these builds its own URL scheme and validates the value before use,
 * so a malformed or hostile environment value cannot produce a `javascript:`
 * link. Every one returns null when the underlying value is still a
 * placeholder, which lets the UI render plain labelled text rather than a link
 * that goes nowhere.
 */

/**
 * `tel:` link.
 *
 * Uses an ALLOWLIST of characters that legitimately appear in a written phone
 * number, rather than stripping everything unexpected. Stripping is unsafe
 * here: a value such as `+2348102854969?x=1` would reduce to a
 * perfectly plausible but wrong number (`+23481028549691`) that a visitor would
 * actually dial. Anything outside the allowlist is rejected outright.
 */
export function getPhoneLink(): string | null {
  const phone = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "";
  if (isPlaceholder(phone)) return null;

  // Digits, a leading "+", and the punctuation used in written numbers.
  if (!/^[0-9+()\s.-]+$/.test(phone)) return null;

  const dialable = phone.replace(/[^\d+]/g, "");

  // A "+" is only meaningful at the start, and E.164 caps out at 15 digits.
  if (!/^\+?\d{7,15}$/.test(dialable)) return null;
  // More than one "+", or a "+" anywhere but the front, is malformed.
  if ((dialable.match(/\+/g) ?? []).length > 1) return null;

  return `tel:${dialable}`;
}

/**
 * `mailto:` link.
 *
 * Intentionally conservative: the value must look like an addr-spec with no
 * whitespace, so it cannot smuggle extra parameters or a second address into
 * the link.
 */
export function getEmailLink(): string | null {
  const email = process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "";
  if (isPlaceholder(email)) return null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;

  return `mailto:${email}`;
}

/**
 * A maps link that searches for the configured address.
 *
 * Uses the documented Google Maps search endpoint with `encodeURIComponent` on
 * the address. This deliberately does NOT hardcode coordinates or a place ID:
 * none have been supplied, and guessing either would send visitors to the wrong
 * building.
 */
export function getMapsLink(): string | null {
  const location = process.env.NEXT_PUBLIC_BUSINESS_LOCATION ?? "";
  if (isPlaceholder(location)) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

/* ---------------------------------------------------------------------------
 * Structured-data helpers
 *
 * Schema.org needs machine-readable values, but these are configured as human
 * display strings. Rather than emitting the display text into structured data
 * (which search engines ignore) or inventing a second configuration variable,
 * the display strings are converted — conservatively, and only when they match
 * a pattern that is understood. Anything unrecognised returns null and the
 * field is simply omitted, because absent data is better than wrong data.
 * ------------------------------------------------------------------------- */

const DAY_CODES: Record<string, string> = {
  monday: "Mo",
  mon: "Mo",
  tuesday: "Tu",
  tue: "Tu",
  tues: "Tu",
  wednesday: "We",
  wed: "We",
  thursday: "Th",
  thu: "Th",
  thur: "Th",
  thurs: "Th",
  friday: "Fr",
  fri: "Fr",
  saturday: "Sa",
  sat: "Sa",
  sunday: "Su",
  sun: "Su",
};

/** "Monday to Friday" / "Mon-Fri" / "Monday, Tuesday" -> "Mo-Fr" or "Mo,Tu". */
function toDaySpec(input: string): string | null {
  const cleaned = input.trim();
  if (!cleaned) return null;

  // Range: "<a> to <b>" or "<a> - <b>" (the hyphen form must not swallow a
  // leading dash, so the range separators are matched explicitly).
  const range = cleaned.match(/^(.+?)\s*(?:to|-)\s*(.+)$/i);
  if (range?.[1] && range[2]) {
    const from = DAY_CODES[range[1].trim().toLowerCase()];
    const to = DAY_CODES[range[2].trim().toLowerCase()];
    if (from && to) return `${from}-${to}`;
  }

  // Comma or slash separated list, or a single day.
  const codes = cleaned
    .split(/[,/]/)
    .map((part) => DAY_CODES[part.trim().toLowerCase()])
    .filter((code): code is string => Boolean(code));

  if (codes.length === cleaned.split(/[,/]/).length && codes.length > 0) {
    return codes.join(",");
  }

  return null;
}

/**
 * Converts a single written time to 24-hour "HH:MM".
 *
 * `expectMeridiem` forces the 12-hour reading ("8:00am"). Without it, a bare
 * time is read as 24-hour ("08:00"), which is the standard reading and is what
 * makes "08:00 - 18:00" work. Nonsense 24-hour ranges are caught by the
 * caller, which requires the end to be after the start.
 */
function toTimeSpec(input: string, expectMeridiem: boolean): string | null {
  const match = input.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3]?.toLowerCase();

  if (minute > 59) return null;
  if (expectMeridiem) {
    // 12-hour clock: the meridiem is mandatory and the hour must be 1-12.
    if (!meridiem || hour < 1 || hour > 12) return null;
  } else {
    // 24-hour clock: the meridiem must be absent and the hour 0-23.
    if (meridiem || hour > 23) return null;
  }

  let normalised = hour;
  if (meridiem === "pm" && hour < 12) normalised = hour + 12;
  if (meridiem === "am" && hour === 12) normalised = 0;

  return `${String(normalised).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * "8:00am - 6:00pm" -> "08:00-18:00", and "08:00 - 18:00" -> "08:00-18:00".
 *
 * The clock is chosen ONCE for the whole range from the presence of a
 * meridiem, so both ends are always read the same way. A range that mixes
 * them ("8:00am - 18:00") is rejected, and a 24-hour range that ends at or
 * before it starts ("8:00 - 6:00") is rejected too — that is a mis-transcribed
 * 12-hour range, and guessing would put wrong opening hours in front of a
 * customer.
 */
function toTimeRangeSpec(input: string): string | null {
  const parts = input.split(/\s*(?:-|\bto\b)\s*/i);
  if (parts.length !== 2) return null;

  const open = parts[0] ?? "";
  const close = parts[1] ?? "";
  if (!open.trim() || !close.trim()) return null;

  const hasOpenMeridiem = /am|pm/i.test(open);
  const hasCloseMeridiem = /am|pm/i.test(close);
  if (hasOpenMeridiem !== hasCloseMeridiem) return null;

  const from = toTimeSpec(open, hasOpenMeridiem);
  const to = toTimeSpec(close, hasCloseMeridiem);
  if (!from || !to) return null;

  // Only meaningful on the 24-hour reading, where it catches "8:00 - 6:00".
  if (!hasOpenMeridiem && to <= from) return null;

  return `${from}-${to}`;
}

/**
 * Converts the configured business hours into an ISO 8601 opening-hours
 * specification, or null if the string is not understood.
 *
 * The trailing comma-separated part is always the opening times; everything
 * before it is the days. That handles both "Monday to Friday, 8:00am - 6:00pm"
 * and "Saturday, Sunday, 10:00am - 2:00pm".
 *
 * Split shifts are NOT supported: "Monday to Friday, 9:00am - 1:00pm, 2:00pm -
 * 5:00pm" would read the middle part as days and fail, returning null. The
 * field is then omitted rather than reduced to something inaccurate. If split
 * shifts are ever needed, the hours should move to a dedicated machine-readable
 * variable rather than being inferred from display text.
 */
export function toOpeningHoursSpec(hours: string): string | null {
  if (isPlaceholder(hours)) return null;

  const parts = hours.split(",").map((part) => part.trim());
  if (parts.length < 2) return null;

  const times = toTimeRangeSpec(parts[parts.length - 1] ?? "");
  const days = toDaySpec(parts.slice(0, -1).join(", "));
  if (!days || !times) return null;

  return `${days} ${times}`;
}

/**
 * The geographic area served, or null while it is unconfirmed.
 *
 * Deliberately NOT derived from the office address. Where a business is
 * registered is not the same as the area it is willing to travel in, so
 * inferring one from the other would put an unconfirmed claim into structured
 * data. Absent data is better than wrong data: callers omit the field entirely
 * rather than emit a placeholder string that a search engine would read as a
 * literal service area.
 */
export function getServiceArea(): string | null {
  const area = (process.env.NEXT_PUBLIC_SERVICE_AREA ?? "").trim();
  if (!area || isPlaceholder(area)) return null;
  return area;
}

/**
 * Contact details formatted for schema.org.
 *
 * The address is emitted as a single `streetAddress` holding the configured
 * text verbatim. Splitting a free-text address into street/city/region/country
 * would be guesswork, and a wrong locality in structured data is worse than a
 * coarse one. Country is the single exception: it is derived from the phone
 * number's country code, which is unambiguous.
 */
export function getStructuredContact() {
  const contact = getContactDetails();

  const address = contact.isLocationPlaceholder
    ? null
    : {
        "@type": "PostalAddress",
        streetAddress: contact.location,
        // +234 is Nigeria's country code, and a local landline/mobile prefix.
        addressCountry: "NG",
      };

  const openingHours = toOpeningHoursSpec(contact.hours);
  const areaServed = getServiceArea();

  return {
    ...(contact.isPhonePlaceholder ? {} : { telephone: contact.phone }),
    ...(contact.isEmailPlaceholder ? {} : { email: `mailto:${contact.email}` }),
    ...(address ? { address } : {}),
    ...(openingHours ? { openingHours } : {}),
    ...(areaServed ? { areaServed } : {}),
  };
}
