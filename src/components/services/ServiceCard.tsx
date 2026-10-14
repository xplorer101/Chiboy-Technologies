import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Service } from "@/content/services";

/**
 * Service list item.
 *
 * The single implementation, shared by the homepage, the `/services` overview,
 * the About page and the related-services block on detail pages. It is
 * deliberately plain: a name, one sentence and a text link, with no icon and no
 * card chrome, so the site reads as a working local business.
 */
export function ServiceCard({
  service,
  headingLevel = "h3",
}: {
  service: Service;
  headingLevel?: "h2" | "h3" | "h4";
}) {
  const Heading = headingLevel;

  return (
    <li className="border-b border-charcoal-200 pb-5">
      <Heading className="text-lg font-semibold text-navy-900">
        {service.name}
      </Heading>

      <p className="mt-1.5 text-charcoal-600">{service.cardDescription}</p>

      <Link
        href={`/services/${service.slug}`}
        className="mt-2.5 inline-flex items-center gap-1.5 font-semibold text-blue-700 underline-offset-4 hover:text-blue-800 hover:underline"
      >
        Read more
        <span className="sr-only"> about {service.name}</span>
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </li>
  );
}
