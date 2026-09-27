import "server-only";

import { Resend } from "resend";

import {
  resendFromAddress,
  serviceRequestEmailBody,
  serviceRequestEmailSubject,
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
 * WHY THE BODY IS PLAIN TEXT
 * --------------------------
 * Every value in it came from a public form. In an HTML body that is an
 * injection surface requiring escaping; there is no markup in a plain-text body,
 * so the problem does not exist. See the note in `template.ts`.
 *
 * WHY `replyTo` IS SET
 * --------------------
 * The most likely next action is a reply to the person who asked. Setting
 * `replyTo` to their address means the owner can just hit reply, instead of
 * copying an address out of the body — which is also the most likely place for a
 * typo to turn into a lost enquiry.
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
  config: { apiKey: string; ownerEmail: string; fromDomain?: string },
): Promise<NotificationResult> {
  const resend = new Resend(config.apiKey);
  const fromAddress = `CHIBOY TECHNOLOGIES <${resendFromAddress(config.fromDomain)}>`;

  console.log(`[notify:email] Attempting to send to ${config.ownerEmail} from ${fromAddress} (reference: ${request.reference})`);

  try {
    const send = resend.emails.send(
      {
        from: fromAddress,
        to: [config.ownerEmail],
        replyTo: request.email,
        subject: serviceRequestEmailSubject(request.service),
        text: serviceRequestEmailBody(request),
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
