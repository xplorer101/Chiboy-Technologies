import "server-only";

import { getNotificationConfig } from "@/lib/env";
import { sendServiceRequestEmail } from "@/lib/notifications/email";
import { sendServiceRequestWhatsApp } from "@/lib/notifications/whatsapp";
import type { NewServiceRequest } from "@/lib/notifications/template";
/**
 * Notification orchestration.
 *
 * THE CONTRACT
 * ------------
 * **This function never throws and never rejects.** By the time it is called the
 * request is already in the database, so a failure here is a failure to send a
 * *copy* of information that is safely stored. Failing the visitor's submission
 * at that point would be strictly worse in every direction: the business would
 * still have to retrieve the request, and the visitor would be told their
 * message was lost when it was not — so they would send it again.
 *
 * WHY THE CHANNELS RUN IN PARALLEL
 * --------------------------------
 * Sequentially, the visitor would wait for the sum of both channels, and one
 * slow third party would delay the other. `Promise.allSettled` starts both at
 * once and waits for both, so the cost is the slowest channel rather than the
 * total — while still reporting each outcome independently, which
 * `Promise.all` cannot do because it rejects on the first failure.
 *
 * Why they are awaited at all, rather than fired and forgotten: on a serverless
 * platform the runtime may freeze the instance the moment the response is
 * returned, so an un-awaited promise can simply never complete. Awaiting is the
 * only way to be sure the notification was actually attempted. The cost is added
 * to the visitor's wait, which is why both senders carry a hard deadline.
 *
 * WHAT IS LOGGED
 * --------------
 * The channel, the reference and the reason. Never the API key, never the
 * message body, and never the full CallMeBot URL — its query string contains the
 * key. Each sender redacts its own credential before returning a reason, so a
 * reason that reaches this file is already safe to log.
 */

export type NotificationOutcome = {
  email: "sent" | "skipped" | "failed";
  whatsapp: "sent" | "skipped" | "failed";
  /** Short, credential-free failure reasons. Server logs only. */
  reasons: string[];
};

/** One channel's result, discriminated so `ok` narrows the union. */
type NotificationResult =
  | { ok: true }
  | { ok: false; channel: "email" | "whatsapp"; reason: string };

export async function notifyNewServiceRequest(
  request: NewServiceRequest,
): Promise<NotificationOutcome> {
  const config = getNotificationConfig();

  const outcomes: NotificationOutcome = {
    email: config.email ? "failed" : "skipped",
    whatsapp: config.whatsapp ? "failed" : "skipped",
    reasons: [],
  };

  // Both channels start together and neither is allowed to reject. `allSettled`
  // rather than `all`, because `all` rejects on the first failure and would
  // report the email as failed when only WhatsApp was — losing the one channel
  // that actually worked.
  const [emailResult, whatsappResult] = await Promise.allSettled([
    config.email
      ? sendServiceRequestEmail(request, config.email)
      : Promise.resolve<NotificationResult>({ ok: true }),
    config.whatsapp
      ? sendServiceRequestWhatsApp(request, config.whatsapp)
      : Promise.resolve<NotificationResult>({ ok: true }),
  ]);

  record(outcomes, "email", config.email !== null, emailResult);
  record(outcomes, "whatsapp", config.whatsapp !== null, whatsappResult);

  if (outcomes.reasons.length > 0) {
    // Logged, not returned. The visitor has already been told the request was
    // received, and that is true — this line is how the business finds out that
    // a copy did not arrive.
    console.warn(
      `[notify] ${request.reference}: ${outcomes.email}/${outcomes.whatsapp} — ${outcomes.reasons.join("; ")}`,
    );
  } else if (outcomes.email === "skipped" && outcomes.whatsapp === "skipped") {
    console.warn(
      `[notify] ${request.reference}: no notification channel configured. The request is stored and will only be seen by whoever reads the database.`,
    );
  }

  return outcomes;
}

function record(
  outcomes: NotificationOutcome,
  channel: "email" | "whatsapp",
  configured: boolean,
  result: PromiseSettledResult<NotificationResult>,
): void {
  if (!configured) return;

  if (result.status === "rejected") {
    // Should be unreachable — both senders catch everything, and the email
    // sender's own deadline cannot reject — but a rejection escaping here must
    // not take the caller's success path with it. That path is the only thing
    // between a stored request and a visitor who believes it was lost.
    outcomes[channel] = "failed";
    outcomes.reasons.push(`${channel}: ${safeReason(result.reason)}`);
    return;
  }

  if (result.value.ok) {
    outcomes[channel] = "sent";
    return;
  }

  outcomes[channel] = "failed";
  outcomes.reasons.push(`${channel}: ${safeReason(result.value.reason)}`);
}

/** One line, no stack, nothing that could contain a credential or a payload. */
function safeReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message.slice(0, 200);
  if (typeof reason === "string") return reason.slice(0, 200);
  return "unknown error";
}
