/**
 * The CHIBOY TECHNOLOGIES emblem.
 *
 * THE MARK
 * --------
 * A chamfered "C" — a square with its four corners cut off at 45 degrees —
 * containing a solid upright "T", with a gold chevron pointing out through the
 * C's aperture.
 *
 * Three ideas, each doing one job:
 *
 *  1. **The C is a container, drawn as an outline.** It reads as machined
 *     metalwork rather than as a ring, because every corner is a cut and nothing
 *     is round. That is where the "futuristic" quality comes from: not from
 *     glow or gradient, both of which are banned, but from geometry.
 *  2. **The T is solid, not an outline.** Outline against outline at 32px turns
 *     two grey lines into mush. Giving the T mass while the C stays open makes
 *     the letterform survive at favicon size, and the contrast between an open
 *     container and a solid payload is the point.
 *  3. **The chevron is the only forward-motion cue**, and the only gold in the
 *     mark. It sits in the C's aperture — the one part of the mark that would
 *     otherwise be empty — and points out of it, so the eye leaves the logo the
 *     way it should.
 *
 * WHY A GENERATOR INSTEAD OF A HAND-DRAWN SVG
 * ------------------------------------------
 * Every coordinate is a relationship — a half-width, a corner cut, a stroke
 * weight — so the shape is computed from named parameters rather than hand-typed
 * points. That makes the proportions exact, reviewable, and tunable in one place
 * instead of by nudging raw path data.
 *
 * This module is the single source of truth for that geometry. Both the React
 * component (`@/components/brand/Emblem`) and the asset writer
 * (`npm run logo` -> `scripts/generate-logo.ts`) read it, so the favicon, the
 * downloadable SVG and the on-site mark can never drift apart.
 *
 * BRAND CONSTRAINTS HONOURED
 * --------------------------
 * Flat vector. No gradients, no filters, no glow, no shadows, no 3D, no
 * textures, and no photographic elements. All text in the logo is drawn as
 * geometry or set as real HTML text, never as a raster, which is what guarantees
 * the wordmark cannot come out misspelled.
 *
 * THE PALETTE IS THE SITE'S, NOT A NEW ONE
 * -----------------------------------------
 * This is the third version of the mark and the first to use no invented colour
 * at all. Earlier drafts reached for a circuit-board cyan and a neon blue that
 * were nowhere in the brand; both are gone. What remains is Deep Navy, Silver
 * and Gold — the same three the rest of the site uses — so the logo cannot drift
 * away from the page it sits on.
 *
 * The badge is navy rather than near-black, which is a change from the previous
 * mark. Near-black was chosen to lift the silver; navy lifts it almost as well
 * (4.9:1 against 9.2:1) and is the brand's own primary, so the logo now reads as
 * part of the identity rather than as a monochrome mark bolted onto it.
 *
 * The gold is deliberately the *brightest* of the three. Gold-500 sits at almost
 * exactly the same luminance as the silver, and two marks that differ only by a
 * hue cannot be told apart at 32px. Lifting the gold to a higher lightness than
 * the silver gives the accent a luminance difference as well, so it still reads
 * as a different material when the mark is small.
 */

/** The badge field: the site's Deep Navy, the brand's primary colour. */
export const EMBLEM_GROUND = "#1B3A6B";

/** Metallic silver-grey, from the supplied brand specification. */
export const EMBLEM_SILVER = "#A8ACAF";

/**
 * The single gold accent — the chevron, and nothing else.
 *
 * Brightened past the silver on purpose. See the note at the top of this file:
 * a hue-only difference is invisible at favicon size.
 */
export const EMBLEM_GOLD = "#E8B84B";

/**
 * Tunable geometry, in units of the 100x100 grid every path is authored on.
 *
 * The badge and the C are both cut-corner squares, so the mark is a set of
 * concentric chamfered forms. That repetition is deliberate: it is what makes
 * the badge and the C read as one object rather than as a shape inside a shape.
 */
export interface EmblemParams {
  // --- The badge ------------------------------------------------------------
  /** Half-width of the cut-corner square the whole mark sits on. Full bleed. */
  badgeHalf: number;
  /** Size of the badge's corner cuts. */
  badgeCut: number;
  // --- The C ----------------------------------------------------------------
  /** Half-width of the C's square. Smaller than the badge, so navy surrounds it. */
  cHalf: number;
  /** Size of the C's corner cuts. */
  cCut: number;
  /**
   * How far along the right-hand diagonal the terminals stop, as a fraction.
   * 0 closes the C into an O; 1 cuts the entire right side away.
   */
  cAperture: number;
  /** The C's line weight. */
  cStroke: number;

