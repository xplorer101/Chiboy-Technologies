import { ArrowRight, MessageCircle } from "lucide-react";

import { buttonStyles, ButtonLink } from "@/components/ui/Button";
import { DarkHero } from "@/components/sections/DarkHero";
import { hero, getWhatsAppLink, defaultWhatsAppMessage } from "@/content/site";

/**
 * Homepage hero.
 *
 * The dark band the About page also uses, so the site opens with one visual
 * language rather than a light one and a dark one. Everything shared — navy
 * background, container width, padding, heading and lead — comes from
 * `DarkHero`; what is specific to the homepage is the copy and the two calls to
 * action.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * The photograph. The previous hero put a grey placeholder image on the right,
 * which communicated nothing and left an empty rectangle on every screen size.
 * A band of copy on navy reads as deliberate; a grey box reads as a missing
 * asset, which is what it was.
 *
 * A breadcrumb is not included either. The homepage is the root of the site, so
 * there is no trail to trail from, and the same argument that produced the
 * "About" crumb on its own page — never invent one that names nothing — applies
 * even more directly here.
 */
export function Hero() {
  const whatsappHref = getWhatsAppLink(defaultWhatsAppMessage);

  return (
    <DarkHero
      heading={hero.headline}
      lead={hero.subtext}
      actions={
        <>
          <ButtonLink href={hero.primaryCta.href} variant="accent" size="lg">
            {hero.primaryCta.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>

          {whatsappHref ? (
            /* `wa.me` leaves the site, so it is an anchor rather than a router
               link, and it opens safely. It used to be a text link beside the
               button; on a dark band the outlined button gives it the contrast
               a plain link never had. */
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: "ghostDark", size: "lg" })}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp
            </a>
          ) : null}
        </>
      }
    />
  );
}
