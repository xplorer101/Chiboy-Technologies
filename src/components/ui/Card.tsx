import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import {
  BriefcaseBusiness,
  Cpu,
  Headset,
  Lightbulb,
  Network,
  Package,
  Palette,
  Store,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ServiceIconName } from "@/content/services";

/**
 * Card, Badge and the service icon registry.
 */

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius-card)] border border-charcoal-200 bg-white p-6 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * A card that links somewhere. The whole card is clickable, but only the title
 * is the accessible link, so screen readers announce one link with a sensible
 * name rather than a large block of repeated text.
 */
export function CardLink({
  href,
  title,
  className,
  children,
}: {
  href: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("group relative transition-shadow hover:shadow-[var(--shadow-lift)]", className)}>
      {children}
      <h3 className="text-lg font-semibold text-navy-900">
        <Link href={href} className="after:absolute after:inset-0">
          {/* Stretch target, described once. */}
          <span className="absolute inset-0" aria-hidden="true" />
          {title}
        </Link>
      </h3>
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "navy" | "warning" | "placeholder";
  className?: string;
}) {
  const tones = {
    neutral: "bg-charcoal-100 text-charcoal-700",
    navy: "bg-navy-100 text-navy-800",
    accent: "bg-gold-500/15 text-gold-700",
    warning: "bg-gold-500/20 text-gold-700",
    // Used for the explicitly-labelled placeholder content, so it can never be
    // mistaken for real information.
    placeholder: "border border-dashed border-gold-600/60 bg-gold-500/10 text-gold-700",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Icon names used by the trust section on the homepage. */
const trustIcons = {
  briefcase: BriefcaseBusiness,
  headset: Headset,
  cpu: Cpu,
  users: Users,
} satisfies Record<string, LucideIcon>;

export type TrustIconName = keyof typeof trustIcons;

export function TrustIcon({ name, className }: { name: TrustIconName; className?: string }) {
  const Icon = trustIcons[name];
  return <Icon className={className} aria-hidden="true" />;
}

/**
 * Service icons. The content file stores only the name, keeping
 * `src/content/services.ts` as plain serialisable data.
 */
const serviceIcons = {
  wrench: Wrench,
  package: Package,
  network: Network,
  palette: Palette,
  store: Store,
  lightbulb: Lightbulb,
} satisfies Record<ServiceIconName, LucideIcon>;

export function ServiceIcon({
  name,
  className,
}: {
  name: ServiceIconName;
  className?: string;
}) {
  const Icon = serviceIcons[name];
  return <Icon className={className} aria-hidden="true" />;
}
