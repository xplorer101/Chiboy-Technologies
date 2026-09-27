import { MessageCircle } from "lucide-react";
import { defaultWhatsAppMessage, getWhatsAppLink } from "@/content/site";

/**
 * Floating WhatsApp button.
 *
 * Renders only when a real number is configured. While the number is still a
 * placeholder the button is suppressed entirely rather than linking to an
 * invented or broken contact — a dead chat link is worse than no button.
 */
export function WhatsAppFab() {
  const href = getWhatsAppLink(defaultWhatsAppMessage);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with CHIBOY TECHNOLOGIES on WhatsApp"
      // Navy glyph on WhatsApp green, not white. White on #25D366 is 1.50:1,
      // which fails WCAG 1.4.11 for a control whose only visual signal is the
      // icon. Navy on the same green is 12.97:1 and keeps the brand colour.
      className="group fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-navy-950 shadow-[var(--shadow-lift)] transition-transform duration-200 hover:scale-105 focus-visible:scale-105 sm:right-6 sm:bottom-6"
    >
      <MessageCircle className="size-7" aria-hidden="true" />
      <span className="pointer-events-none absolute right-full mr-3 hidden rounded-lg bg-navy-900 px-3 py-2 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block">
        Chat on WhatsApp
      </span>
    </a>
  );
}
