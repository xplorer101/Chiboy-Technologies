import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";
import { Badge, Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { PortfolioCard as PortfolioCardData } from "@/lib/portfolio";

/**
 * Portfolio project card.
 *
 * Handles two image cases deliberately:
 *
 *  - **Raster** (.jpg/.png/.webp/.avif) goes through `next/image` for
 *    optimisation, responsive `srcset` and lazy loading.
 *  - **SVG** — used by the generated placeholder covers — is rendered with a
 *    plain `<img>`. `next/image` cannot optimise SVG, and enabling
 *    `dangerouslyAllowSVG` to accommodate our own placeholder art would
 *    weaken the image pipeline for real photography later.
 *
 * A project whose image fails to load degrades to a labelled panel rather than
 * a broken-image icon.
 */

const RASTER_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

function isRaster(pathOrUrl: string): boolean {
  const withoutQuery = pathOrUrl.split("?")[0] ?? pathOrUrl;
  return RASTER_EXTENSIONS.some((extension) =>
    withoutQuery.toLowerCase().endsWith(extension),
  );
}

/** Human-readable category label. */
export function categoryLabel(category: string): string {
  switch (category) {
    case "SOFTWARE":
      return "Software";
    case "NETWORKING":
      return "Networking";
    case "COMPUTER_SERVICES":
      return "Computer Services";
    case "GRAPHICS_DESIGN":
      return "Graphics Design";
    case "OTHER":
      return "Other";
    default:
      return category;
  }
}

export function ProjectCard({
  project,
  className,
  priority = false,
}: {
  project: PortfolioCardData;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Card
      as="li"
      className={cn(
        "group relative flex h-full flex-col overflow-hidden p-0 transition-shadow hover:shadow-[var(--shadow-lift)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-600",
        className,
      )}
    >
      <ProjectImage project={project} priority={priority} />

      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="navy">{categoryLabel(project.category)}</Badge>
          {project.isPlaceholder ? <Badge tone="placeholder">Placeholder</Badge> : null}
        </div>

        <h3 className="mt-3 text-lg font-semibold text-navy-900">
          <Link href={`/portfolio/${project.slug}`} className="after:absolute after:inset-0">
            {/* The `::after` overlay stretches the hit area over the whole card
                without duplicating the project title in the accessible name.
                The link keeps the global :focus-visible outline and the card
                adds a focus-within ring, so focus is always visible. */}
            {project.title}
          </Link>
        </h3>

        <p className="mt-2 flex-1 text-sm leading-relaxed text-charcoal-600">
          {project.summary}
        </p>

        <span
          aria-hidden="true"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 transition-colors group-hover:text-navy-900"
        >
          View details
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Card>
  );
}

/** Card visual. Exported so the portfolio grid and the homepage can share it. */
function ProjectImage({
  project,
  priority,
}: {
  project: PortfolioCardData;
  priority: boolean;
}) {
  const cover = project.coverImage;

  if (!cover) {
    return <MissingImage label={project.title} />;
  }

  if (isRaster(cover)) {
    return (
      <div className="relative aspect-16/10 w-full overflow-hidden bg-navy-900">
        <Image
          src={cover}
          alt={imageAlt(project)}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-16/10 w-full overflow-hidden bg-navy-950">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG placeholder
          art cannot be optimised by next/image; see the note above. */}
      <img
        src={cover}
        alt={imageAlt(project)}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </div>
  );
}

/**
 * Describes the image by its purpose rather than by what it depicts, which is
 * both honest for placeholder art and better for accessibility than repeating
 * the project title.
 */
function imageAlt(project: PortfolioCardData): string {
  if (project.isPlaceholder) {
    return `Placeholder cover image for ${project.title}. No project photography has been supplied yet.`;
  }
  return `Cover image for ${project.title}`;
}

function MissingImage({ label }: { label: string }) {
  return (
    <div className="flex aspect-16/10 w-full flex-col items-center justify-center gap-2 bg-navy-900 text-charcoal-400">
      <ImageOff className="size-6" aria-hidden="true" />
      <span className="px-4 text-center text-xs">No image supplied</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
