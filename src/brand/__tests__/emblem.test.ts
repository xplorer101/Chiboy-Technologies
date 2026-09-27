import { describe, expect, it } from "vitest";

import {
  cutCornerSquare,
  EMBLEM_GOLD,
  EMBLEM_GROUND,
  EMBLEM_MIN_JOIN_ANGLE,
  EMBLEM_PARAMS,
  EMBLEM_SILVER,
  EMBLEM_STROKE_ATTRS,
  emblemChevronPath,
  emblemCPath,
  emblemMark,
  emblemTShapes,
} from "@/brand/emblem";

type Point = readonly [number, number];

/**
 * Pulls the `[x, y]` pairs out of a generated path.
 *
 * Paths are emitted as a single `M` followed by bare coordinate pairs, which SVG
 * reads as an implicit lineto after each pair, so this splits on whitespace
 * rather than on a command letter.
 */
function pointsOf(path: string): Point[] {
  const numbers = path
    .replace(/^M\s*/, "")
    .replace(/\s*Z$/, "")
    .trim()
    .split(/\s+/)
    .map(Number);

  expect(numbers.length).toBeGreaterThan(0);
  expect(numbers.length % 2).toBe(0);
  expect(numbers.every((n) => Number.isFinite(n))).toBe(true);

  const pairs: Point[] = [];
  for (let i = 0; i < numbers.length; i += 2) {
    pairs.push([numbers[i] as number, numbers[i + 1] as number]);
  }
  return pairs;
}

/** Axis-aligned bounds of a point set. */
function bounds(points: readonly Point[]) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** The interior angle at each vertex of a polyline, in degrees. */
function interiorAngles(points: readonly Point[], closed = false): number[] {
  const at = (i: number): Point =>
    points[closed ? (i + points.length) % points.length : i] as Point;
  const span = closed ? points.length : points.length - 2;

  return Array.from({ length: closed ? points.length : span }, (_, k) => {
    const i = closed ? k : k + 1;
    const [px, py] = at(i - 1);
    const [cx, cy] = at(i);
    const [nx, ny] = at(i + 1);

    // Direction of *travel* on the way in, which is the reverse of the direction
    // pointing back at the previous point. Using the wrong one reports the
    // reflex angle instead of the interior one.
    const incoming = Math.atan2(cy - py, cx - px);
    const outgoing = Math.atan2(ny - cy, nx - cx);

    let turn = ((outgoing - incoming) * 180) / Math.PI;
    while (turn <= -180) turn += 360;
    while (turn > 180) turn -= 360;

    return 180 - turn;
  });
}

