/**
 * Constants shared between the notification channels and the environment reader.
 *
 * Kept in a module with no `server-only` marker so the pure testable code and
 * `env.ts` can both import it without pulling the server boundary into them.
 */

/**
 * Resend's onboarding domain.
 *
 * Delivers only to the address on the Resend account, which is all this project
 * needs — the notifications go to the business owner. It is why a verified
 * sending domain is optional here rather than a prerequisite.
 */
export const RESEND_ONBOARDING_DOMAIN = "onboarding@resend.dev";
