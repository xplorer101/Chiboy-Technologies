import { z } from "zod";

import { isPlaceholder } from "@/lib/placeholder";
import { normaliseEnvValue, normaliseOptionalEnvValue } from "@/lib/utils/env-value";

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
   * The full `From` header, e.g. `Chiboy Technologies <noreply@chiboytechnologies.com>`.
   *
   * Takes precedence over `RESEND_FROM_DOMAIN` so the display name can be set to
   * whatever the business uses. Left optional: when it is absent the address is
   * composed from the domain, and when neither is usable the onboarding address
   * is used, so a missing value degrades rather than breaking every send.
   */
  EMAIL_FROM: z.string().optional().or(z.literal("")),

  /**
   * The address customers are told to contact, and the reply-to on the
   * confirmation email. Falls back to the business support address in the
   * notification module when unset, so replies are never lost.
   */
  SUPPORT_EMAIL: z
    .string()
    .email("SUPPORT_EMAIL must be a valid email address")
    .optional()
    .or(z.literal("")),

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
    // Every value is normalised first. A trailing newline or a pair of quotes
    // pasted in from a `.env` file or the dashboard is invisible, and it breaks
    // the checks below in exactly the way that is hardest to diagnose: a valid
    // address that "must be an email" fails, or a key that looks present is
    // rejected by the third party.
    DATABASE_URL: normaliseEnvValue(process.env.DATABASE_URL),
    DIRECT_URL: normaliseEnvValue(process.env.DIRECT_URL),
    OWNER_EMAIL: normaliseEnvValue(process.env.OWNER_EMAIL),
    RESEND_API_KEY: normaliseEnvValue(process.env.RESEND_API_KEY),
    RESEND_FROM_DOMAIN: normaliseEnvValue(process.env.RESEND_FROM_DOMAIN),
    EMAIL_FROM: normaliseEnvValue(process.env.EMAIL_FROM),
    SUPPORT_EMAIL: normaliseEnvValue(process.env.SUPPORT_EMAIL),
    CALLMEBOT_PHONE: normaliseEnvValue(process.env.CALLMEBOT_PHONE),
    CALLMEBOT_APIKEY: normaliseEnvValue(process.env.CALLMEBOT_APIKEY),
    UPSTASH_REDIS_REST_URL: normaliseEnvValue(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: normaliseEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN),
    UPLOAD_DIR: normaliseOptionalEnvValue(process.env.UPLOAD_DIR),
    MAX_UPLOAD_MB: normaliseOptionalEnvValue(process.env.MAX_UPLOAD_MB),
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
  const url = normaliseEnvValue(process.env.UPSTASH_REDIS_REST_URL);
  const token = normaliseEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN);
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
  email: {
    apiKey: string;
    ownerEmail: string;
    /** Where the internal notification is delivered. Optional; falls back in `template.ts`. */
    supportEmail?: string;
    /** Full `From` header, e.g. `Chiboy Technologies <noreply@chiboytechnologies.com>`. */
    emailFrom?: string;
    fromDomain?: string;
  } | null;
  whatsapp: { apiKey: string; phone: string } | null;
};

export function getNotificationConfig(): NotificationConfig {
  const ownerEmail = normaliseEnvValue(process.env.OWNER_EMAIL);
  const supportEmail = normaliseEnvValue(process.env.SUPPORT_EMAIL);
  const emailFrom = normaliseEnvValue(process.env.EMAIL_FROM);
  const resendKey = normaliseEnvValue(process.env.RESEND_API_KEY);
  const botKey = normaliseEnvValue(process.env.CALLMEBOT_APIKEY);
  const botPhone = normaliseWhatsAppNumber(process.env.CALLMEBOT_PHONE);

  return {
    // Both halves are required. A key with no recipient would send mail to
    // Resend's own bounce address, and a recipient with no key cannot be sent to.
    //
    // Either address is enough: the internal notification goes to the support
    // address when one is configured, and falls back to `SUPPORT_EMAIL`'s
    // default when it is not, so `OWNER_EMAIL` being absent should not silently
    // disable the channel.
    //
    // `fromDomain`, `emailFrom` and `supportEmail` are passed through exactly as
    // configured — raw, unvalidated, possibly empty. Turning them into headers
    // is the pure notification module's job, which has tests. Validating them
    // here as well meant two places had to agree about what the value was, and
    // when they disagreed the result was a malformed header that silently
    // stopped every email.
    email:
      resendKey && (ownerEmail || supportEmail)
        ? {
            apiKey: resendKey,
            ownerEmail,
            supportEmail: supportEmail || undefined,
            emailFrom: emailFrom || undefined,
            fromDomain: normaliseEnvValue(process.env.RESEND_FROM_DOMAIN),
          }
        : null,
    whatsapp:
      botKey && botPhone.length >= 8
        ? { apiKey: botKey, phone: botPhone }
        : null,
  };
}

/**
 * The Vercel Blob token, if one is configured.
 *
 * Separate from `getServerEnv()` for the same reason as the rate limiter: the
 * upload route has no use for `DATABASE_URL`, and calling the full validator
 * would make "uploads cannot be issued a token" a consequence of "the database
 * is not configured". Vercel sets `BLOB_READ_WRITE_TOKEN` automatically once a
 * Blob store is connected to the project.
 */
export function getBlobConfig(): { token: string } | null {
  const token = normaliseEnvValue(process.env.BLOB_READ_WRITE_TOKEN);
  return token ? { token } : null;
}

/**
 * The config the **customer confirmation** email needs.
 *
 * Kept separate from `getNotificationConfig().email`, which additionally
 * requires an owner or support address because the owner notification has to be
 * addressed to someone. A confirmation is addressed to the customer and only
 * needs a key and a usable `From`, so requiring an internal recipient here would
 * silently disable confirmations on a deployment that had set the key but not
 * `OWNER_EMAIL` — one of the ways this email could stop being sent with nothing
 * in the logs to say so.
 *
 * Returns null when there is no key, which is the only true "not configured"
 * state. The `From` address degrades to the verified support address rather than
 * being a reason to skip.
 */
export type ConfirmationEmailConfig = {
  apiKey: string;
  supportEmail?: string;
  emailFrom?: string;
  fromDomain?: string;
};

export function getConfirmationEmailConfig(): ConfirmationEmailConfig | null {
  const apiKey = normaliseEnvValue(process.env.RESEND_API_KEY);
  if (!apiKey) return null;

  const supportEmail = normaliseEnvValue(process.env.SUPPORT_EMAIL);
  const emailFrom = normaliseEnvValue(process.env.EMAIL_FROM);
  const fromDomain = normaliseEnvValue(process.env.RESEND_FROM_DOMAIN);

  return {
    apiKey,
    supportEmail: supportEmail || undefined,
    emailFrom: emailFrom || undefined,
    fromDomain: fromDomain || undefined,
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
export { isPlaceholder } from "@/lib/placeholder";
