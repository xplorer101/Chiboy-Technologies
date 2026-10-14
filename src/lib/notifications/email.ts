import "server-only";

import { Resend } from "resend";

import {
  resolveFromAddress,
  resolveSupportEmail,
  serviceRequestEmailBody,
  serviceRequestEmailHtml,
  serviceRequestEmailSubject,
  customerConfirmationEmailHtml,
  customerConfirmationEmailText,
  customerConfirmationEmailSubject,
  type NewServiceRequest,
} from "@/lib/notifications/template";

/**
 * Email notification via Resend.
 *
 * WHY A DEPENDENCY FOR ONE HTTPS CALL
 * -----------------------------------
 * `resend` is used rather than a hand-rolled `fetch`, because it does the parts
 * that are easy to get quietly wrong: it distinguishes an API rejection from a
 * network failure (a 422 means the request was wrong and retrying is pointless),
 * it types the request body, and it accepts an idempotency key. The cost is a
 * dependency tree that has to be kept current. It is verified as contributing no
 * known advisories.
 *
 * WHY THE BODY IS PLAIN TEXT, WITH AN HTML ALTERNATIVE
 * ----------------------------------------------------
 * The text part is authoritative, and every value in it came from a public
 * form. The HTML part exists only so the links to the visitor's images are
 * clickable in clients that do not linkify plain text; it carries the same
 * values, escaped. See the note in `template.ts`.
 *
 * WHY `replyTo` IS SET
 * --------------------
 * On the owner notification, setting `replyTo` to the visitor's address means
 * the most likely next action — replying to the person who asked — is one
 * keystroke, instead of copying an address out of the body, which is also the
 * most likely place for a typo to turn into a lost enquiry. On the customer
 * confirmation it is the support address instead, so a reply from the customer
 * reaches the support inbox rather than a no-reply sender.
 *
 * WHY THIS CALL IS BOUNDED BY A RACE AND NOT BY AN ABORT
 * -------------------------------------------------------
 * The SDK's `CreateEmailRequestOptions` accepts only `query`, `headers` and
 * `idempotencyKey` — there is no `signal` and no timeout option. So there is no
 * way to cancel the request. `withDeadline` bounds how long this *function*
 * waits, which stops a slow third party from holding a visitor's submission
 * open, but the underlying request is left to finish on its own. On a serverless
 * runtime that costs nothing, because the instance is frozen or reclaimed once
 * the response is returned. If this ever ran on a long-lived Node server it would
 * be a real leak, and the fix would be to drop the SDK and use `fetch` directly.
 */

/** How long this module waits for Resend before reporting a failure. */
const SEND_TIMEOUT_MS = 8_000;

/** Outcome of one channel. Discriminated on `ok`, so callers narrow on it. */
export type NotificationResult =
  | { ok: true }
  | { ok: false; channel: "email"; reason: string };

export async function sendServiceRequestEmail(
  request: NewServiceRequest,
  config: {
    apiKey: string;
    ownerEmail: string;
    supportEmail?: string | undefined;
    emailFrom?: string | undefined;
    fromDomain?: string | undefined;
  },
): Promise<NotificationResult> {
  const resend = new Resend(config.apiKey);
  const fromAddress = resolveFromAddress(config.emailFrom, config.fromDomain);
  // The internal notification goes to the support inbox. When `SUPPORT_EMAIL`
  // is unset it falls back to the support address rather than to the owner
  // address, so configuring only `OWNER_EMAIL` still delivers.
  const toAddress = resolveSupportEmail(config.supportEmail);

  console.log(`[notify:email] Attempting to send to ${toAddress} from ${fromAddress} (reference: ${request.reference})`);

  try {
    const send = resend.emails.send(
      {
        from: fromAddress,
        to: [toAddress],
        replyTo: request.email,
        subject: serviceRequestEmailSubject(request.service),
        text: serviceRequestEmailBody(request),
        html: serviceRequestEmailHtml(request),
      },
      {
        idempotencyKey: request.reference,
      },
    );

    const result = await withDeadline(send, SEND_TIMEOUT_MS);

    if (result.timedOut) {
      console.log(`[notify:email] TIMEOUT after ${SEND_TIMEOUT_MS}ms (reference: ${request.reference})`);
      return { ok: false, channel: "email", reason: `timed out after ${SEND_TIMEOUT_MS}ms` };
    }

    if (result.value.error) {
      console.log(`[notify:email] Resend API error: ${result.value.error.message} (reference: ${request.reference})`);
      return { ok: false, channel: "email", reason: redact(result.value.error.message) };
    }

    console.log(`[notify:email] SUCCESS: Resend accepted (id: ${result.value.data?.id ?? "unknown"}) (reference: ${request.reference})`);
    return { ok: true };
  } catch (error) {
    console.log(`[notify:email] EXCEPTION: ${describe(error)} (reference: ${request.reference})`);
    return { ok: false, channel: "email", reason: redact(describe(error)) };
  }
}

