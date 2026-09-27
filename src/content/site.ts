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
   * Filled in on request-service and the homepage, from the spec.
   * `yearsInBusiness` is intentionally absent: no figure has been supplied and
   * inventing one is not permitted. It belongs in this file once provided.
   */
  founded: "[PLACEHOLDER: years in business]",
} as const;

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
 * Builds a wa.me deep link. WhatsApp numbers are stored without `+`, spaces or
 * punctuation, so the value is normalised before use. Returns null when no real
 * number is configured, which lets the UI hide the floating button entirely
 * rather than linking to a broken or invented contact.
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
