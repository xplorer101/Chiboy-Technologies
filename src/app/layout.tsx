import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import {
  getContactDetails,
  getPhoneLink,
  getStructuredContact,
  site,
} from "@/content/site";
import "./globals.css";

/**
 * Root layout: fonts, site-wide metadata, and the persistent chrome.
 *
 * The font is self-hosted by next/font, which removes the render-blocking
 * request to Google and eliminates layout shift. `display: "swap"` plus the
 * generated fallback metrics keep text visible while the font loads.
 *
 * The woff2 is committed to the repository and loaded with `next/font/local`
 * rather than fetched from Google at build time. `next/font/google` makes the
 * production build depend on reaching fonts.gstatic.com, which fails the build
 * outright on a restricted or unreliable network — and leaves the correct font
 * un-obtainable with no local fallback. Self-hosting makes builds
 * reproducible and offline-capable, and keeps the site working if Google is
 * unreachable. The file is the official Plus Jakarta Sans latin subset,
 * variable across weights 200-800 (27 KB, covering every weight used).
 */
const jakarta = localFont({
  src: "../assets/fonts/plus-jakarta-sans-latin-variable.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--font-jakarta",
  // Overrides the automatic fallback metrics so the fallback uses a similar
  // width, keeping the swap visually stable.
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
  // Silences any glyph outside the latin subset instead of hitting the
  // network for an extra unicode-range file.
  adjustFontFallback: "Arial",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  creator: site.name,
  publisher: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: "/",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0B1526",
  width: "device-width",
  initialScale: 1,
  // Not capped: pinch-zoom is an accessibility requirement.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const contact = getContactDetails();
  // Built once here and handed to the header, so the client component never
  // has to construct a link from the raw environment value.
  const phoneHref = getPhoneLink();

  return (
    <html lang="en-GB" className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Local business structured data. Only factual, supplied values are
            emitted — no ratings, review counts, coordinates or invented local
            data. Fields whose value is still a placeholder are omitted
            entirely, because absent data is better than wrong data. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: site.name,
              url: siteUrl,
              description: site.description,
              ...getStructuredContact(),
            }),
          }}
        />

        <Header
          phone={phoneHref ? contact.phone : ""}
          phoneHref={phoneHref ?? undefined}
        />

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <Footer />
        <WhatsAppFab />
      </body>
    </html>
  );
}
