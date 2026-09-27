#!/usr/bin/env tsx
/**
 * Writes the static SVG logo assets from the shared geometry in
 * `src/brand/emblem`, so the favicon, the downloadable mark and the component on
 * the page can never drift apart.
 *
 * WHY GENERATE INSTEAD OF HAND-DRAWING
 * ----------------------------------
 * The emblem is a filled badge, two solid rectangles and two stroked paths on a
 * 100-unit grid. No gradients, no filters, no rasters, so it needs no image
 * pipeline: it is a few hundred bytes, scales to any density, and can be
 * recoloured with a text editor. The geometry is generated because every
 * coordinate is a relationship between half-widths, corner cuts and weights,
 * which is far easier to review and adjust as parameters than as raw path data.
 *
 * OUTPUTS
 * -------
 *   public/brand/emblem.svg         the mark alone, on a transparent ground
 *   public/brand/emblem-dark.svg    the mark on its navy badge — the version to
 *                                   use on a website, in print or in a signature
 *   public/brand/favicon.svg        the square badge, for browsers and app icons
 *   src/app/icon.svg                App Router favicon convention
 *
 * The badge-less variant is kept this time, unlike the previous mark. The
 * silver here measures 4.9:1 on the navy badge, which is comfortably legible,
 * and the badge is a cut-corner square rather than the only thing holding the
 * silhouette together — so a transparent-ground asset is genuinely useful for
 * placing the mark on a light surface of the user's own choosing.
 *
 * Usage: npm run logo
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { EMBLEM_STROKE_ATTRS, emblemMark } from "../src/brand/emblem";

/** The shared stroke attributes, in the attribute spelling an SVG file needs. */
const STROKE_ATTRS = [
  `fill="${EMBLEM_STROKE_ATTRS.fill}"`,
  `stroke-linecap="${EMBLEM_STROKE_ATTRS.strokeLinecap}"`,
  `stroke-linejoin="${EMBLEM_STROKE_ATTRS.strokeLinejoin}"`,
  `stroke-miterlimit="${EMBLEM_STROKE_ATTRS.strokeMiterlimit}"`,
].join(" ");

/** The mark as SVG elements, in paint order, without the badge. */
function mark(): string {
  const m = emblemMark();
  return [
    ...m.strokes.map(
      (s) => `  <path d="${s.d}" stroke="${s.stroke}" stroke-width="${s.width}" ${STROKE_ATTRS}/>`,
    ),
    ...m.fills.map((f) => `  <path d="${f.d}" fill="${f.fill}"/>`),
  ].join("\n");
}

function svg(body: string): string {
  // The standalone assets are opened directly, embedded, or downloaded, so they
  // carry a real accessible name. The in-page component omits it instead,
  // because there the visible wordmark already names the brand and a second
  // label would be announced twice.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="CHIBOY TECHNOLOGIES">`,
    body,
    `</svg>`,
    "",
  ].join("\n");
}

function badgeBody(): string {
  const m = emblemMark();
  return [`  <path d="${m.badge.d}" fill="${m.badge.fill}"/>`, mark()].join("\n");
}

function main(): void {
  const brandDir = path.join(process.cwd(), "public", "brand");
  if (!existsSync(brandDir)) {
    mkdirSync(brandDir, { recursive: true });
  }

  const targets: Array<[string, string]> = [
    // Transparent: the mark on its own, to place on a light surface.
    [path.join(brandDir, "emblem.svg"), svg(mark())],
    [path.join(brandDir, "emblem-dark.svg"), svg(badgeBody())],
    [path.join(brandDir, "favicon.svg"), svg(badgeBody())],
    // Next.js picks this up by file convention and serves it as the favicon.
    [path.join(process.cwd(), "src", "app", "icon.svg"), svg(badgeBody())],
  ];

  for (const [file, contents] of targets) {
    writeFileSync(file, contents, "utf8");
    console.log(`wrote ${path.relative(process.cwd(), file)}`);
  }

  console.log("\n4 logo assets generated.");
  console.log(
    "The emblem is defined once in src/brand/emblem.ts — change a parameter there and re-run to update every asset and the on-page mark.",
  );
}

main();
