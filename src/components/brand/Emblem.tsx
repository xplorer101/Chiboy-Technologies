import { EMBLEM_STROKE_ATTRS, emblemMark } from "@/brand/emblem";
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
 * Colours are fixed to the brand tones rather than inherited through
 * `currentColor`, because the mark is designed for its navy badge and the
 * silver is legible on that ground and nowhere else — see the contrast note in
 * `@/brand/emblem`.
 *
 * Paint order is load-bearing: the badge, then the C, then the T over it, then
 * the gold chevron last, so the one gold element is never occluded.
 */

/** Whether to draw the navy badge behind the mark. */
export interface EmblemProps {
  /**
   * Accessible name. Omit when the mark is decorative and sits next to a
   * visible wordmark — the usual case in the header — and the emblem is then
   * correctly hidden from assistive technology instead of being announced as an
   * unlabelled image.
   */
  title?: string;
  /**
   * Draw the navy badge behind the mark. On by default, because the silver
   * measures 4.9:1 on that navy and only 2.3:1 on white.
   */
  badge?: boolean;
  className?: string;
}

export function Emblem({ title, badge = true, className }: EmblemProps) {
  const mark = emblemMark();

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("block", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
    >
      {badge ? <path d={mark.badge.d} fill={mark.badge.fill} /> : null}
      {mark.strokes.map((stroke) => (
        <path
          key={stroke.d}
          d={stroke.d}
          stroke={stroke.stroke}
          strokeWidth={stroke.width}
          {...EMBLEM_STROKE_ATTRS}
        />
      ))}
      {mark.fills.map((fill) => (
        <path key={fill.d} d={fill.d} fill={fill.fill} />
      ))}
    </svg>
  );
}
