import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Layout primitives.
 *
 * A single container width and a single vertical rhythm are enforced here so
 * that every page lines up, and so that a change to the rhythm is a one-line
 * edit rather than a sweep through the codebase.
 */

/** Max content width. Wide enough for service detail pages, not so wide that
 *  body copy becomes hard to track. */
const WIDTHS = {
  default: "max-w-6xl",
  narrow: "max-w-3xl",
  wide: "max-w-7xl",
} as const;

export function Container({
  children,
  className,
  width = "default",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  width?: keyof typeof WIDTHS;
  as?: ElementType;
}) {
  return (
    <Tag className={cn("mx-auto w-full px-5 sm:px-6 lg:px-8", WIDTHS[width], className)}>
      {children}
    </Tag>
  );
}

/**
 * Vertical section spacing. `tone` controls the background so that a page reads
 * as a sequence of clearly separated bands.
 */
export function Section({
  children,
  className,
  id,
  tone = "white",
  size = "default",
  as: Tag = "section",
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "white" | "muted" | "navy" | "charcoal";
  size?: "default" | "compact";
  as?: ElementType;
  /** Required for accessibility when the section has a visible heading. */
  labelledBy?: string;
}) {
  const tones = {
    white: "bg-white",
    muted: "bg-charcoal-50",
    navy: "bg-navy-900 text-charcoal-200",
    charcoal: "bg-charcoal-900 text-charcoal-200",
  } as const;

  const sizes = {
    compact: "py-14 sm:py-16",
    default: "py-18 sm:py-24",
  } as const;

  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      className={cn(tones[tone], sizes[size], className)}
    >
      {children}
    </Tag>
  );
}

/**
 * Standard section heading block: eyebrow, title, optional lead paragraph.
 * `as` must match the document heading order — pass it explicitly so heading
 * hierarchy is never left to chance.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  as: Tag = "h2",
  align = "left",
  tone = "light",
  className,
  id,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  as?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
  id?: string;
}) {
  const isDark = tone === "dark";

  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "mb-3 text-sm font-semibold tracking-wider uppercase",
            isDark ? "text-gold-400" : "text-navy-600",
          )}
        >
          {eyebrow}
        </p>
      ) : null}

      <Tag
        id={id}
        className={cn(
          "text-3xl font-bold sm:text-4xl",
          isDark ? "text-white" : "text-navy-900",
        )}
      >
        {title}
      </Tag>

      {lead ? (
        <p
          className={cn(
            "mt-4 text-lg leading-relaxed",
            isDark ? "text-charcoal-300" : "text-charcoal-600",
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
