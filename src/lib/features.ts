/**
 * Feature flags.
 *
 * A flag is a plain build-time constant rather than an environment variable.
 * That keeps it inside the type system, reviewable in a diff, and impossible to
 * get wrong between build and runtime. Changing the value in this file is the
 * only edit needed.
 *
 * `SHOW_PORTFOLIO` gates the entire portfolio section: the navigation entry,
 * the homepage preview, the examples shown on service pages, the sitemap
 * entries, and the `/portfolio` routes themselves. While it is `false`, the
 * `/portfolio` and `/portfolio/[slug]` URLs are also redirected to `/services`
 * by `next.config.ts`, which reads this same constant.
 *
 * The components, queries, data and page files are all still in the codebase.
 * Setting this to `true` brings the section back in one change.
 */
export const SHOW_PORTFOLIO: boolean = false;
