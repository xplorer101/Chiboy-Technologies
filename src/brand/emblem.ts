/**
 * The CHIBOY TECHNOLOGIES emblem.
 *
 * WHY A GENERATOR INSTEAD OF A HAND-DRAWN SVG
 * ------------------------------------------
 * The mark is a C wrapping a T whose stem becomes a forward arrow. Every
 * coordinate is a relationship — a radius, an angle, a width — so the shape is
 * computed from named parameters rather than hand-typed points. That makes the
 * proportions exact, reviewable, and tunable in one place instead of by nudging
 * raw path data.
 *
 * This module is the single source of truth for that geometry. Both the React
 * component (`@/components/brand/Emblem`) and the asset writer
 * (`npm run logo` -> `scripts/generate-logo.ts`) read it, so the favicon, the
 * downloadable SVG and the on-site mark can never drift apart.
 *
 * BRAND CONSTRAINTS HONOURED
 * --------------------------
 * Two tones only. No gradients, no strokes, no shadows, no 3D, no filters —
 * every form is a filled path, so the mark renders identically everywhere and
 * needs no image pipeline. All text in the logo is drawn as geometry or set as
 * real HTML text, never as a raster, which is what guarantees the wordmark
 * cannot come out misspelled.
 *
 * COLOUR NOTE — WHY THE MARK SITS ON A DARK BADGE
 * -----------------------------------------------
 * The specified pair is deliberately split-brightness: deep navy #1B3A6B reads
 * 11.3:1 on white but only 1.9:1 on black, while silver #A8ACAF reads 9.2:1 on
 * black and just 2.3:1 on white. Neither tone is legible on the other's
 * background. On a near-black badge the silver T and arrow carry the mark at
 * full strength and the navy ring reads as a deliberate tonal frame, so the
 * badge — not the page behind it — is what the logo always sits on.
 */

/** Deep navy, from the supplied brand specification. */
export const EMBLEM_NAVY = "#1B3A6B";

/** Metallic silver-grey, from the supplied brand specification. */
export const EMBLEM_SILVER = "#A8ACAF";

/** The near-black the emblem is designed to sit on. */
export const EMBLEM_GROUND = "#000000";

/**
 * Tunable geometry. Angles follow the usual mathematical convention — 0 degrees
 * points right, 90 degrees points up, values increase counter-clockwise — and
 * are negated into screen coordinates when converted to points, so the numbers
 * here read the way a designer would expect.
 */
export interface EmblemParams {
  // --- The "C": an octagonal ring. Flat facets give the sharp, angular,
  //     industrial character; a circular ring read as generic.
  /** Radius to the outer edge of the ring. */
  cOuterR: number;
  /** Radius to the inner edge of the ring. Thickness is the difference. */
  cInnerR: number;
  /** Angle of the first vertex, at the upper lip of the mouth. */
  cStartDeg: number;
  /** Angular step between vertices. 45 degrees gives eight facets. */
  cFacetStep: number;
  /** Number of vertices on the ring. */
  cFacetCount: number;
  /**
   * Angle of the final vertex, pulled back from a full octagon to open the
   * mouth wider so the arrow can leave through it.
   */
  cLastDeg: number;
  /**
   * How far the terminal faces are slanted. The outer vertex is pulled back
   * along the direction of travel and the inner one pushed forward by the same
   * amount, which cuts the ends on a diagonal for the chevron character while
   * keeping the ring's full width. Cutting by angle instead tapers the terminal
   * into a fragile sliver.
   */
  cTerminalCut: number;

  // --- The "T": the boldest element, so the mark still reads at 32px.
  /** Half-width of the crossbar. */
  tBarHalf: number;
  /** Y coordinate of the crossbar's top edge. */
  tBarTop: number;
  /** Thickness of the crossbar. */
  tBarThickness: number;
  /** Half-width of the stem. Matches the arrow shaft so the two are continuous. */
  tStemHalf: number;
  /** Y coordinate where the stem hands over to the arrow. */
  tStemBottom: number;

  // --- The arrow: a diagonal leaving the stem through the C's mouth.
  /** Degrees below horizontal that the arrow travels. */
  arrowAngle: number;
  /** Half-width of the shaft. */
  arrowShaftHalf: number;
  /** Length of the constant-width shaft before the head begins. */
  arrowShaftLength: number;
  /**
   * Fraction of the shaft length at which the head starts widening. Held high
   * so the shaft stays a constant width for most of its run; a lower value
   * turned the arrow into a long taper that read as a swoosh, not an arrow.
   */
  arrowNeckAt: number;
  /** Length of the arrowhead from barb to tip. */
  arrowHeadLength: number;
  /** Half-width across the barbs. */
  arrowHeadHalf: number;
}

/**
 * Proportions arrived at by rendering the mark to a grid and inspecting the
 * silhouette, then tightening the three things that read wrong: an
 * over-thick ring that rendered as a solid blob, a mouth wide enough to look
 * like a bracket, and an oversized arrowhead that merged into the ring's bottom
 * facet.
 */
export const EMBLEM_PARAMS: EmblemParams = {
  cOuterR: 38,
  // Thickness 9: bold, but lighter than the T's 11 so the T stays dominant.
  cInnerR: 29,
  cStartDeg: 0,
  cFacetStep: 45,
  cFacetCount: 8,
  // Pulled back from 315 to 300, widening the mouth from 45 to 60 degrees.
  cLastDeg: 300,
  cTerminalCut: 3,

  tBarHalf: 20,
  tBarTop: 34,
  tBarThickness: 11,
  tStemHalf: 5,
  tStemBottom: 65,

  arrowAngle: 32,
  arrowShaftHalf: 5,
  arrowShaftLength: 22,
  arrowNeckAt: 0.72,
  arrowHeadLength: 15,
  arrowHeadHalf: 10.5,
};