  // --- The T ----------------------------------------------------------------
  /** Horizontal centre of the T. Left of the emblem's centre, to clear the chevron. */
  tCentreX: number;
  /** Left end of the crossbar. */
  tBarLeftX: number;
  /** Right end of the crossbar. */
  tBarRightX: number;
  /** Height of the crossbar. */
  tBarHeight: number;
  /** Y of the crossbar's top edge. */
  tBarTopY: number;
  /** Width of the stem. */
  tStemWidth: number;
  /** Y where the stem ends. */
  tStemEndY: number;

  // --- The chevron ----------------------------------------------------------
  /** X of the chevron's two arms — the vertical line it folds about. */
  chevronX: number;
  /** How far the point stands proud of the arms. */
  chevronReach: number;
  /** Half the chevron's height. */
  chevronHalfHeight: number;
  /** Y at the chevron's point. */
  chevronY: number;
  /** The chevron's line weight. */
  chevronStroke: number;
}

/**
 * Proportions arrived at by rendering the mark to a grid and reading it, then
 * fixing what read wrong. Every gap below is at least 3.2 units, which survives
 * scaling to a 32px header without the forms touching.
 */
export const EMBLEM_PARAMS: EmblemParams = {
  badgeHalf: 50,
  badgeCut: 24,

  cHalf: 28,
  cCut: 14,
  cAperture: 0.5,
  cStroke: 7,

  tCentreX: 44,
  tBarLeftX: 31,
  tBarRightX: 57,
  tBarHeight: 7,
  tBarTopY: 38.5,
  tStemWidth: 7.5,
  tStemEndY: 67.5,

  chevronX: 66,
  chevronReach: 7,
  chevronHalfHeight: 9,
  chevronY: 50,
  chevronStroke: 6,
};

const CENTRE_X = 50;
const CENTRE_Y = 50;

/** How far the badge stops short of the viewBox edge, so nothing is clipped. */
const BADGE_INSET = 4;

type Point = readonly [number, number];

const round = (n: number): number => Number(n.toFixed(3));

const points = (list: readonly Point[]): string =>
  list.map(([x, y]) => `${round(x)} ${round(y)}`).join(" ");

const polygon = (list: readonly Point[]): string => `M ${points(list)} Z`;

const polyline = (list: readonly Point[]): string => `M ${points(list)}`;

/**
 * The eight vertices of a square with its corners cut off, clockwise from the
 * left end of the top edge.
 *
 * Shared by the badge and the C, which is what makes them concentric members of
 * one family rather than two unrelated outlines.
 */
export function cutCornerSquare(half: number, cut: number, cx = CENTRE_X, cy = CENTRE_Y): Point[] {
  const lo = cy - half;
  const hi = cy + half;
  return [
    [cx - half + cut, lo],
    [cx + half - cut, lo],
    [cx + half, lo + cut],
    [cx + half, hi - cut],
    [cx + half - cut, hi],
    [cx - half + cut, hi],
    [cx - half, hi - cut],
    [cx - half, lo + cut],
  ];
}

/**
 * The badge: a closed cut-corner square, filled.
 *
 * Inset by 4 units from the viewBox edge so the mark never touches the edge of
 * a favicon tile, where a full-bleed shape gets clipped by the platform's own
 * rounding. Drawn as a polygon rather than a rounded rect because the chamfer is
 * the point: the badge and the C are the same shape at two sizes, which is what
 * makes them read as one object.
 */
export function emblemBadgePath(p: EmblemParams = EMBLEM_PARAMS): string {
  return polygon(cutCornerSquare(p.badgeHalf - BADGE_INSET, p.badgeCut - BADGE_INSET));
}

/**
 * The C, as one open stroked polyline running from the upper terminal, back over
 * the top, down the left, along the bottom, and out to the lower terminal.
 *
 * The right side is omitted and the two terminals are left part-way along the
 * diagonals, which is what makes the aperture. Those diagonals also mean the
 * terminals are cut at 45 degrees by the butt cap for free — the ends are as
 * machined as the corners.
 */
