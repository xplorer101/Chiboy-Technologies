import type { ReactNode } from "react";

import { Container } from "@/components/ui/Layout";

/**
 * The site's dark hero band.
 *
 * ONE COMPONENT, TWO PAGES
 * ------------------------
 * The About page and the homepage both open with the same navy band. They were
 * separate pieces of markup, which meant a change to one — a heading size, a
 * padding value, a colour — had to be made twice and only ever was once. This
 * is the whole hero: background, container width, vertical padding, heading and
 * lead. Everything page-specific is a slot.
 *
 * WHY THE SLOTS RATHER THAN PROPS FOR EVERY DIFFERENCE
 * ----------------------------------------------------
 * The two pages differ in *what* they show (breadcrumbs and an experience line
 * here, no image there), not in *how* the band is laid out. Encoding those
 * differences as booleans — `showBreadcrumbs`, `showExperienceLine` — would tie
 * this component to the two pages that happen to exist. Nodes as slots let each
 * page pass its own markup while the shared parts stay genuinely shared.
 *
 * All colour and spacing decisions are made here, so the two pages cannot drift
 * apart; the contrast of white and light-grey text on `bg-navy-900` is the
 * About page's, which is unchanged.
 */
export function DarkHero({
  breadcrumbs,
  heading,
  lead,
  note,
  actions,
}: {
  /** Rendered above the heading. Omit for a page that has no crumb trail. */
  breadcrumbs?: ReactNode;
  heading: string;
  lead?: ReactNode;
  /** A small line under the lead — the About page's experience statement. */
  note?: ReactNode;
  /** The call-to-action row. Buttons, or whatever the page needs. */
  actions?: ReactNode;
}) {
  return (
    <section className="bg-navy-900">
      <Container className="py-12 sm:py-16">
        {breadcrumbs}

        <div className="max-w-3xl">
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            {heading}
          </h1>

          {lead ? <p className="mt-5 text-lg leading-relaxed text-charcoal-300">{lead}</p> : null}

          {note}

          {actions ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              {actions}
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
