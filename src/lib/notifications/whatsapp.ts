import "server-only";

import { serviceRequestWhatsAppText, type NewServiceRequest } from "@/lib/notifications/template";

/**
 * WhatsApp notification via CallMeBot.
 *
 * HOW CALLMEBOT WORKS, AND WHAT IT ASSUMES
 * -----------------------------------------
 * CallMeBot relays a message to a WhatsApp number over its own WhatsApp
 * connection. The recipient must have sent the activation message to the
 * CallMeBot number from that phone *before* the first relay will be accepted.
 * Until then, every call returns 200 with a body saying the number is not
 * activated — which is the important operational detail here: **this API
 * reports failure in its body, not in its status code**, so a naive
 * `response.ok` check reports success for a message that was never delivered.
 *
 * WHY GET
 * -------
 * `whatsapp.php` accepts GET only. That puts the API key in a query string,
 * which is why the full URL must never be logged — see `redact` below, and the
 * note in the orchestrator.
 *
 * ALTERNATIVE WORTH KNOWING
 * -------------------------
 * The WhatsApp Cloud API is the official route and needs no per-number
 * activation step, but it requires a Meta business account, a verified sender
 * and a template message. CallMeBot is a single API key and works today; this is
 * a deliberate choice of the smaller requirement, not an oversight.
 */

/** Deadline for the relay. The visitor is waiting on this request. */
const SEND_TIMEOUT_MS = 8_000;

const ENDPOINT = "https://api.callmebot.com/whatsapp.php";

export type NotificationResult =
  | { ok: true }
  | { ok: false; channel: "whatsapp"; reason: string };

export async function sendServiceRequestWhatsApp(
  request: NewServiceRequest,
  config: { apiKey: string; phone: string },
): Promise<NotificationResult> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("phone", config.phone);
  url.searchParams.set("text", serviceRequestWhatsAppText(request));
  url.searchParams.set("apikey", config.apiKey);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      // CallMeBot redirects to a tracking page on success, which is the only
      // way the relay is confirmed. Sending "no-cors" is not an option server
      // side, and the endpoint is HTTPS.
      headers: { Accept: "text/plain" },
      // Unlike the email channel, this deadline is a real cancellation: `fetch`
      // accepts an `AbortSignal`, so the request is genuinely abandoned rather
      // than left running.
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      cache: "no-store",
    });

    const body = await response.text().catch(() => "");

    if (!response.ok) {
      return {
        ok: false,
        channel: "whatsapp",
        reason: redact(`HTTP ${response.status}`, config.apiKey),
      };
    }

    // The body is where this API reports its own failures, so it has to be read
    // rather than assumed empty. Only an explicit acknowledgement counts.
    if (isRejection(body)) {
      return {
        ok: false,
        channel: "whatsapp",
        reason: redact(firstLine(body), config.apiKey),
      };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, channel: "whatsapp", reason: redact(describe(error), config.apiKey) };
  }
}

/**
 * Recognises the failure bodies CallMeBot returns with a 200.
 *
 * THIS IS THE INTERESTING PART OF THE INTEGRATION. The service reports its own
 * failures in the response *body* while returning HTTP 200, so a caller that
 * checks only `response.ok` reports success for a message that was never sent.
 * The unactivated-number case — the one every new integration hits — is exactly
 * that: a 200 whose body says the number is not activated.
 *
 * The default is failure. "Message sent" is the only acknowledgement accepted;
 * anything else, including a body this code has never seen before, is treated as
 * a rejection. The asymmetry is deliberate: a false failure costs one log line
 * and the request is stored either way, whereas a false success means the owner
 * never learns an enquiry came in and a customer waits for a call that was never
 * prompted by any notification.
 *
 * Exported for testing. It is a protocol assumption about a third party, which
 * is precisely the kind of assumption that needs a test and gets no coverage
 * through the transport.
 */
export function isRejection(body: string): boolean {
  const normalised = body.toLowerCase().trim();

  // An empty body confirms nothing. The caller deliberately falls back to `""`
  // when the body cannot be read, so treating blank as success would turn a
  // network failure part-way through the response into a reported delivery.
  if (normalised.length === 0) return true;

  // Checked before the acknowledgement test, because a failure is phrased using
  // delivery words: "Message not sent" contains "sent", and a naive
  // success-first check would read that as a successful send.
  if (FAILURE_PATTERNS.some((pattern) => pattern.test(normalised))) return true;

  // Only an explicit acknowledgement counts. Anything unrecognised is a
  // rejection.
  return !ACKNOWLEDGEMENT_PATTERN.test(normalised);
}

/**
 * Phrases by which this service reports that it did not deliver.
 *
 * Each covers a distinct real response, or a negation that would otherwise be
 * misread as success. Written as patterns rather than an exact list because the
 * service's wording is informal and varies between English and translated
 * variants of the same messages.
 */
const FAILURE_PATTERNS = [
  /not activat/,
  /not valid/,
  /invalid api\s*key/,
  /not authoris/,
  /not authoriz/,
  /error/,
  /fail/,
  // The three negations that contain the word "sent".
  /not\s+sent/,
  /wasn'?t\s+sent/,
  /unsent/,
  /could\s+not\s+send/,
  /cannot\s+send/,
  /declin/,
  /reject/,
  /expired/,
  /quota/,
] as const;

/** What a real acknowledgement looks like. "Message sent" is the actual string. */
const ACKNOWLEDGEMENT_PATTERN = /\b(sent|delivered|ok)\b/;

function firstLine(body: string): string {
  const line = body.split("\n").find((entry) => entry.trim().length > 0) ?? "";
  return line.trim().slice(0, 200);
}

/**
 * Removes the API key and the full URL from anything about to be logged.
 *
 * A URL in a log line leaks the key, because the key is a query parameter. This
 * is the single most likely way this integration would leak its own credential,
 * so the whole URL is reduced to its origin before it goes anywhere near a log.
 */
function redact(message: string, apiKey: string): string {
  return message
    .split(apiKey)
    .join("[redacted]")
    .replace(/https:\/\/api\.callmebot\.com\S*/g, "[callmebot-url-redacted]");
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    return error.name === "TimeoutError" || error.name === "AbortError"
      ? `timed out after ${SEND_TIMEOUT_MS}ms`
      : error.message;
  }
  return "unknown error";
}
