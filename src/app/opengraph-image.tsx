import { ImageResponse } from "next/og";

import { EMBLEM_GOLD, EMBLEM_GROUND } from "@/brand/emblem";
import { site } from "@/content/site";

/**
 * Open Graph / Twitter card image.
 *
 * The root layout asks for `summary_large_image`, which is meaningless without
 * an image: platforms fall back to a small text card, and a link shared on
 * WhatsApp or LinkedIn — the channels this business actually uses — renders
 * as a bare URL.
 *
 * Generated rather than committed as a bitmap so it stays on-palette when the
 * brand changes and needs no design tooling to regenerate. Colours come from
 * the same tokens as the logo, so the card cannot drift from the site.
 *
 * No custom font: satori cannot read WOFF2, and the only font committed is the
 * site's WOFF2 — correct for the browser at 27 KB, but unusable here. Shipping
 * a second TTF purely for this card would mean a larger binary in the repo and
 * a conversion step nobody can reproduce. The built-in face is legible at
 * 1200x630, and the brand signal on a social card is the colour and the name.
 */

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Matches `--color-navy-950`, the site's darkest surface. */
const NAVY_950 = "#0B1526";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: NAVY_950,
          padding: "72px 80px",
          // A gold rule down the left edge: the accent, used as an accent.
          borderLeft: `16px solid ${EMBLEM_GOLD}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 76,
              height: 76,
              borderRadius: 18,
              background: EMBLEM_GROUND,
              color: EMBLEM_GOLD,
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            CT
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 4,
              color: "#FFFFFF",
            }}
          >
            {site.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#FFFFFF",
              maxWidth: 900,
            }}
          >
            {site.tagline}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: EMBLEM_GOLD, fontWeight: 600 }}>
            Software &middot; Networks &middot; Graphics &middot; IT Support
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
