import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Breadcrumb trail.
 *
 * Native markup only: a labelled `<nav>` wrapping an ordered list, with the
 * current page marked `aria-current="page"` and rendered as plain text rather
 * than a link. That is the pattern screen readers announce correctly
 * ("breadcrumb, list, 3 items") and it works with zero client JavaScript.
 *
 * Every page except the homepage should use this — it is a navigation aid for
 * people and a structured-data signal for search engines, and it matters more
 * on deep routes like `/services/networking`.
 */

export type Crumb = {
  label: string;
  /** Omitted for the current page, which is not a link. */
  href?: string;
};

export function Breadcrumbs({
  items,
  className,
  tone = "light",
}: {
  items: readonly Crumb[];
  className?: string;
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol
        className={cn(
          "flex flex-wrap items-center gap-x-1 gap-y-1 text-sm",
          isDark ? "text-charcoal-400" : "text-charcoal-500",
        )}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.label} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
              ) : null}

              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    "rounded transition-colors hover:underline",
                    isDark ? "hover:text-gold-400" : "hover:text-navy-800",
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "truncate font-medium",
                    isLast && (isDark ? "text-charcoal-200" : "text-navy-900"),
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * BreadcrumbList structured data.
 *
 * `position` is 1-based per the schema.org specification. Every crumb is
 * included so search engines see the full trail depth; `item` is omitted on
 * the final crumb because the current page has no separate URL to point at
 * (the `item` property is optional for exactly this case).
 */
export function breadcrumbJsonLd(items: readonly Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: item.href } : {}),
    })),
  };
}