/**
 * Stops waiting for a promise that cannot be cancelled.
 *
 * The losing promise gets a no-op `.catch` attached, which is not optional: a
 * request that times out here and rejects a second later would otherwise become
 * an unhandled rejection, which on Node terminates the process by default. The
 * whole point of this function is to contain a slow dependency, and an unhandled
 * rejection would do far more damage than the one it prevents.
 */
function withDeadline<T>(
  work: Promise<T>,
  ms: number,
): Promise<{ timedOut: false; value: T } | { timedOut: true }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ timedOut: true }), ms);
    // Never holds the event loop open, and never delays a serverless response.
    timer.unref?.();

    work
      .then((value) => {
        clearTimeout(timer);
        resolve({ timedOut: false, value });
      })
      .catch(() => {
        clearTimeout(timer);
        // Resolved already with `timedOut: true`; this only prevents the
        // unhandled rejection. The caller's own `catch` never sees it, which is
        // the intent: past the deadline the send is no longer the visitor's
        // problem.
      });
  });
}

/**
 * Strips anything that looks like a credential from a message before it is
 * logged.
 *
 * Resend error bodies can echo the submitted request. Logging one verbatim is
 * how an API key ends up in a log aggregator, so the key is replaced wherever it
 * appears rather than only at the top level, and Resend's own key format is
 * caught even when the configured key is not the one that appeared.
 */
function redact(message: string): string {
  const key = process.env.RESEND_API_KEY?.trim();
  const withoutKey = key ? message.split(key).join("[redacted]") : message;
  return withoutKey.replace(/\bre_[A-Za-z0-9_-]{6,}\b/g, "[redacted]").slice(0, 200);
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    // A timeout is worth naming, because it means "slow" rather than "broken" and
    // the two are fixed in different places.
    return error.name === "TimeoutError" || error.name === "AbortError"
      ? "timed out"
      : error.message;
  }
  return "unknown error";
}

/**
 * Sends a branded HTML confirmation email to the customer.
 *
 * This is a best-effort notification: the request is already stored, so a failure
 * here must not affect the visitor's success response. Errors are logged but
 * never thrown.
 *
 * Uses the same Resend config (API key, from address) as the owner notification.
 * The `from` address is the same verified-domain address so the customer sees
 * a consistent sender identity, and `replyTo` points at the support inbox.
 */
export async function sendCustomerConfirmationEmail(
  request: NewServiceRequest,
  config: {
    apiKey: string;
    ownerEmail: string;
    supportEmail?: string | undefined;
    emailFrom?: string | undefined;
    fromDomain?: string | undefined;
  },
): Promise<NotificationResult> {
  const resend = new Resend(config.apiKey);
  const fromAddress = resolveFromAddress(config.emailFrom, config.fromDomain);
  // A reply goes to support rather than to the no-reply sender the message came
  // from, so a customer who hits reply is answered instead of silently dropped.
  const replyTo = resolveSupportEmail(config.supportEmail);
  const subject = customerConfirmationEmailSubject(request.reference);
  const html = customerConfirmationEmailHtml(request, replyTo);
  const text = customerConfirmationEmailText(request, replyTo);

  console.log(`[notify:email:customer] Attempting to send confirmation to ${request.email} from ${fromAddress} (reference: ${request.reference})`);

  try {
    const send = resend.emails.send(
      {
        from: fromAddress,
        to: [request.email],
        replyTo,
        subject,
        html,
        text,
      },
      {
        // Different idempotency key from the owner notification so both can
        // coexist for the same reference without colliding.
        idempotencyKey: `customer-${request.reference}`,
      },
    );

    const result = await withDeadline(send, SEND_TIMEOUT_MS);

    if (result.timedOut) {
      console.log(`[notify:email:customer] TIMEOUT after ${SEND_TIMEOUT_MS}ms (reference: ${request.reference})`);
      return { ok: false, channel: "email", reason: `timed out after ${SEND_TIMEOUT_MS}ms` };
    }

    if (result.value.error) {
      console.log(`[notify:email:customer] Resend API error: ${result.value.error.message} (reference: ${request.reference})`);
      return { ok: false, channel: "email", reason: redact(result.value.error.message) };
    }

    console.log(`[notify:email:customer] SUCCESS: Resend accepted (id: ${result.value.data?.id ?? "unknown"}) (reference: ${request.reference})`);
    return { ok: true };
  } catch (error) {
    console.log(`[notify:email:customer] EXCEPTION: ${describe(error)} (reference: ${request.reference})`);
    return { ok: false, channel: "email", reason: redact(describe(error)) };
  }
}
