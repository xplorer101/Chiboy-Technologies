#!/usr/bin/env tsx
/**
 * Generates brand-native placeholder cover images for portfolio projects.
 *
 * WHY
 * ---
 * The specification forbids stock photography, generic AI illustration and
 * invented client work, but the portfolio still has to look like a real,
 * deliberate site rather than a set of broken image icons.
 *
 * So the cover art is *generated*: deterministic abstract geometry derived from
 * the project slug, in the brand palette, with a visible PLACEHOLDER label. It
 * is vector (SVG), so it stays crisp on any display, weighs a few kilobytes and
 * needs no image pipeline.
 *
 * Replacing a placeholder with a real photograph means dropping a file into
 * public/portfolio/ and updating the `coverImage` field for that project. The
 * card component picks up raster images through next/image automatically.
 *
 * Usage: npm run placeholders
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "portfolio");

const WIDTH = 1200;
const HEIGHT = 750;

/** Brand palette, matching src/app/globals.css. */
const NAVY_950 = "#0a1018";
const NAVY_900 = "#0f1926";
const NAVY_800 = "#16263a";
const NAVY_700 = "#1e3550";
const NAVY_600 = "#2a4a6b";
const GOLD_500 = "#c9a227";
const GOLD_400 = "#d9b64a";

/**
 * Deterministic 32-bit hash (FNV-1a). The same slug always produces the same
 * artwork, so re-running this script never churns files.
 */
function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value >>> 0;
}

/** Small seeded PRNG (mulberry32) for reproducible layouts. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Point {
  x: number;
  y: number;
}

/**
 * Places nodes on a loose grid with jitter. A pure random scatter looks like
 * noise; a jittered grid reads as an intentional technical diagram.
 */
function generateNodes(random: () => number, count: number): Point[] {
  const columns = 4;
  const rows = 3;
  const marginX = 150;
  const marginY = 130;
  const usableWidth = WIDTH - marginX * 2;
  const usableHeight = HEIGHT - marginY * 2;
  const cellWidth = usableWidth / (columns - 1);
  const cellHeight = usableHeight / (rows - 1);

  const nodes: Point[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (nodes.length >= count) break;
      // Skip a few cells so the graph is not perfectly uniform.
      if (random() < 0.18) continue;
      nodes.push({
        x: marginX + column * cellWidth + (random() - 0.5) * cellWidth * 0.42,
        y: marginY + row * cellHeight + (random() - 0.5) * cellHeight * 0.42,
      });
    }
  }

  while (nodes.length < count) {
    nodes.push({
      x: marginX + random() * usableWidth,
      y: marginY + random() * usableHeight,
    });
  }

  return nodes;
}

function buildSvg(slug: string, title: string): string {
  const random = createRandom(hash(slug));
  const nodes = generateNodes(random, 7 + Math.floor(random() * 3));

  // Connect each node to its nearest few neighbours, which produces a coherent
  // mesh rather than crossing lines across the whole canvas.
  const edges: { from: Point; to: Point; distance: number }[] = [];
  const maxDistance = 330;

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance <= maxDistance) edges.push({ from: a, to: b, distance });
    }
  }
  edges.sort((a, b) => a.distance - b.distance);
  const selected = edges.slice(0, Math.max(4, Math.floor(edges.length * 0.55)));

  // One edge is highlighted in gold, giving each cover a single focal accent.
  const accentIndex = Math.floor(random() * Math.max(1, selected.length));
  const accentNodeIndex = Math.floor(random() * nodes.length);

  const edgeMarkup = selected
    .map((edge, index) => {
      const isAccent = index === accentIndex;
      const stroke = isAccent ? GOLD_500 : NAVY_600;
      const opacity = isAccent ? 0.85 : 0.4;
      const width = isAccent ? 2 : 1.25;
      return `<line x1="${edge.from.x.toFixed(1)}" y1="${edge.from.y.toFixed(1)}" x2="${edge.to.x.toFixed(1)}" y2="${edge.to.y.toFixed(1)}" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}" />`;
    })
    .join("\n    ");

  const nodeMarkup = nodes
    .map((node, index) => {
      const isAccent = index === accentNodeIndex;
      const radius = isAccent ? 8 : 4.5;
      const fill = isAccent ? GOLD_400 : NAVY_600;
      const ring = isAccent
        ? `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${radius + 7}" fill="none" stroke="${GOLD_500}" stroke-width="1" opacity="0.35" />`
        : "";
      return `${ring}<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${radius}" fill="${fill}" />`;
    })
    .join("\n    ");

  // Grid pattern gives the artwork structure without competing for attention.
  const gridCells = Array.from({ length: 8 }, (_, index) => index).map(
    (index) =>
      `<line x1="${((index + 1) * WIDTH) / 9}" y1="0" x2="${((index + 1) * WIDTH) / 9}" y2="${HEIGHT}" stroke="${NAVY_800}" stroke-width="1" opacity="0.5" />`,
  );
  const gridRows = Array.from({ length: 5 }, (_, index) => index).map(
    (index) =>
      `<line x1="0" y1="${((index + 1) * HEIGHT) / 6}" x2="${WIDTH}" y2="${((index + 1) * HEIGHT) / 6}" stroke="${NAVY_800}" stroke-width="1" opacity="0.5" />`,
  );

  const gradientId = `bg-${hash(slug).toString(36)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Placeholder cover art for ${escapeXml(title)}">
  <defs>
    <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NAVY_900}" />
      <stop offset="100%" stop-color="${NAVY_950}" />
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#${gradientId})" />
  <g>
    ${gridCells.join("\n    ")}
    ${gridRows.join("\n    ")}
  </g>

  <g>
    ${edgeMarkup}
  </g>
  <g>
    ${nodeMarkup}
  </g>

  <!-- Explicit placeholder marker. This is sample content, not real work. -->
  <g>
    <rect x="56" y="${HEIGHT - 108}" width="286" height="52" rx="8" fill="${NAVY_900}" stroke="${GOLD_500}" stroke-width="1.25" stroke-dasharray="6 5" />
    <text x="76" y="${HEIGHT - 74}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="19" font-weight="700" letter-spacing="2.6" fill="${GOLD_400}">PLACEHOLDER</text>
  </g>
</svg>
`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Kept in sync with prisma/seed.ts. The slug list lives here rather than being
 * imported so this script stays runnable on its own.
 */
const PROJECTS = [
  "placeholder-software-maintenance",
  "placeholder-software-installation",
  "placeholder-networking",
  "placeholder-graphics-design",
  "placeholder-technology-sales",
  "placeholder-it-consultancy",
];

function main(): void {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const slug of PROJECTS) {
    const title = slug
      .replace(/^placeholder-/, "")
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    const svg = buildSvg(slug, title);
    const file = path.join(OUTPUT_DIR, `${slug}.svg`);
    writeFileSync(file, svg, "utf8");
    console.log(`wrote ${path.relative(process.cwd(), file)}`);
  }

  console.log(`\n${PROJECTS.length} placeholder covers generated.`);
  console.log(
    "Replace with real project media by adding files to public/portfolio/ and updating coverImage in prisma/seed.ts.",
  );
}

main();
