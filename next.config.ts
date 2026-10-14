import type { NextConfig } from "next";

import { SHOW_PORTFOLIO } from "./src/lib/features";

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

/**
 * Origins the browser must be allowed to talk to for image uploads.
 *
 * `@vercel/blob/client` does not route the bytes through this app: after
 * exchanging a token with `/api/upload`, the browser `PUT`s the file straight
 * to Vercel Blob's API. That request is cross-origin, so with a bare
 * `connect-src 'self'` the browser blocks it before it is sent. The SDK treats
 * the block as a *network* error and retries with exponential backoff, which is
 * why the picker sits at "Uploading… 0%" instead of failing.
 *
 * Two origins are listed because the SDK's upload endpoint
 * (`https://vercel.com/api/blob` in @vercel/blob 2.8.x) may redirect to the
 * store host. A CSP source cannot carry a path, so the origin is the smallest
 * unit available.
 */
const blobConnectSrc = ["https://vercel.com", "https://*.blob.vercel-storage.com"];

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${blobConnectSrc.join(" ")}${isDev ? " ws: wss:" : ""}`,
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

  /**
   * Development-only: permits hot-reload resources to be served when the dev
   * server is reached from another device on the local network (a phone or a
   * second laptop testing the mobile layout). Without this, Next.js blocks the
   * HMR websocket as cross-origin and the page never hot-reloads.
   *
   * Development only by construction — this has no effect on a production
   * build, and no host is trusted beyond what the developer types here.
   */
  ...(isDev
    ? {
        allowedDevOrigins: [
          "localhost",
          "127.0.0.1",
          // Private address ranges, for testing on a phone or another device.
          "192.168.*.*",
          "10.*.*.*",
        ],
      }
    : {}),

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  /**
   * The privacy policy used to live at `/privacy` as an unfinished draft. The
   * canonical policy is now `/privacy-policy`, so the old path is redirected
   * permanently rather than left to 404 or to serve stale, placeholder text.
   * A permanent redirect (308) is what moves any accumulated search signal and
   * any bookmarked or shared link on to the current page.
   *
   * While the portfolio section is hidden, its old URLs go to the services
   * overview with a 301 rather than a 404, for the same reason. Both rules are
   * driven by the one `SHOW_PORTFOLIO` flag, so restoring the section removes
   * the portfolio redirect with no separate edit here.
   */
  async redirects() {
    return [
      { source: "/privacy", destination: "/privacy-policy", permanent: true },
      ...(SHOW_PORTFOLIO
        ? []
        : [
            { source: "/portfolio", destination: "/services", statusCode: 301 },
            { source: "/portfolio/:slug", destination: "/services", statusCode: 301 },
          ]),
    ];
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
