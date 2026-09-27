import {
  EMBLEM_GROUND,
  EMBLEM_NAVY,
  EMBLEM_PARAMS,
  EMBLEM_SILVER,
  emblemPaths,
} from "@/brand/emblem";
import { cn } from "@/lib/utils/cn";

/**
 * The CHIBOY TECHNOLOGIES emblem.
 *
 * Rendered as inline SVG from the shared geometry module rather than as an
 * `<img>`, for two reasons. It costs no network request, so the brand mark
 * cannot appear after the page has painted, and the paths stay in the bundle
 * where a build can verify them. `scripts/generate-logo.ts` writes the same
 * geometry out to static SVG assets from the same module.
 *
 * Colours are fixed to the brand pair by default rather than inherited through
 * `currentColor`, because the two tones are only legible on a dark ground — see
 * the contrast note in `@/brand/emblem`.
 */

/** The three filled paths, computed once at module load. */
const PATHS = emblemPaths(EMBLEM_PARAMS);

/** Corner radius of the dark badge the mark sits on, in viewBox units. */
const BADGE_RADIUS = 18;

export interface EmblemProps {
  /**
   * Accessible name. Omit when the mark is decorative and sits next to a
   * visible wordmark — the usual case in the header — and the emblem is then
   * correctly hidden from assistive technology instead of being announced as an
   * unlabelled image.
   */
  title?: string;
  /**
   * Draw the near-black badge behind the mark. On by default, because the
   * specified navy and silver are only legible against a dark ground.
   */
  badge?: boolean;
  className?: string;
}

export function Emblem({ title, badge = true, className }: EmblemProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("block", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
    >
      {badge ? (
        <rect width="100" height="100" rx={BADGE_RADIUS} fill={EMBLEM_GROUND} />
      ) : null}
      <path d={PATHS.c} fill={EMBLEM_NAVY} />
      <path d={PATHS.t} fill={EMBLEM_SILVER} />
      <path d={PATHS.arrow} fill={EMBLEM_NAVY} />
    </svg>
  );
}
