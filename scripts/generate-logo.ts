#!/usr/bin/env tsx
/**
 * Writes the static SVG logo assets from the shared geometry in
 * `@/brand/emblem`, so the favicon, the downloadable mark and the component on
 * the page can never drift apart.
 *
 * WHY GENERATE INSTEAD OF HAND-DRAWING
 * ----------------------------------
 * The emblem is three filled paths on a 100-unit grid with no strokes,
 * gradients or filters, so it needs no image pipeline: it is a few hundred
 * bytes, scales to any density, and can be recoloured with a text editor. The
 * geometry is generated because every coordinate is a relationship between
 * radii, angles and widths, which is far easier to review and adjust as
 * parameters than as raw path data.
 *
 * OUTPUTS
 * -------
 *   public/brand/emblem.svg         mark on transparent, for light backgrounds
 *   public/brand/emblem-dark.svg    mark on the near-black badge it is designed for
 *   public/brand/favicon.svg        square badge for browsers and app icons
 *   src/app/icon.svg                App Router favicon convention
 *
 * Usage: npm run logo
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  EMBLEM_GROUND,
  EMBLEM_NAVY,
  EMBLEM_SILVER,
  emblemPaths,
} from "../src/brand/emblem";

/** Corner radius of the dark badge, as a fraction of the 100-unit grid. */
const BADGE_RADIUS = 18;

const paths = emblemPaths();

/** The mark's three filled paths, in paint order. */
function mark(): string {
  return [
    `  <path d="${paths.c}" fill="${EMBLEM_NAVY}"/>`,
    `  <path d="${paths.t}" fill="${EMBLEM_SILVER}"/>`,
    `  <path d="${paths.arrow}" fill="${EMBLEM_NAVY}"/>`,
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

function badgeBody(fill: string): string {
  return [
    `  <rect width="100" height="100" rx="${BADGE_RADIUS}" fill="${fill}"/>`,
    mark(),
  ].join("\n");
}

function main(): void {
  const brandDir = path.join(process.cwd(), "public", "brand");
  if (!existsSync(brandDir)) {
    mkdirSync(brandDir, { recursive: true });
  }

  const targets: Array<[string, string]> = [
    // Transparent: the mark on its own, to place on any light surface.
    [path.join(brandDir, "emblem.svg"), svg(mark())],
    // On the near-black badge. The navy and silver are only legible against a
    // dark ground, so this is the version to use on a website, in print or in
    // an email signature.
    [path.join(brandDir, "emblem-dark.svg"), svg(badgeBody(EMBLEM_GROUND))],
    [path.join(brandDir, "favicon.svg"), svg(badgeBody(EMBLEM_GROUND))],
    // Next.js picks this up by file convention and serves it as the favicon.
    [path.join(process.cwd(), "src", "app", "icon.svg"), svg(badgeBody(EMBLEM_GROUND))],
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