/** Smallest distance between two points, used for clearance checks. */
function minDistance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** One sRGB channel, linearised for WCAG relative luminance. */
function channel(hex: string, offset: number): number {
  const raw = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return raw <= 0.04045 ? raw / 12.92 : Math.pow((raw + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const mark = emblemMark();
const cPoints = pointsOf(emblemCPath());
const chevronPoints = pointsOf(emblemChevronPath());
const t = emblemTShapes();

describe("emblem geometry", () => {
  it("emits a finite path for every element", () => {
    for (const path of [mark.badge.d, ...mark.strokes.map((s) => s.d), ...mark.fills.map((f) => f.d)]) {
      expect(path.startsWith("M ")).toBe(true);
      for (const [x, y] of pointsOf(path)) {
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
      }
    }
  });

  it("uses only absolute move commands, so there is no transform state", () => {
    for (const path of [mark.badge.d, ...mark.strokes.map((s) => s.d), ...mark.fills.map((f) => f.d)]) {
      expect(path).toMatch(/^M( -?[\d.]+){2,16}( Z)?$/);
    }
    // Only the badge and the two T rectangles are closed. The C and the chevron
    // are deliberately open, so the butt cap lands exactly on the parameter
    // values and cuts them at 45 degrees for free.
    expect(mark.badge.d.endsWith(" Z")).toBe(true);
    for (const stroke of mark.strokes) {
      expect(stroke.d.endsWith(" Z")).toBe(false);
    }
  });

  /**
   * The single most valuable guard here. A parameter change that pushes anything
   * outside the 100-unit viewBox silently crops the favicon, and it has to
   * account for the stroke width, not just the centre lines — a point sitting at
   * 99 is still cropped once it is stroked.
   */
  it("keeps every element inside the 100-unit viewBox, including its stroke", () => {
    for (const stroke of mark.strokes) {
      const b = bounds(pointsOf(stroke.d));
      const half = stroke.width / 2;
      expect(b.minX - half).toBeGreaterThanOrEqual(0);
      expect(b.maxX + half).toBeLessThanOrEqual(100);
      expect(b.minY - half).toBeGreaterThanOrEqual(0);
      expect(b.maxY + half).toBeLessThanOrEqual(100);
    }
    for (const path of [mark.badge.d, ...mark.fills.map((f) => f.d)]) {
      const b = bounds(pointsOf(path));
      expect(b.minX).toBeGreaterThanOrEqual(0);
      expect(b.maxX).toBeLessThanOrEqual(100);
      expect(b.minY).toBeGreaterThanOrEqual(0);
      expect(b.maxY).toBeLessThanOrEqual(100);
    }
  });

  /**
   * The composition's whole argument: the C is an open container, the T sits
   * inside it, and the chevron sits in the aperture the C deliberately leaves.
   * If any of those invert, the mark stops reading as container / payload /
   * output and becomes three shapes at random.
   */
  it("nests the T inside the C and the chevron outside the T", () => {
    const c = bounds(cPoints);
    const chevron = bounds(chevronPoints);

    // The T lies wholly within the C's footprint.
    const tBox = bounds([...pointsOf(t.bar), ...pointsOf(t.stem)]);
    expect(tBox.minX).toBeGreaterThan(c.minX);
    expect(tBox.maxX).toBeLessThan(c.maxX);
    expect(tBox.minY).toBeGreaterThan(c.minY);
    expect(tBox.maxY).toBeLessThan(c.maxY);

    // The chevron is entirely to the right of the T, in the aperture.
    expect(chevron.minX).toBeGreaterThan(EMBLEM_PARAMS.tBarRightX);
  });

  it("leaves the chevron pointing right, out through the aperture", () => {
    const reach = EMBLEM_PARAMS.chevronReach;
    expect(reach).toBeGreaterThan(0);
    // The point is the rightmost point of the chevron.
    const [apex] = chevronPoints.filter(([x]) => x === EMBLEM_PARAMS.chevronX + reach);
    expect(apex).toBeDefined();
    expect(apex?.[1]).toBe(EMBLEM_PARAMS.chevronY);
  });

  it("centres the crossbar on the stem, so the T is not a 7", () => {
    const left = EMBLEM_PARAMS.tCentreX - EMBLEM_PARAMS.tBarLeftX;
    const right = EMBLEM_PARAMS.tBarRightX - EMBLEM_PARAMS.tCentreX;
    expect(left).toBeCloseTo(right, 6);
  });

  it("is deterministic, so a rebuild cannot change the mark", () => {
    expect(emblemMark()).toEqual(emblemMark());
    expect(emblemCPath()).toBe(emblemCPath());
    expect(emblemChevronPath()).toBe(emblemChevronPath());
    expect(emblemTShapes()).toEqual(emblemTShapes());
    expect(cutCornerSquare(10, 5)).toEqual(cutCornerSquare(10, 5));
  });
});

describe("emblem joins", () => {
  /**
   * The brand is sharp corners, and sharp corners are only sharp while they stay
   * inside the miter limit. Past it, renderers silently bevel instead, so the
   * mark grows rounded edges on one platform and sharp edges on another — the
   * one thing the flat-vector rule exists to prevent. The C's corners are all
   * 90 or 45 degrees, and the chevron's point is the acute one that matters.
   */
  it("keeps every corner inside the miter limit", () => {
    for (const angle of interiorAngles(cPoints)) {
      expect(angle).toBeGreaterThan(EMBLEM_MIN_JOIN_ANGLE);
    }
    // The chevron folds twice. Its interior angles must clear the limit too.
    for (const angle of interiorAngles(chevronPoints)) {
      expect(angle).toBeGreaterThan(EMBLEM_MIN_JOIN_ANGLE);
    }
  });

  it("holds a right angle and an acute one on either side of the threshold", () => {
    // Sanity-check the helper, so a refactor cannot make the test above pass by
    // measuring the wrong thing.
    expect(
      interiorAngles(
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ],
        true,
      ),
    ).toEqual([90, 90, 90, 90]);

    const spike = interiorAngles(
      [
        [0, 0],
        [10, 0],
        [5, 0.1],
      ],
      true,
    );
    expect(Math.min(...spike)).toBeLessThan(EMBLEM_MIN_JOIN_ANGLE);
  });

  it("declares butt caps and mitered joins, and nothing softer", () => {
    expect(EMBLEM_STROKE_ATTRS.strokeLinecap).toBe("butt");
    expect(EMBLEM_STROKE_ATTRS.strokeLinejoin).toBe("miter");
    expect(EMBLEM_STROKE_ATTRS.strokeMiterlimit).toBeGreaterThanOrEqual(4);
    expect(EMBLEM_STROKE_ATTRS.fill).toBe("none");
  });
});

describe("emblem legibility", () => {
  /**
   * Every gap in the mark, in units, edge to edge. These are the numbers that
   * decide whether the three forms stay three forms at a 32px header, and they
   * were the reason the proportions were tuned rather than guessed.
   */
  it("keeps a clear gap between the C and the T", () => {
    const cHalfStroke = EMBLEM_PARAMS.cStroke / 2;
    const innerLeft = EMBLEM_PARAMS.cHalf - cHalfStroke;
    const innerBottom = 100 - innerLeft;

    expect(EMBLEM_PARAMS.tBarLeftX - innerLeft).toBeGreaterThan(4);
    expect(innerBottom - EMBLEM_PARAMS.tStemEndY).toBeGreaterThan(4);
    expect(EMBLEM_PARAMS.tBarTopY - innerLeft).toBeGreaterThan(6);
  });

  it("keeps a clear gap between the T and the chevron", () => {
    const gap = EMBLEM_PARAMS.chevronX - EMBLEM_PARAMS.chevronStroke / 2 - EMBLEM_PARAMS.tBarRightX;
    expect(gap).toBeGreaterThan(3);
  });

  it("keeps the chevron clear of the C's terminals", () => {
    // The terminals are where the C stops, and the chevron has to pass them
    // without touching. Measured on the real paths, not the parameters, so this
    // checks the two shapes actually agree.
    const [topTerminal, bottomTerminal] = [cPoints[0] as Point, cPoints.at(-1) as Point];
    const [topArm, bottomArm] = [chevronPoints[0] as Point, chevronPoints.at(-1) as Point];
    const clearance = EMBLEM_PARAMS.cStroke / 2 + EMBLEM_PARAMS.chevronStroke / 2;

    expect(minDistance(topTerminal, topArm) - clearance).toBeGreaterThan(3);
    expect(minDistance(bottomTerminal, bottomArm) - clearance).toBeGreaterThan(3);
  });

  it("overlaps the T's stem into its crossbar, so no seam can show", () => {
    // They abut on the same Y rather than being butted end to end, so no hairline
    // seam appears between them at any zoom level.
    expect(pointsOf(t.stem)[0]?.[1]).toBe(EMBLEM_PARAMS.tBarTopY);
    expect(pointsOf(t.bar)[0]?.[1]).toBe(EMBLEM_PARAMS.tBarTopY);
  });

  /**
   * The gold has to be the one element that reads as a different material.
   * Gold-500 and the silver sit at almost identical luminance, so an accent that
   * differed only by hue would be invisible at favicon size; the gold is
   * therefore lifted above the silver in lightness as well.
   */
  it("separates the gold from the silver by lightness, not only by hue", () => {
    expect(relativeLuminance(EMBLEM_GOLD)).toBeGreaterThan(relativeLuminance(EMBLEM_SILVER));
    expect(contrastRatio(EMBLEM_GOLD, EMBLEM_SILVER)).toBeGreaterThan(1.2);
  });

  it("uses the gold for the chevron and nothing else", () => {
    // The brand rule is gold as an accent, never gold-dominant. One element out
    // of five carrying it is the whole budget.
    const goldElements = [
      ...mark.strokes.filter((s) => s.stroke === EMBLEM_GOLD),
      ...mark.fills.filter((f) => f.fill === EMBLEM_GOLD),
    ];
    expect(goldElements).toHaveLength(1);
    expect(mark.strokes[1]?.stroke).toBe(EMBLEM_GOLD);
  });

  it("paints the chevron last, so the gold is never occluded", () => {
    expect(mark.strokes[mark.strokes.length - 1]?.stroke).toBe(EMBLEM_GOLD);
  });
});

describe("emblem contrast", () => {
  /**
   * The mark is designed against navy. The silver is legible there and nowhere
   * else, which is why the badge is on by default.
   */
  it("holds the silver and the gold above 4.5:1 on the navy badge", () => {
    for (const colour of [EMBLEM_SILVER, EMBLEM_GOLD]) {
      expect(contrastRatio(colour, EMBLEM_GROUND)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("confirms the silver would be unusable on white, which is why the badge is on by default", () => {
    // About 2.3:1 on white. This is the number that explains why the badge is
    // mandatory rather than decorative, and why the header and footer both rely
    // on it.
    expect(contrastRatio(EMBLEM_SILVER, EMBLEM_GROUND)).toBeGreaterThan(4.5);
    expect(contrastRatio(EMBLEM_SILVER, "#FFFFFF")).toBeLessThan(3);
  });

  it("keeps the badge navy rather than near-black, so the logo is on-brand", () => {
    // A deliberate change from the previous mark, which used a near-black badge
    // that existed in no brand palette. This is the site's own Deep Navy.
    expect(EMBLEM_GROUND).toBe("#1B3A6B");
  });

  it("keeps every declared colour a plain six-digit hex", () => {
    for (const colour of [EMBLEM_GROUND, EMBLEM_SILVER, EMBLEM_GOLD]) {
      expect(colour).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("uses no colour outside the three the brand specifies", () => {
    // Guards against a fourth tone creeping in, which is how the two previous
    // drafts ended up with a cyan and a neon blue that were in no palette.
    const used = new Set([
      ...mark.strokes.map((s) => s.stroke),
      ...mark.fills.map((f) => f.fill),
      mark.badge.fill,
    ]);
    expect([...used].sort()).toEqual([EMBLEM_GOLD, EMBLEM_GROUND, EMBLEM_SILVER].sort());
  });
});
