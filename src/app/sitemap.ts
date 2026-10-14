import type { MetadataRoute } from "next";

import { services } from "@/content/services";
import { getPublishedProjectTimestamps } from "@/lib/portfolio";
import { SHOW_PORTFOLIO } from "@/lib/features";
import { buildSitemap } from "@/lib/sitemap";

/**
 * `sitemap.xml`.
 *
 * `NEXT_PUBLIC_SITE_URL` is the origin. If it is unset the site falls back to
 * localhost, which would publish absolute URLs pointing at 127.0.0.1 — so the
 * sitemap is withheld entirely in that case rather than served wrong. A
 * missing sitemap is recoverable by a crawler; a sitemap full of localhost
 * URLs actively points away from the production site.
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!siteUrl) return [];

  const entries = buildSitemap({
    baseUrl: siteUrl,
    serviceSlugs: services.map((service) => service.slug),
    // Skipped entirely while the portfolio is hidden, so the sitemap neither
    // lists the section nor reads the database for it.
    projects: SHOW_PORTFOLIO ? await getPublishedProjectTimestamps() : [],
  });

  return entries;
}
