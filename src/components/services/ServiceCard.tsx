import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, ServiceIcon } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { Service } from "@/content/services";

/**
 * Service card.
 *
 * The single card implementation, shared by the homepage preview, the
 * `/services` overview and the related-services block on detail pages. One
 * component means a change to the card reaches all three places, and there is
 * no second copy of this markup to keep in sync.
 *
 * The whole card is clickable via a `::after` overlay while the accessible
 * link name stays just the service name. Focus is shown twice on purpose: the
 * global `:focus-visible` outline on the text, and a `focus-within` ring on the
 * card so a keyboard user can see *which* card is focused.
 */
export function ServiceCard({
  service,
  className,
  headingLevel = "h3",
}: {
  service: Service;
  className?: string;
  /**
   * Must match the surrounding document outline. The `/services` overview has
   * an `h2` section heading so its cards use `h3`; a detail page section may
   * need `h4` instead.
   */
  headingLevel?: "h2" | "h3" | "h4";
}) {
  const Heading = headingLevel;

  return (
    <Card
      as="li"
      className={cn(
        "group relative flex h-full flex-col transition-shadow hover:shadow-[var(--shadow-lift)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-600",
        className,
      )}
    >
      <span
        className={cn(
          "inline-grid size-11 shrink-0 place-items-center rounded-lg bg-navy-50 transition-colors group-hover:bg-navy-900",
          "group-focus-within:bg-navy-900",
        )}
      >
        <ServiceIcon
          name={service.icon}
          className="size-5 text-navy-700 transition-colors group-hover:text-gold-400 group-focus-within:text-gold-400"
        />
      </span>

      <Heading className="mt-4 text-lg font-semibold text-navy-900">
        <Link href={`/services/${service.slug}`} className="after:absolute after:inset-0">
          {service.name}
        </Link>
      </Heading>

      <p className="mt-2 flex-1 text-sm leading-relaxed text-charcoal-600">
        {service.cardDescription}
      </p>

      <span
        aria-hidden="true"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 transition-colors group-hover:text-navy-900"
      >
        Learn more
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Card>
  );
}
