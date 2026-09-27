# CHIBOY TECHNOLOGIES — Website

Official website for CHIBOY TECHNOLOGIES, a technology services company covering
computer software maintenance, software installation and configuration, computer
troubleshooting and support, networking, graphics design, technology sales and
IT consultancy.

> **Status: work in progress.** Phases 1–4 complete (architecture, database,
> design system, homepage, services). Real business contact details are
> configured. Portfolio projects remain placeholders pending real work from the
> company. See [Outstanding placeholders](#outstanding-placeholders).

---

## Table of contents

- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Commands](#commands)
- [Project structure](#project-structure)
- [Brand assets](#brand-assets)
- [Adding a service](#adding-a-service)
- [Adding a portfolio project](#adding-a-portfolio-project)
- [Database](#database)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [About page content, and what it deliberately omits](#about-page-content-and-what-it-deliberately-omits)
- [Outstanding placeholders](#outstanding-placeholders)

---

## Tech stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components by default, so most pages ship as HTML with almost no client JavaScript |
| Language | TypeScript 5.9 (`strict`) | Pinned to the mature 5.x line rather than the newly released TypeScript 7 native port |
| Styling | Tailwind CSS 4 | CSS-first `@theme` tokens; no JS config file to load at runtime |
| Database | PostgreSQL (Supabase) | Via Prisma 7.10 |
| Validation | Zod 4 | Same schemas used for client and server validation |
| Forms | React Hook Form | Uncontrolled inputs keep the form bundle small |
| Icons | Lucide React | Tree-shakeable |
| Font | Plus Jakarta Sans, **self-hosted** via `next/font/local` | The woff2 is committed to the repo, so builds never depend on reaching Google |
| Tests | Vitest | Unit tests for security-critical pure logic |
| Deploy target | Vercel | Native support for the App Router and Server Actions |

### Deliberate version pins

- **Prisma 7.10.0, not 8.0.0-rc.17.** npm's `latest` tag for Prisma currently
  points at a release candidate. A live business site should not run on an RC.
- **TypeScript 5.9.3, not 7.0.2.** `latest` is the new native (Go) compiler.
  The 5.x line is the safe choice today; upgrading later is a version bump.

### Why the font is self-hosted rather than `next/font/google`

`next/font/google` downloads the woff2 from `fonts.gstatic.com` **at build
time**. On a restricted or unreliable network that fails the production build
outright, with no local fallback — and it was hit for real here, because
`fonts.gstatic.com` resolves to an IPv6-only address on this network.

`src/assets/fonts/plus-jakarta-sans-latin-variable.woff2` (27 KB, variable
across weights 200–800) is committed instead and loaded with
`next/font/local`. Builds are then reproducible and work offline, the site
never depends on a third party being reachable, and `next/font` still
self-hosts it with a hashed filename, a `<link rel="preload">` and automatic
fallback metrics — so there is still no layout shift and no render-blocking
request to an external origin.

The latin subset is the whole site (`lang="en-GB"`), so no unicode-range
splitting is needed.

### Why Server Actions rather than API routes

Both public forms submit through Server Actions. This gives typed results,
built-in protection against cross-origin POSTs, and no client fetch boilerplate.
The forms still work if the client bundle fails. API routes are only worth
adding if a third-party system later needs to submit programmatically.

### Why rate limiting uses no extra dependency

The limiter in `src/lib/rate-limit.ts` speaks to Upstash's **plain REST API**
using `fetch` (a fixed window via `INCR` + `EXPIRE`). This avoids adding
`@upstash/redis` and `@upstash/ratelimit`, and keeps the window logic small
enough to unit test. When Redis is not configured it falls back to an in-memory
window so local development needs no external service — but **production
rate limiting across serverless instances requires `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` to be set.**

---

## Requirements

- Node.js **20.12+** (developed on 26.7.0). `--env-file` and `loadEnvFile` are used.
- npm 11+
- A PostgreSQL database (Supabase free tier is enough)
- A Supabase/Upstash account for production rate limiting

---

## Getting started

```bash
# 1. Install dependencies (postinstall generates the Prisma client)
npm install

# 2. Create your local environment file
cp .env.example .env.local
# then fill in DATABASE_URL / DIRECT_URL and the site URL

# 3. Apply the database schema
npm run db:apply

# 4. Seed the service categories and placeholder portfolio projects
npm run db:seed

# 5. Start the development server
npm run dev
```

Open <http://localhost:3000>.

> `npm install` may ask you to approve install scripts for `prisma`,
> `@prisma/engines` and `esbuild`. These are required — Prisma downloads its
> query compiler and esbuild needs its native binary. They are already
> approved via the `allowScripts` field in `package.json`.

---

## Environment variables

`.env.example` lists every variable with comments and **contains no real
values**. `.env.local` is gitignored and must never be committed.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Pooled runtime connection |
| `DIRECT_URL` | migrations | Direct (non-pooled) connection for the Prisma CLI |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical origin for metadata, OG tags and `sitemap.xml` |
| `NEXT_PUBLIC_PHONE_NUMBER` | set | Display phone number, and the header's `tel:` link |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | set | Floating WhatsApp button. Same display form; digits are extracted for `wa.me` |
| `NEXT_PUBLIC_BUSINESS_EMAIL` | set | Display email, and the `mailto:` link |
| `NEXT_PUBLIC_BUSINESS_LOCATION` | set | Office address, and the maps link |
| `NEXT_PUBLIC_BUSINESS_HOURS` | set | Display hours, parsed into ISO 8601 for structured data |
| `NEXT_PUBLIC_SERVICE_AREA` | no | Area served. Omitted from structured data while unset — **not** inferred from the address |
| `CONTACT_NOTIFICATION_EMAIL` | no | Where form submissions are delivered |
| `RESEND_API_KEY` | no | Email delivery. If unset, submissions are stored only |
| `UPSTASH_REDIS_REST_URL` | production | Redis REST endpoint for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | production | Redis REST token |
| `UPLOAD_DIR` | no | Defaults to `private-uploads` |
| `MAX_UPLOAD_MB` | no | Defaults to `4` (Vercel's Server Action body limit) |

Values wrapped in square brackets — `[PLACEHOLDER: ...]` — are treated as
unresolved. The UI renders them in a visibly marked state and suppresses
features that would be broken by them (for example, the floating WhatsApp button
is not rendered at all while the number is a placeholder, rather than linking to
a dead contact).

**Nothing is ever derived that was not supplied.** Contact links are built by
helpers that validate before use, so a malformed value is rejected rather than
turned into a plausible-but-wrong `tel:` target. Structured-data fields whose
value is missing or unparseable are omitted from the JSON-LD entirely — an
absent field is better than a wrong one, and far better than emitting a literal
`[PLACEHOLDER: ...]` string for a search engine to index.

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | `prisma generate` then the production build |
| `npm start` | Serve the production build |
| `npm test` | Run unit tests once |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:apply` | Apply pending migrations (see [Database](#database)) |
| `npm run db:apply:reset` | Drop the `public` schema, then re-apply |
| `npm run db:deploy` | `prisma migrate deploy` (needs a direct connection) |
| `npm run db:status` | Migration status |
| `npm run db:seed` | Seed service categories and placeholder projects |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Prisma Studio |
| `npm run placeholders` | Regenerate placeholder project cover images |
| `npm run logo` | Regenerate the logo assets from `src/brand/emblem.ts` |

---

## Project structure

```
.
├── certs/                     Supabase root CA (public certificate, safe to commit)
├── prisma/
│   ├── migrations/            Committed, tracked migration history
│   ├── schema.prisma          Schema-first models
│   └── seed.ts                Service categories + labelled placeholder projects
├── scripts/
│   ├── apply-migrations.mjs   Applies migrations without a shadow DB
│   ├── generate-logo.ts       Writes the logo assets from src/brand/emblem.ts
│   └── generate-placeholders.ts
├── private-uploads/           User uploads. Gitignored, never served statically
├── public/
│   ├── brand/                 Generated logo assets
│   └── portfolio/             Generated placeholder cover art
└── src/
    ├── app/                   Routes (App Router)
    ├── brand/
    │   └── emblem.ts          Logo geometry and colours (single source of truth)
    ├── components/
    │   ├── brand/             Emblem component
    │   ├── layout/            Header, Footer, WhatsApp button
    │   ├── ui/                Design-system primitives
    │   ├── sections/          Homepage sections
    │   ├── services/          Service detail components
    │   ├── portfolio/         Portfolio components
    │   ├── forms/             The two public forms
    │   └── seo/               JSON-LD helpers
    ├── content/
    │   ├── site.ts            Brand, navigation, contact placeholders
    │   └── services.ts        THE SERVICE CATALOGUE
    ├── lib/
    │   ├── prisma.ts          Prisma singleton
    │   ├── db-config.ts       Connection string -> pg pool config
    │   ├── env.ts             Zod-validated environment
    │   ├── rate-limit.ts      Fixed-window limiter (Redis REST / in-memory)
    │   ├── portfolio.ts       Project reads, and one that reports unavailability
    │   ├── portfolio-categories.ts   Category list, labels, ?category= parsing
    │   ├── portfolio-jsonld.ts Portfolio structured data (placeholder-safe)
    │   ├── upload/            Magic-byte sniffing and storage
    │   ├── validation/        Shared Zod schemas
    │   ├── actions/           Server Actions
    │   └── auth/              Future auth seam
    └── generated/prisma/      Generated. Gitignored.
```

---

## Brand assets

### The emblem

A chamfered **C** — a square with its four corners cut off at 45° — containing a
solid upright **T**, with a gold chevron pointing out through the C's aperture.
Three ideas, each doing one job:

- **The C is a container, drawn as an outline.** It reads as machined metalwork
  rather than as a ring, because every corner is a cut and nothing is round.
  That is where the futuristic quality comes from — from geometry, not from
  glow or gradient, both of which are banned by the brand constraints.
- **The T is solid, not an outline.** Outline against outline at 32px turns two
  sets of lines into grey mush. Giving the T mass while the C stays open is what
  makes the letterform survive at favicon size.
- **The chevron is the only forward-motion cue and the only gold in the mark.** It
  sits in the C's aperture — the one part of the mark that would otherwise be
  empty — and points out of it, so the eye leaves the logo the way it should.

The badge is a **cut-corner square**, the same shape as the C at a larger size.
That repetition is deliberate: it is what makes the badge and the C read as one
object rather than as a shape inside a shape, and it gives the favicon a distinct
app-icon silhouette.

It is defined **once**, in `src/brand/emblem.ts`, as named parameters (half-widths,
corner cuts, stroke weights) rather than as hand-typed coordinates. Both the
on-page component and the generated asset files read that module, so they cannot
drift apart. To change the proportions, edit a parameter there and run:

```bash
npm run logo
```

which rewrites:

| File | Use |
|---|---|
| `public/brand/emblem.svg` | The mark alone on a transparent ground, to place on a light surface |
| `public/brand/emblem-dark.svg` | The mark on its navy badge — the version to use on the website, in print or in an email signature |
| `public/brand/favicon.svg` | Square badge for browsers and app icons |
| `src/app/icon.svg` | The App Router favicon, picked up by file convention |

The wordmark ("CHIBOY / TECHNOLOGIES") is **set as real HTML text** beside the
mark rather than outlined into the SVG, in three deliberate ways. It uses the
site's own font, so the wordmark matches the rest of the typography; it stays
selectable, translatable and readable by screen readers; and it cannot come out
misspelled, which is the most common failure mode of a generated wordmark. The
outlined-letterform approach is worth revisiting only if a single-file
all-in-one lockup is ever needed for print.

### The palette is the site's, not a new one

This mark is the **third** version, and the first to introduce no invented colour
at all. The two earlier drafts reached for a circuit-board cyan and a neon blue
that were in no brand palette; both are gone. What remains is Deep Navy, Silver
and Gold — the same three the rest of the site uses — so the logo cannot drift
away from the page it sits on. A test asserts that no fourth tone creeps in,
which is how the earlier drafts went wrong.

| | On the navy badge |
|---|---|
| Silver `#A8ACAF` — the C and the T | **4.9:1** |
| Gold `#E8B84B` — the chevron | **6.1:1** |

The badge is navy rather than near-black, which is a change from the previous
mark. Near-black was chosen to lift the silver; navy lifts it almost as well and
is the brand's own primary, so the logo now reads as part of the identity rather
than as a monochrome mark bolted onto it. On white the silver drops to 2.3:1,
which is why the badge is on by default and why the transparent-ground asset
exists for placing the mark on a chosen light surface.

**The gold is deliberately the brightest of the three.** Gold-500 sits at almost
exactly the same luminance as the silver, and two marks differing only by a hue
cannot be told apart at 32px. Lifting the gold to a higher lightness than the
silver gives the accent a luminance difference as well, so it still reads as a
different material when the mark is small.

### Why the mark is built from parameters, and what the tests guard

`cutCornerSquare()` produces the badge and the C from the same two numbers, so
the two cannot disagree about what a chamfer is. On top of that,
`src/brand/__tests__/emblem.test.ts` pins the things that silently break a mark:

- **The miter limit.** Every corner's interior angle is computed and checked
  against the angle below which a renderer silently bevels instead of mitring.
  A bevelled corner means the mark grows rounded edges in one browser and sharp
  edges in another — the exact inconsistency the flat-vector rule exists to
  prevent.
- **Clearances.** Every gap in the composition — C to T, T to chevron, chevron to
  the C's terminals — is asserted in units, measured on the real generated paths
  rather than on the parameters, so it fails if the two shapes ever disagree.
- **Nesting.** The T must sit inside the C and the chevron entirely to the right
  of the T. If any of those invert, the mark stops reading as container /
  payload / output and becomes three shapes at random.
- **Paint order.** The chevron is painted last, so the one gold element is never
  occluded by the T.
- **Gold budget.** Exactly one element may carry the gold, so it can never become
  gold-dominant.

The mark is authored as vector rather than generated as a raster. That was a
deliberate call: an image generator cannot be checked for a correct wordmark, and
hand-authoring means every coordinate is reviewable in the diff. The trade-off is
that the mark has not been seen by a designer at full size — the proportions were
arrived at by rendering the SVG to a grid and reading it, which catches crowding
and invisible detail but not taste.

### Two things to know

- **The geometry is duplicated into the client bundle**, because `Header` is a
  client component and the emblem renders inside it. That is roughly 600 bytes
  of path data. Making `Header` a server component with a client-only drawer
  would remove it, and is the better structure, but it is a refactor of the
  header rather than of the logo.
- **Every corner is cut, not round, on purpose.** There is no rounded-square
  variant, so a designer asking for "the same logo but friendlier" will get a
  different mark, not a softened one. That was a choice: the cuts are what make
  it read as technical.

---

## Adding a service

**Edit one file: `src/content/services.ts`.** Add an object to the `rawServices`
array. The overview page, all detail pages, the homepage preview, the service
request dropdown, the sitemap and the footer all derive from it automatically.

```ts
{
  slug: "data-recovery",              // becomes /services/data-recovery
  name: "Data Recovery",
  cardDescription: "…",
  intro: "…",
  icon: "wrench",                     // add to `serviceIconNames` if new
  meta: { title: "…", description: "…" },
  problems: ["…"],
  included: ["…"],
  relatedProjectSlugs: [],
  faqs: [{ question: "…?", answer: "…" }],
}
```

No new page component and no new route file are needed. Entries are validated
by Zod at module load, so an incomplete service **fails the build** rather than
rendering a broken page. A unit test asserts the six specified slugs still exist,
which catches an accidental rename that would 404 existing inbound links.

---

## Adding a portfolio project

Projects are **database records**, not a content file, because they need
photography, categories, a `visibility` flag and eventual admin editing. A
project is therefore a row, not a code change — no page component, no route
file, no rebuild.

| Field | Notes |
|---|---|
| `slug` | Becomes `/portfolio/{slug}`. Also the upsert key used by the seed. |
| `title`, `summary` | `summary` is the meta description and the card text. |
| `category` | One of the five `PortfolioCategory` values. The filter derives its list from the Prisma enum, so a new value becomes selectable automatically. |
| `coverImage` | A path under `public/`. SVG is rendered with a plain `<img>`, raster goes through `next/image`. |
| `serviceSlug` | Optional. Links the entry to a service page. |
| `problem`, `solution`, `result` | The three prose blocks. |
| `toolsUsed` | String array, rendered in the sidebar. |
| `images` | Optional gallery. |
| `isPlaceholder` | See below. |
| `visibility` | `PUBLISHED` or `DRAFT`. Only `PUBLISHED` appears anywhere public. |

### Publishing a real project instead of a placeholder

Set `isPlaceholder: false` and replace the four prose fields. Nothing else needs
to change, and the markers disappear on their own — the badge, the notice above
the body copy, and the exclusion from structured data are all driven by that one
flag.

The structured-data exclusion is the part worth understanding. `ItemList` and
`CreativeWork` are emitted **only** when every project in them is real, because
structured data is the one part of a page a machine trusts without checking it
against what a human can see. A `CreativeWork` for a placeholder would tell a
search engine that a case study exists which does not — and it would look
entirely valid to a schema validator. That rule lives in
`src/lib/portfolio-jsonld.ts` and is asserted directly in
`src/lib/__tests__/portfolio-jsonld.test.ts`, rather than being a convention
someone has to remember.

### Placeholder entries

`src/content/placeholder-projects.ts` is the single source of truth for sample
entries, shared by the seed, the cover-artwork generator and the services'
`relatedProjectSlugs`. Every prose field is generated by `toPlaceholderProject()`
from two honest ingredients, which is why the disclaimer cannot be forgotten on
one field of one entry. See the file's own header comment.

The seed **upserts by slug and does not delete**. That is deliberate — a re-seed
must never remove real work — but it also means removing an entry from the file
does not remove it from the database. Delete the row explicitly:

```bash
npx tsx -e '…'   # or Prisma Studio
```

### The category filter is server-side

`/portfolio?category=NETWORKING` is resolved on the server, not in a client
component. It works with JavaScript disabled, the URL is shareable, and each
category is a linkable address. This is the only dynamic route in the site:
awaiting `searchParams` opts the page out of prerendering, which is the right
trade for a grid a visitor reaches in order to see current work.

All published projects are read **once** and the category applied in memory. The
filter chips show a count for every category, so the full list is needed
regardless — and filtering one array in memory means the count and the result
cannot disagree, which two separate queries could.

Every filter state canonicalises to `/portfolio`, and the `ItemList` is emitted
on the unfiltered view only. Both exist to keep five near-identical pages out of
the search index.

---

## Database

### The Supabase pooler caveat (important)

`prisma migrate dev` and `prisma migrate deploy` **do not work against
Supabase's connection pooler:**

- `migrate dev` needs a **shadow database**; the pooler cannot create one.
- `migrate deploy` takes a **`pg_advisory_lock()`**, which never returns on the
  pooler — Prisma fails with `P1002` and leaves the migration recorded but
  *unfinished*, which is how an interrupted migration ends up half-applied.

A genuinely direct connection (`db.<ref>.supabase.co`) avoids both problems but
**resolves to an IPv6-only address**, so it is unreachable from IPv4-only
networks.

The committed migration files in `prisma/migrations/` remain the source of
truth. `npm run db:apply` applies them in dependency order, each inside its own
transaction, and maintains Prisma's `_prisma_migrations` bookkeeping itself.
This is the standard CI/production migration path, adapted for the pooler.

**If you have a direct connection available** (an IPv6-capable host, or a
provider such as Neon), just use the normal tooling instead:

```bash
npm run db:deploy     # prisma migrate deploy
npm run db:migrate    # prisma migrate dev
```

### TLS

Supabase's pooler is signed by a **Supabase-issued private CA**
(`Supabase Root 2021 CA`, valid to 2031), not a public CA, so the chain fails
verification against the OS trust store. The root certificate is committed at
`certs/supabase-root-2021-ca.crt` and passed to the `pg` driver explicitly
(`src/lib/db-config.ts`), so TLS stays **fully verified** — including hostname
checking — rather than falling back to `sslmode=no-verify`.

For the Prisma CLI, `prisma.config.ts` builds a temporary combined CA bundle and
sets `SSL_CERT_FILE` automatically, so no manual environment setup is needed.

**If Supabase rotates this root certificate**, replace the file in `certs/`.

### Connection pooling

`DATABASE_URL` must be a **pooled** URL. Serverless platforms create many
short-lived instances, and an unpooled URL will exhaust the provider's connection
limit. `buildPoolConfig` caps the pool at 5 connections per instance.

### Schema-first discipline

All schema changes go through `prisma migrate dev`, so migration history is
tracked in version control. Never edit the database directly.

---

## Deployment

### Vercel (recommended)

1. Push the repository to GitHub and import it into Vercel.
2. Add the environment variables from `.env.example` under **Settings →
   Environment Variables**, setting `DATABASE_URL` to the **pooled** URL and
   `DIRECT_URL` to a direct one.
3. Deploy. `npm run build` runs `prisma generate` automatically.

Deploying with `prisma migrate deploy` in a separate step is recommended if you
have a direct connection. With the pooler, run `npm run db:apply` from a machine
that can reach the database.

### Before going live

These are the items that must be resolved first — see
[Outstanding placeholders](#outstanding-placeholders).

1. **Rotate the Supabase secrets.** They were pasted into a chat session during
   setup. Rotate `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` /
   `SUPABASE_JWT_SECRET` before going live. Only the two database connection
   strings were used by this project.
2. **`NEXT_PUBLIC_SITE_URL` must be the real domain**, or canonical URLs, Open
   Graph tags and the sitemap will all point at the wrong origin.
3. **File storage.** Uploads are currently written to `private-uploads/` on the
   local filesystem, which is **ephemeral on Vercel** — uploaded files are lost
   when an instance recycles. The storage driver in `src/lib/upload/` is an
   interface specifically so that S3 or Vercel Blob can be dropped in. **Do not go
   live on a plan that relies on the local disk for uploads.**
4. **Production rate limiting.** Set `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`, or the forms will use the in-memory fallback,
   which does not work across serverless instances.
5. **Notification delivery.** Set `CONTACT_NOTIFICATION_EMAIL` and a mail
   provider, otherwise submissions are stored but nobody is notified.
6. **Privacy policy.** Currently a clearly-marked draft that needs review
   against your actual data handling.

---

## Security notes

Implemented:

- **Server-side validation on every input.** Zod schemas are the single source
  of truth; the same schemas back both React Hook Form and the Server Action.
  Client validation is a convenience layer only and is never trusted.
- **No internal detail reaches the client.** Server Action failures are mapped
  to a small set of generic, plain-language messages. Stack traces and database
  errors are logged server-side, never returned.
- **File uploads are validated by magic bytes**, not by the client-reported MIME
  type or the file extension. Accepted files are written under a randomly
  generated filename. Uploads are stored outside `public/` and are never served
  as static assets.
- **Security headers** are set in `next.config.ts`: CSP, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP, HSTS
  (production only).
- **Secrets live only in environment variables** and never reach the client
  bundle. `src/lib/env.ts` fails fast on misconfiguration and reports only
  variable *names*, never values.
- **The Prisma client is protected by `server-only`**, so accidentally importing
  it into a client component becomes a build error rather than shipping your
  database URL to browsers.
- **Rate limiting** on all public form submissions.

Known trade-offs, stated plainly:

- The CSP allows `'unsafe-inline'` for scripts because the App Router emits
  bootstrap scripts that cannot be hashed at build time. This is the standard
  Next.js baseline. The protections that actually matter here are structural:
  React escapes by default, no `dangerouslySetInnerHTML` is used, and the
  database is only reachable from server code. A nonce-based CSP would remove
  `'unsafe-inline'` but forces every page to be dynamically rendered, which
  costs real performance on a content site.
- If admin authentication is added later, use a proven solution (Auth.js,
  Clerk or similar) behind the existing `src/lib/auth/` seam — do not hand-roll
  password handling.

---

## About page content, and what it deliberately omits

There is no founding story, founder's name, team size, client list, client quote,
certification or award on `/about`, because none has been supplied. An absent
fact is better than a fabricated one — a fabricated one is indistinguishable from
a real one until somebody checks it, and the people most likely to check are
prospective customers.

What the page does instead: what the business does, how it works, and what a
customer can expect. The last of these is written as a **commitment** rather than
an achievement, so each item is a promise being made rather than a claim about
something already done. The only figure stated is 13 years in business, and it
is stored as a duration in `site.ts` and rendered through
`getExperienceStatement()` — never as a derived founding year, which would go
stale and could be a year out depending on how the count is done.

---

## Outstanding placeholders

Nothing below has been invented. Each item is either still unset, or marked
visibly on the site as awaiting confirmation.

### Supplied — no longer placeholders

| Value | Notes |
|---|---|
| Phone / WhatsApp | `+2348102854969` (both) — drives the header call link, footer, CTA band and floating button |
| Email | `chiboytechnologies@gmail.com` |
| Office address | Suite 12, City Shoppers Plaza, Kuje, FCT Abuja |
| Business hours | Monday to Friday, 8:00am – 6:00pm |
| Years in business | 13 — stated on the About page, and the only figure asserted anywhere on the site |

Hours are stored as display text and parsed into ISO 8601 (`Mo-Fr 08:00-18:00`)
for structured data. Anything the parser does not fully understand is **omitted
rather than guessed at**, so a reworded value can never publish wrong opening
hours.

### Still outstanding

| Placeholder | Where it appears | Needed |
|---|---|---|
| Portfolio projects | `/portfolio`, `/portfolio/{slug}`, service pages | Real projects with photography. 18 sample entries are live, each badged "Placeholder" |
| Legal entity name | Privacy policy | Registered name, if it should appear |
| Notification destination | Form submissions | Inbox or webhook |
| Service area | Structured data only | Which areas are covered — deliberately **not** inferred from the office address, and omitted until confirmed |
| Production domain | Canonical URLs, sitemap, OG tags | `NEXT_PUBLIC_SITE_URL` in production |

### Operational items before go-live

- [ ] **Rotate the Supabase secrets** (`SUPABASE_SECRET_KEY` /
      `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_JWT_SECRET`). They were pasted into
      a chat session and must be treated as exposed. Only the two database
      connection strings were used by this project.
- [ ] Choose a file-storage provider for service-request uploads (see
      [File uploads](#file-uploads)).
- [ ] Provision Upstash Redis for production rate limiting, or confirm the
      in-memory fallback is acceptable at the expected traffic.

---

## Licence

Proprietary. All rights reserved by CHIBOY TECHNOLOGIES.
