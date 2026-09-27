import { z } from "zod";

/**
 * Environment validation.
 *
 * Two separate schemas on purpose:
 *
 *  - `serverEnv`  — secrets. Only ever read from server code.
 *  - `publicEnv`  — values prefixed `NEXT_PUBLIC_`, inlined into the client
 *    bundle at build time. They must therefore be referenced as static
 *    property accesses (`process.env.NEXT_PUBLIC_X`) and can never hold a
 *    secret. Validation happens at module load so a misconfigured deployment
 *    fails fast and loudly instead of surfacing as a broken form.
 *
 * Nothing here logs a value: on failure only the offending *names* are
 * reported, so credentials can never leak into logs.
 */

const PLACEHOLDER_PATTERN = /^\[.*\]$/;

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "DATABASE_URL must be a PostgreSQL connection string",
    }),

  DIRECT_URL: z.string().optional(),

  CONTACT_NOTIFICATION_EMAIL: z
    .string()
    .email("CONTACT_NOTIFICATION_EMAIL must be a valid email address")
    .optional()
    .or(z.literal("")),

  RESEND_API_KEY: z.string().optional(),

  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal("")),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().or(z.literal("")),

  UPLOAD_DIR: z.string().min(1).default("private-uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(4).default(4),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

/** Reads and validates server-only environment variables. */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    CONTACT_NOTIFICATION_EMAIL: process.env.CONTACT_NOTIFICATION_EMAIL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    UPLOAD_DIR: process.env.UPLOAD_DIR,
    MAX_UPLOAD_MB: process.env.MAX_UPLOAD_MB,
  });

  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid server environment variables: ${names}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** True when distributed rate limiting is configured. */
export function hasRedisConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

const publicEnvSchema = z.object({
  siteUrl: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL must be an absolute URL, e.g. https://example.com"),
  phone: z.string(),
  whatsapp: z.string(),
  email: z.string(),
  location: z.string(),
  hours: z.string(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Public, non-secret site configuration. Static property access is required:
 * Next.js only inlines `NEXT_PUBLIC_*` when referenced literally.
 *
 * Placeholder values are permitted here on purpose — the site must build and
 * run before the real business details are supplied. `isPlaceholder()`
 * detects them so the UI can label them instead of presenting them as fact.
 */
export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    phone: process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "",
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
    email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "",
    location: process.env.NEXT_PUBLIC_BUSINESS_LOCATION ?? "",
    hours: process.env.NEXT_PUBLIC_BUSINESS_HOURS ?? "",
  });
}

/** A value is a placeholder if it is empty or wrapped in square brackets. */
export function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length === 0 || PLACEHOLDER_PATTERN.test(trimmed);
}