export function emblemCPath(p: EmblemParams = EMBLEM_PARAMS): string {
  const square = cutCornerSquare(p.cHalf, p.cCut);

  // The upper terminal sits part-way along the top-right diagonal (v1 -> v2) and
  // the lower terminal mirrors it on the bottom-right one (v4 -> v3). Between
  // them the path runs v1, v0, v7, v6, v5, v4 — over the top, down the left,
  // along the bottom. v2 and v3, the right-hand side, are the aperture and are
  // deliberately absent.
  const along = (from: Point, to: Point, t: number): Point => [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
  ];

  return polyline([
    along(square[1] as Point, square[2] as Point, p.cAperture),
    square[1] as Point,
    square[0] as Point,
    square[7] as Point,
    square[6] as Point,
    square[5] as Point,
    square[4] as Point,
    along(square[4] as Point, square[3] as Point, p.cAperture),
  ]);
}

/**
 * The T, as two solid rectangles: the crossbar and the stem.
 *
 * Filled rather than stroked, unlike the C. See the note at the top: an outlined
 * T inside an outlined C is two sets of thin lines, and at a 32px header that is
 * grey mush. The solid T is the reason the letterform survives.
 *
 * The two rectangles deliberately overlap rather than abut, so no seam can show
 * between the crossbar and the stem at any zoom level.
 */
export function emblemTShapes(p: EmblemParams = EMBLEM_PARAMS): { bar: string; stem: string } {
  return {
    bar: polygon([
      [p.tBarLeftX, p.tBarTopY],
      [p.tBarRightX, p.tBarTopY],
      [p.tBarRightX, p.tBarTopY + p.tBarHeight],
      [p.tBarLeftX, p.tBarTopY + p.tBarHeight],
    ]),
    stem: polygon([
      [p.tCentreX - p.tStemWidth / 2, p.tBarTopY],
      [p.tCentreX + p.tStemWidth / 2, p.tBarTopY],
      [p.tCentreX + p.tStemWidth / 2, p.tStemEndY],
      [p.tCentreX - p.tStemWidth / 2, p.tStemEndY],
    ]),
  };
}

/**
 * The gold chevron: a single stroked polyline folding to a point, opening left
 * and aimed right, sitting in the C's aperture.
 */
export function emblemChevronPath(p: EmblemParams = EMBLEM_PARAMS): string {
  return polyline([
    [p.chevronX, p.chevronY - p.chevronHalfHeight],
    [p.chevronX + p.chevronReach, p.chevronY],
    [p.chevronX, p.chevronY + p.chevronHalfHeight],
  ]);
}

/**
 * Presentation attributes for the two stroked elements.
 *
 * Butt caps and mitered joins, so the chevron's point and the C's chamfers stay
 * sharp at every size. The miter limit stops an acute corner from growing an
 * unbounded spike, and `EMBLEM_MIN_JOIN_ANGLE` is the angle below which that
 * limit would bite and the renderer would silently bevel instead.
 */
export const EMBLEM_STROKE_ATTRS = {
  fill: "none",
  strokeLinecap: "butt",
  strokeLinejoin: "miter",
  strokeMiterlimit: 4,
} as const;

export const EMBLEM_MIN_JOIN_ANGLE =
  (2 * Math.asin(1 / EMBLEM_STROKE_ATTRS.strokeMiterlimit)) * (180 / Math.PI);

/**
 * The complete mark, as data a renderer can draw without knowing any geometry.
 *
 * Returned as a structure rather than as markup so that the React component and
 * the static-asset writer render it through the same rules, and so the test
 * suite can assert on weights, joins, colours and clearances without parsing
 * SVG.
 */
export type EmblemMark = {
  badge: { d: string; fill: string };
  strokes: { d: string; stroke: string; width: number }[];
  fills: { d: string; fill: string }[];
};

export function emblemMark(p: EmblemParams = EMBLEM_PARAMS): EmblemMark {
  const t = emblemTShapes(p);

  return {
    badge: { d: emblemBadgePath(p), fill: EMBLEM_GROUND },
    // Paint order matters: the C behind, the T over it, the chevron last so the
    // one gold element is never occluded.
    strokes: [
      { d: emblemCPath(p), stroke: EMBLEM_SILVER, width: p.cStroke },
      { d: emblemChevronPath(p), stroke: EMBLEM_GOLD, width: p.chevronStroke },
    ],
    fills: [
      { d: t.bar, fill: EMBLEM_SILVER },
      { d: t.stem, fill: EMBLEM_SILVER },
    ],
  };
}
