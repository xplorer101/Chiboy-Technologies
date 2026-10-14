import Image from "next/image";
import { ArrowRight, MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";
import { hero, getWhatsAppLink, defaultWhatsAppMessage } from "@/content/site";

/**
 * Homepage hero.
 *
 * A light, left-aligned introduction with a photograph on the right. The photo
 * is read from `/public/images/hero.jpg`; until the real photograph is supplied
 * the committed file is a plain grey placeholder of the same shape, so the
 * layout does not shift when it is replaced.
 */
export function Hero() {
  const whatsappHref = getWhatsAppLink(defaultWhatsAppMessage);

  return (
    <section className="border-b border-charcoal-200 bg-white">
      <Container>
        <div className="grid items-center gap-10 py-14 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:py-20">
          {/* Copy */}
          <div className="max-w-xl">
            <h1 className="text-4xl font-semibold text-navy-900 sm:text-5xl">
              {hero.headline}
            </h1>

            <p className="mt-5 leading-relaxed text-charcoal-700">
              {hero.subtext}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
              <ButtonLink href={hero.primaryCta.href} size="lg">
                {hero.primaryCta.label}
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>

              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 font-semibold text-blue-700 underline-offset-4 hover:text-blue-800 hover:underline"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          {/* Photo */}
          <div>
            <Image
              src="/images/hero.jpg"
              alt={hero.photoAlt}
              width={1200}
              height={900}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/3] w-full rounded-[var(--radius-card)] border border-charcoal-200 object-cover"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
