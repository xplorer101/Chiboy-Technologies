import "server-only";

import { headers } from "next/headers";

/**
 * Shared plumbing for the two public form actions.
 */

/**
 * The result of a form submission.
 *
 * A discriminated union rather than a bag of optional fields, so every caller
 * has to handle success and failure. An action that returned
 * `{ ok?: boolean }` would eventually be called somewhere that checked neither.
 */
export type ActionResult<T = undefined> =
  | { status: "success"; message: string; data: T }
  | {
      status: "error";
      /**
       * Safe to render. A visitor-facing sentence, never an exception message,
       * a stack, a table name, a file path or a database constraint name.
       */
      message: string;
      /** Keyed by field name, for inline display next to the offending input. */
      fieldErrors?: Record<string, string>;
    };

/**
 * The one success message, shared by both forms.
 *
 * Specified copy, and identical everywhere, so a visitor who submits twice or
 * across two forms gets the same answer. It states only what has actually
 * happened — a request has been received — and makes no promise about when
 * anyone will reply, because that depends on staffing the site cannot observe.
 */
export const SUCCESS_MESSAGE =
  "Your request has been received. CHIBOY TECHNOLOGIES will contact you shortly.";

/**
 * The message shown for any unexpected server-side failure.
 *
 * Generic on purpose. Every failure path in the actions funnels here, so a
 * database that is down, a unique-constraint violation and a bug all produce the
 * same words. The alternative — surfacing the real error — would tell an
 * attacker the shape of the system, and would tell a visitor something
 * alarming and useless.
 */
export const GENERIC_ERROR_MESSAGE =
  "Something went wrong on our side and your message was not sent. Please try again, or contact us directly using the details on this page.";

/**
 * Best-effort client identifier for rate limiting.
 *
 * `x-forwarded-for` is a list, leftmost first, and the leftmost entry is the
 * one a client can control. On Vercel the platform appends the real client
 * address to that list, so the right value to read is the **last** entry — the
 * one the edge added rather than the one the visitor supplied. Reading the
 * first entry would let an attacker defeat the limiter by sending its own
 * header.
 *
 * If a deployment does not append to the header, the leftmost value is used
 * anyway as a fallback. That is weaker — it is client-controlled — but a weak
 * identifier still blunts a naive script, and the honeypot and validation are
 * the real defences either way.
 */
export async function getClientIdentifier(): Promise<string> {
  const headerList = await headers();

  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((value) => value.trim()).filter(Boolean);
    if (hops.length > 0) {
      return (hops[hops.length - 1] as string).slice(0, 64);
    }
  }

  // Vercel sets this to the connecting address.
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.slice(0, 64);

  // Nothing identifiable. Everyone shares one bucket, which is the safe
  // direction to fail: it lowers the effective limit rather than removing it.
  return "unknown";
}

/**
 * A human-quotable reference for a service request.
 *
 * `SR-<date>-<random>`, so a visitor can read it down a phone line and it is
 * still recognisable in a list. The random part is base32 from a CSPRNG, giving
 * 25 bits, which is ample: a collision would need two requests generated in the
 * same second *and* the same 25 bits, and the column is unique so a collision
 * surfaces as an error rather than as a silent overwrite.
 */
export function generateReference(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);

  let suffix = "";
  for (const byte of bytes) {
    suffix += alphabet[byte % alphabet.length];
  }

  return `SR-${date}-${suffix}`;
}
