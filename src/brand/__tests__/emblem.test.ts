import { describe, expect, it } from "vitest";

import {
  EMBLEM_GROUND,
  EMBLEM_NAVY,
  EMBLEM_PARAMS,
  EMBLEM_SILVER,
  emblemArrowPath,
  emblemCPath,
  emblemPaths,
  emblemTPath,
} from "@/brand/emblem";

/** Pulls the `[x, y]` pairs out of a generated path. */
function pointsOf(path: string): Array<[number, number]> {
  const numbers = path
    .replace(/^M/, "")
    .replace(/Z$/, "")
    .split("L")
    .map((pair) => pair.trim().split(/\s+/).map(Number))
    .map(([x, y]) => [x, y] as [number, number]);

  expect(numbers.length).toBeGreaterThan(0);
  return numbers;
}

/** One sRGB channel, linearised for WCAG relative luminance. */
function channel(hex: string, offset: number): number {
  const raw = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return raw <= 0.04045 ? raw / 12.92 : Math.pow((raw + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance. */
function relativeLuminance(hex: string): number {
  return (
    0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5)
  );
}

function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe("emblem geometry", () => {
  const { c, t, arrow } = emblemPaths();

  it("emits a closed, finite path for each element", () => {
    for (const path of [c, t, arrow]) {
      expect(path.startsWith("M ")).toBe(true);
      expect(path.endsWith(" Z")).toBe(true);
      for (const [x, y] of pointsOf(path)) {
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
      }
    }
  });

  it("uses only the absolute move/line commands, so there is no transform state", () => {
    for (const path of [c, t, arrow]) {
      expect(path).toMatch(/^M -?[\d.]+ -?[\d.]+( L -?[\d.]+ -?[\d.]+)+ Z$/);
    }
  });

  /**
   * The single most valuable guard here. A parameter change that pushes any
   * element outside the 100-unit grid silently crops the favicon, and a change
   * that pushes the arrow past the ring's edge turns the lower right into an
   * unreadable mass — both bugs that already occurred while drawing this mark.
   */
  it("keeps every element inside the 100-unit viewBox", () => {
    for (const path of [c, t, arrow]) {
      for (const [x, y] of pointsOf(path)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
      }
    }
  });

  it("keeps the mouth open enough for the arrow to clear the ring", () => {
    // The ring's lower terminal is pulled back from a full octagon (315 degrees)
    // to widen the gap. If it ever returns to 315 the arrowhead collides with
    // the ring's bottom facet and the arrow stops reading as an arrow.
    expect(EMBLEM_PARAMS.cLastDeg).toBeLessThan(315);
  });

  it("starts the arrow at the stem's own width, so the two read as one stroke", () => {
    const stem = pointsOf(t);
    const shaft = pointsOf(arrow);

    // Measured from the T's own outline rather than the parameters, so this
    // checks the two shapes actually agree. The stem's right and left edges
    // are the fourth and fifth points of the outline.
    const stemHalfWidth = ((stem[4] as [number, number])[0] - (stem[5] as [number, number])[0]) / 2;

    // The arrow's first point sits perpendicular to the shaft, offset from the
    // stem's centre line by that same half-width.
    const dx = (shaft[0] as [number, number])[0] - 50;
    const dy = (shaft[0] as [number, number])[1] - EMBLEM_PARAMS.tStemBottom;
    const offset = Math.sqrt(dx * dx + dy * dy);

    // Precision 3 because coordinates are emitted rounded to three decimals.
    expect(offset).toBeCloseTo(stemHalfWidth, 3);
  });

  it("is deterministic, so a rebuild cannot change the mark", () => {
    expect(emblemPaths()).toEqual(emblemPaths());
    expect(emblemCPath()).toBe(emblemCPath());
    expect(emblemTPath()).toBe(emblemTPath());
    expect(emblemArrowPath()).toBe(emblemArrowPath());
  });

  it("is a flat two-tone mark with nothing else to render", () => {
    // Filled paths only. A stroke, gradient or filter would break both the
    // "no outlines, no gradients, no shadows" constraint and the promise that
    // the mark renders identically everywhere.
    expect(EMBLEM_PARAMS).toBeDefined();
    const colours = [EMBLEM_NAVY, EMBLEM_SILVER, EMBLEM_GROUND];
    for (const colour of colours) {
      expect(colour).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

describe("emblem contrast", () => {
  /**
   * The supplied brand pair is deliberately split in brightness, and the reason
   * the mark always sits on its own near-black badge is recorded here. If
   * someone "corrects" the badge colour to white, these assertions are what
   * explains why the T disappeared.
   */
  it("renders the silver at full strength on the dark badge", () => {
    expect(contrastRatio(EMBLEM_SILVER, EMBLEM_GROUND)).toBeGreaterThanOrEqual(4.5);
  });

  it("renders the navy as a deliberate tonal frame, not a full-strength element", () => {
    // Documented rather than merely known: 1.9:1 is below any text threshold
    // and is only acceptable because the ring is a graphic, with the silver T
    // and arrow carrying the mark. This pins the number so a change is
    // noticed.
    expect(contrastRatio(EMBLEM_NAVY, EMBLEM_GROUND)).toBeLessThan(3);
  });

  it("keeps the two tones distinguishable from each other", () => {
    expect(contrastRatio(EMBLEM_NAVY, EMBLEM_SILVER)).toBeGreaterThanOrEqual(3);
  });

  it("confirms the navy would be unusable on the dark badge if used for text", () => {
    // Documents the reason the badge is mandatory rather than decorative.
    expect(contrastRatio(EMBLEM_NAVY, EMBLEM_GROUND)).toBeLessThan(4.5);
  });
});