const CENTRE_X = 50;
const CENTRE_Y = 50;

type Point = readonly [number, number];

const round = (n: number): number => Number(n.toFixed(3));

const polygon = (points: readonly Point[]): string =>
  `M ${points.map(([x, y]) => `${round(x)} ${round(y)}`).join(" L ")} Z`;

/** A point on the ring at `deg` and radius `r`, converted to screen space. */
function ringPoint(deg: number, r: number): Point {
  const rad = (deg * Math.PI) / 180;
  return [CENTRE_X + r * Math.cos(rad), CENTRE_Y - r * Math.sin(rad)];
}

/** Unit tangent at `deg`, pointing in the direction of travel (increasing deg). */
function ringTangent(deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  return [-Math.sin(rad), -Math.cos(rad)];
}

/** Offsets a point along the ring's tangent at `deg`. */
function alongTangent(point: Point, deg: number, amount: number): Point {
  const [tx, ty] = ringTangent(deg);
  return [point[0] + tx * amount, point[1] + ty * amount];
}

/**
 * The C: the ring, with the facets facing the mouth omitted so the form reads
 * as a letter C rather than a bracket. Traversed outer edge first, then back
 * along the inner edge, which is one closed path with no seam.
 */
export function emblemCPath(p: EmblemParams = EMBLEM_PARAMS): string {
  // Facet vertices, from the mouth's upper edge going counter-clockwise. The
  // final vertex is pulled back to open the mouth wider for the arrow.
  const degs: number[] = [p.cStartDeg];
  for (let k = 1; k < p.cFacetCount - 1; k += 1) {
    degs.push(p.cStartDeg + k * p.cFacetStep);
  }
  degs.push(p.cLastDeg);
  const lastIndex = degs.length - 1;

  /**
   * Slants only the two terminals, by `sign` times the cut. The outer and inner
   * rings take opposite slants so each terminal is cut on a single diagonal:
   * the outer vertex is pulled back along the direction of travel and the inner
   * one pushed forward by the same amount, keeping the ring's full width at the
   * end. Both outer vertices lean into the mouth, which is what reads as a
   * chevron pointing the way the ring is travelling.
   */
  const ring = (radius: number, sign: 1 | -1): Point[] =>
    degs.map((deg, i) => {
      const lean = i === 0 ? -p.cTerminalCut : i === lastIndex ? p.cTerminalCut : 0;
      return alongTangent(ringPoint(deg, radius), deg, lean * sign);
    });

  const outer = ring(p.cOuterR, 1);
  const inner = ring(p.cInnerR, -1);

  return polygon([...outer, ...[...inner].reverse()]);
}

/**
 * The T, as a single outline rather than two rectangles, so there is no seam
 * and nothing to stroke.
 */
export function emblemTPath(p: EmblemParams = EMBLEM_PARAMS): string {
  const barBottom = p.tBarTop + p.tBarThickness;
  return polygon([
    [CENTRE_X - p.tBarHalf, p.tBarTop],
    [CENTRE_X + p.tBarHalf, p.tBarTop],
    [CENTRE_X + p.tBarHalf, barBottom],
    [CENTRE_X + p.tStemHalf, barBottom],
    [CENTRE_X + p.tStemHalf, p.tStemBottom],
    [CENTRE_X - p.tStemHalf, p.tStemBottom],
    [CENTRE_X - p.tStemHalf, barBottom],
    [CENTRE_X - p.tBarHalf, barBottom],
  ]);
}

/**
 * The arrow, continuing the T's stem on a diagonal.
 *
 * The shaft starts centred under the stem and at the stem's own width, so the
 * two read as one continuous stroke. The head is backed off along the shaft to
 * give each barb a shoulder rather than a flat-cut triangle.
 */
export function emblemArrowPath(p: EmblemParams = EMBLEM_PARAMS): string {
  const rad = (p.arrowAngle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  // Perpendicular to the shaft.
  const px = -dy;
  const py = dx;

  const start: Point = [CENTRE_X, p.tStemBottom];
  const along = (distance: number): Point => [
    start[0] + dx * distance,
    start[1] + dy * distance,
  ];
  const offset = (point: Point, halfWidth: number): Point => [
    point[0] + px * halfWidth,
    point[1] + py * halfWidth,
  ];

  const neck = along(p.arrowShaftLength * p.arrowNeckAt);
  const barb = along(p.arrowShaftLength + p.arrowHeadLength * 0.4);
  const tip = along(p.arrowShaftLength + p.arrowHeadLength);

  return polygon([
    offset(start, p.tStemHalf),
    offset(neck, p.tStemHalf),
    offset(barb, p.arrowHeadHalf),
    tip,
    offset(barb, -p.arrowHeadHalf),
    offset(neck, -p.tStemHalf),
    offset(start, -p.tStemHalf),
  ]);
}

/** The three paths in paint order, ready to drop into an `<svg>`. */
export function emblemPaths(p: EmblemParams = EMBLEM_PARAMS): {
  c: string;
  t: string;
  arrow: string;
} {
  return {
    c: emblemCPath(p),
    t: emblemTPath(p),
    arrow: emblemArrowPath(p),
  };
}
