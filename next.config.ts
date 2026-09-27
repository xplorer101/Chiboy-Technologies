import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * `script-src` allows 'unsafe-inline' because the App Router emits bootstrap
 * scripts that cannot be hashed at build time. This is the standard Next.js
 * baseline. The practical XSS protections that matter here are structural
 * rather than CSP-based: React escapes by default, no `dangerouslySetInnerHTML`
 * is used anywhere, and the database is only reachable from server code.
 * See README "Security notes" for the nonce upgrade path.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Camera/mic/geo are never needed on a marketing site; denying them by
    // default removes a class of injection targets outright.
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  // Do not advertise the framework.
  poweredByHeader: false,

  reactStrictMode: true,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  images: {
    formats: ["image/avif", "image/webp"],
    // Only local assets are served; the portfolio currently uses generated
    // brand-native placeholders. Widen remotePatterns if a CDN is added later.
    remotePatterns: [],
  },

  experimental: {
    // Vercel defaults to a 1 MB Server Action body. Uploads are capped to
    // 4 MB in the upload validator, so keep these limits aligned.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
