import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { getContactDetails, site } from "@/content/site";
import "./globals.css";

/**
 * Root layout: fonts, site-wide metadata, and the persistent chrome.
 *
 * The font is self-hosted by next/font, which removes the render-blocking
 * request to Google and eliminates layout shift. `display: "swap"` plus the
 * generated fallback metrics keep text visible while the font loads.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  // Only the weights actually used, to keep the payload small.
  weight: ["400", "500", "600", "700", "800"],
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

  return (
    <html lang="en-GB" className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Organisation structured data. Only factual, supplied values are
            emitted — no ratings, review counts or invented local data. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: site.name,
              url: siteUrl,
              description: site.description,
              ...(contact.isEmailPlaceholder
                ? {}
                : { email: `mailto:${contact.email}` }),
              ...(contact.isPhonePlaceholder
                ? {}
                : { telephone: contact.phone }),
            }),
          }}
        />

        <Header phone={contact.isPhonePlaceholder ? "" : contact.phone} />

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <Footer />
        <WhatsAppFab />
      </body>
    </html>
  );
}
