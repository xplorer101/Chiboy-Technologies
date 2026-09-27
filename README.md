# CHIBOY TECHNOLOGIES — Website

Official website for CHIBOY TECHNOLOGIES, a technology services company covering
computer software maintenance, software installation and configuration, computer
troubleshooting and support, networking, graphics design, technology sales and
IT consultancy.

> **Status: work in progress.** Phases 1–2 complete (architecture, database,
> design system). Business contact details and portfolio projects are
> placeholders pending real information from the company.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Commands](#commands)
- [Project structure](#project-structure)
- [Adding a service](#adding-a-service)
- [Database](#database)
- [Deployment](#deployment)
- [Security notes](#security-notes)
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
| Tests | Vitest | Unit tests for security-critical pure logic |
| Deploy target | Vercel | Native support for the App Router and Server Actions |

### Deliberate version pins

- **Prisma 7.10.0, not 8.0.0-rc.17.** npm's `latest` tag for Prisma currently
  points at a release candidate. A live business site should not run on an RC.
- **TypeScript 5.9.3, not 7.0.2.** `latest` is the new native (Go) compiler.
  The 5.x line is the safe choice today; upgrading later is a version bump.

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
| `NEXT_PUBLIC_PHONE_NUMBER` | placeholder | Display phone number |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | placeholder | Floating WhatsApp button — digits only, no `+` or spaces |
| `NEXT_PUBLIC_BUSINESS_EMAIL` | placeholder | Display email address |
| `NEXT_PUBLIC_BUSINESS_LOCATION` | placeholder | Location / service area |
| `NEXT_PUBLIC_BUSINESS_HOURS` | placeholder | Business hours |
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
│   └── generate-placeholders.ts
├── private-uploads/           User uploads. Gitignored, never served statically
└── src/
    ├── app/                   Routes (App Router)
    ├── components/
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
    │   ├── upload/            Magic-byte sniffing and storage
    │   ├── validation/        Shared Zod schemas
    │   ├── actions/           Server Actions
    │   └── auth/              Future auth seam
    └── generated/prisma/      Generated. Gitignored.
```

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

1. **Real business contact details.** Until `NEXT_PUBLIC_WHATSAPP_NUMBER` is a
   real number, the floating WhatsApp button is not rendered at all.
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

## Outstanding placeholders

The following are **placeholders, not real information**. Nothing has been
invented. Each is visible on the site in a clearly marked state.

| Placeholder | Where it appears | Needed |
|---|---|---|
| Business phone number | Header, footer, contact | Real number |
| WhatsApp number | Floating button, CTA band, footer | Real number, digits only |
| Business email | Footer, contact, notifications | Real address |
| Business location / service area | Footer, contact | Real location |
| Business hours | Footer, contact | Real hours |
| Years in business | About page | Real figure |
| Portfolio projects | `/portfolio`, service pages | Real projects with images, or confirmation to keep placeholders |
| Legal entity name | Privacy policy | Registered name, if it should appear |
| Notification destination | Form submissions | Inbox or webhook |

---

## Licence

Proprietary. All rights reserved by CHIBOY TECHNOLOGIES.
