import { ArrowRight, MessageCircle, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";
import { hero, getWhatsAppLink, defaultWhatsAppMessage } from "@/content/site";

/**
 * Homepage hero.
 *
 * The visual is an inline SVG rather than a photograph, deliberately: stock
 * "person typing at a laptop" imagery is the fastest way for a technology
 * company to look generic, and the specification rules it out. The motif is a
 * system topology — nodes over a grid — which reads as technical and deliberate
 * at a glance.
 *
 * It is inline rather than an image file so it stays crisp at any size, costs no
 * network request, and cannot cause layout shift.
 */
export function Hero() {
  const whatsappHref = getWhatsAppLink(defaultWhatsAppMessage);

  return (
    <section className="relative overflow-hidden bg-navy-900">
      {/* Soft gold bloom, heavily restrained. A gradient wash rather than a
          decorative shape, so it does not compete with the copy. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-32 size-[34rem] rounded-full opacity-[0.14] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-gold-500), transparent 68%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(1 0 0 / 0.035) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.035) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <Container className="relative">
        <div className="grid items-center gap-14 py-20 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-28">
          {/* Copy */}
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-gold-400 uppercase">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Technology services for individuals &amp; businesses
            </p>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
              {hero.headline}
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-charcoal-300 sm:text-xl">
              {hero.subtext}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={hero.primaryCta.href} variant="accent" size="lg">
                {hero.primaryCta.label}
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>

              <ButtonLink
                href={hero.secondaryCta.href}
                variant="ghostDark"
                size="lg"
                className="sm:border-white/30"
              >
                {hero.secondaryCta.label}
              </ButtonLink>
            </div>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold-400 underline-offset-4 transition-colors hover:text-gold-300 hover:underline"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Or message us on WhatsApp
              </a>
            ) : null}
          </div>

          {/* Visual */}
          <div className="relative lg:pl-6">
            <TopologyVisual />
          </div>
        </div>
      </Container>
    </section>
  );
}

/**
 * Abstract system-topology graphic. Decorative only, so it is hidden from
 * assistive technology rather than being given a description nobody needs.
 */
function TopologyVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-white/10 bg-navy-950/60 shadow-[var(--shadow-lift)]"
    >
      <svg viewBox="0 0 520 390" className="size-full" fill="none">
        <defs>
          <linearGradient id="hero-edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-navy-500)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--color-navy-600)" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Grid */}
        <g stroke="var(--color-navy-700)" strokeWidth="1" opacity="0.4">
          {[80, 160, 240, 320, 400, 480].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="390" />
          ))}
          {[65, 130, 195, 260, 325].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="520" y2={y} />
          ))}
        </g>

        {/* Connections */}
        <g stroke="url(#hero-edge)" strokeWidth="1.75">
          <line x1="110" y1="80" x2="240" y2="130" />
          <line x1="110" y1="80" x2="150" y2="230" />
          <line x1="240" y1="130" x2="380" y2="90" />
          <line x1="240" y1="130" x2="300" y2="250" />
          <line x1="150" y1="230" x2="300" y2="250" />
          <line x1="300" y1="250" x2="430" y2="200" />
          <line x1="380" y1="90" x2="430" y2="200" />
          <line x1="150" y1="230" x2="190" y2="330" />
          <line x1="190" y1="330" x2="360" y2="320" />
          <line x1="300" y1="250" x2="360" y2="320" />
        </g>

        {/* Gold accent path — a single highlighted route through the mesh */}
        <g stroke="var(--color-gold-500)" strokeWidth="2.25" opacity="0.95">
          <line x1="110" y1="80" x2="240" y2="130" />
          <line x1="240" y1="130" x2="300" y2="250" />
          <line x1="300" y1="250" x2="430" y2="200" />
        </g>

        {/* Nodes */}
        <g fill="var(--color-navy-600)">
          {[
            [380, 90],
            [190, 330],
            [360, 320],
            [150, 230],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" />
          ))}
        </g>
        <g fill="var(--color-navy-400)">
          {[
            [110, 80],
            [240, 130],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="7" />
          ))}
        </g>

        {/* Focal node */}
        <g>
          <circle cx="300" cy="250" r="20" fill="var(--color-gold-500)" opacity="0.18" />
          <circle cx="300" cy="250" r="12" fill="var(--color-gold-400)" />
          <circle cx="300" cy="250" r="5" fill="var(--color-navy-950)" />
        </g>
        <g>
          <circle cx="430" cy="200" r="13" fill="var(--color-gold-500)" opacity="0.15" />
          <circle cx="430" cy="200" r="7" fill="var(--color-gold-400)" />
        </g>
      </svg>
    </div>
  );
}
