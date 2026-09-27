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

  /**
   * Where form notifications are delivered.
   *
   * Was `CONTACT_NOTIFICATION_EMAIL`, which was declared here from Phase 1 but
   * never read. Renamed to `OWNER_EMAIL` and kept as the single name for this
   * job: two variables for one destination means one of them gets set, the
   * other does not, and nothing is delivered.
   */
  OWNER_EMAIL: z
    .string()
    .email("OWNER_EMAIL must be a valid email address")
    .optional()
    .or(z.literal("")),

  RESEND_API_KEY: z.string().optional(),

  /**
   * The domain Resend sends from.
   *
   * Optional because Resend has an onboarding domain that only delivers to the
   * account's own address — which is exactly the case here, since these emails
   * go to the business owner. A verified domain is only needed to send to
   * anyone else, and is not required for the notification to work.
   */
  RESEND_FROM_DOMAIN: z.string().optional().or(z.literal("")),

  /**
   * The owner's WhatsApp number, in display form.
   *
   * Validated as a plausible international number, and normalised to bare digits
   * before it reaches CallMeBot, which rejects punctuation. The same reasoning
   * as `getPhoneLink`: a mistyped number here means notifications silently never
   * arrive, so the check is at configuration time where it is visible.
   */
  CALLMEBOT_PHONE: z.string().optional().or(z.literal("")),
  CALLMEBOT_APIKEY: z.string().optional(),

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
    OWNER_EMAIL: process.env.OWNER_EMAIL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_DOMAIN: process.env.RESEND_FROM_DOMAIN,
    CALLMEBOT_PHONE: process.env.CALLMEBOT_PHONE,
    CALLMEBOT_APIKEY: process.env.CALLMEBOT_APIKEY,
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

/**
 * Reads only the rate limiter's two variables.
 *
 * Deliberately separate from `getServerEnv()`. The limiter has no use for
 * `DATABASE_URL`, and calling the full validator would make "a rate limit
 * cannot be checked" a consequence of "the database is not configured" — two
 * unrelated failures that would fail the whole form together.
 */
export function getRateLimitConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/**
 * The notification channels that are actually configured.
 *
 * Each channel is reported independently rather than as one "notifications on or
 * off" flag, because they are configured independently and a half-configured
 * setup is the normal state during development. Reporting them separately lets
 * the caller skip what is missing and say which, instead of discovering a missing
 * variable by catching an exception at send time.
 *
 * Only the notification variables are read. As with the rate limiter, calling
 * the full `getServerEnv()` would make "notifications are not configured" a
 * consequence of "the database is not configured".
 */
export type NotificationConfig = {
  email: { apiKey: string; ownerEmail: string; fromDomain?: string } | null;
  whatsapp: { apiKey: string; phone: string } | null;
};

export function getNotificationConfig(): NotificationConfig {
  const ownerEmail = process.env.OWNER_EMAIL?.trim() ?? "";
  const resendKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const botKey = process.env.CALLMEBOT_APIKEY?.trim() ?? "";
  const botPhone = normaliseWhatsAppNumber(process.env.CALLMEBOT_PHONE);

  return {
    // Both halves are required. A key with no recipient would send mail to
    // Resend's own bounce address, and a recipient with no key cannot be sent to.
    //
    // `fromDomain` is passed through exactly as configured — raw, unvalidated,
    // possibly empty. Turning it into an address is `resendFromAddress()`'s job
    // in the pure notification module, which has tests. Validating it here as
    // well meant two places had to agree about what the value was, and when they
    // disagreed the result was a malformed `From` header that silently stopped
    // every email.
    email:
      resendKey && ownerEmail
        ? { apiKey: resendKey, ownerEmail, fromDomain: process.env.RESEND_FROM_DOMAIN }
        : null,
    whatsapp:
      botKey && botPhone.length >= 8
        ? { apiKey: botKey, phone: botPhone }
        : null,
  };
}

/**
 * Reduces a WhatsApp number to bare international digits.
 *
 * CallMeBot rejects anything else, and a number that is rejected silently means
 * no notification. Returns an empty string for anything that is not a plausible
 * international number, so the channel reports itself unconfigured rather than
 * failing at send time.
 */
export function normaliseWhatsAppNumber(raw: string | undefined): string {
  if (!raw) return "";
  if (isPlaceholder(raw)) return "";

  const digits = raw.replace(/\D/g, "").replace(/^0+/, (run) => (run.length > 1 ? run.slice(1) : run));

  // 8 is the shortest plausible E.164 national significant number; 15 is the
  // E.164 maximum, and anything longer is a typo rather than a number.
  return digits.length >= 8 && digits.length <= 15 ? digits : "";
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
