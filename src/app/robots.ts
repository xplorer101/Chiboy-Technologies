import type { MetadataRoute } from "next";

/**
 * `robots.txt`.
 *
 * Everything on this site is meant to be indexed — it is a marketing site
 * whose pages exist to be found. The directives that matter are therefore
 * about *where* to look (the sitemap) and about not wasting crawl budget on
 * the two routes that are never useful as search results: the form endpoint
 * and the 404.
 *
 * Disallowing a URL removes it from crawling; it does not deindex a page that
 * has already been indexed, and it does not hide the page from someone with
 * the direct link.
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export default function robots(): MetadataRoute.Robots {
  // With no production origin configured, emitting a sitemap URL would point
  // crawlers at localhost. An empty host is the honest answer.
  const host = siteUrl ? siteUrl.replace(/\/+$/, "") : "";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/request-service", "/api/"],
      },
    ],
    ...(host ? { sitemap: `${host}/sitemap.xml` } : {}),
  };
}
