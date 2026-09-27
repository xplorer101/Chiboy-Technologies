"use server";

import { MessageStatus } from "@/generated/prisma/enums";

import {
  contactMessageSchema,
  fieldErrorsFrom,
  HONEYPOT_FIELD,
  isHoneypotTripped,
} from "@/lib/validation/forms";
import { isDatabaseUnavailableError } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { minutesUntilReset, rateLimit } from "@/lib/rate-limit";
import { readText } from "@/lib/actions/read-form-data";
import {
  GENERIC_ERROR_MESSAGE,
  SUCCESS_MESSAGE,
  getClientIdentifier,
  type ActionResult,
} from "@/lib/actions/shared";

/**
 * Contact form submission.
 *
 * A Server Action rather than an API route, for the reasons set out in the
 * README: typed results in both directions, Next's built-in origin check on the
 * POST, and a form that still submits without JavaScript.
 *
 * THE ORDER OF THE CHECKS IS THE DESIGN
 * -------------------------------------
 *  1. **Rate limit first.** Before any parsing or database work, so a flood costs
 *     as little as possible.
 *  2. **Honeypot second**, and it reports *success*. A bot that is told it
 *     failed has learned something; a bot that is told it succeeded has learned
 *     nothing and will keep submitting into the void. The cost is a false
 *     positive for a real visitor whose browser helpfully filled a hidden field,
 *     which is why the field is `autocomplete="off"`, hidden from assistive
 *     technology, and absent from the tab order.
 *  3. **Validate third**, with the same Zod schema the browser used.
 *  4. **Write last.**
 *
 * WHAT IS NEVER RETURNED
 * ----------------------
 * Prisma's error messages name tables, columns and constraints. Those go to the
 * server log and never to the client, which receives one generic sentence. The
 * one exception is a rate-limit refusal, which has to name itself for the limit
 * to mean anything.
 */

export type ContactActionResult = ActionResult<undefined>;

/**
 * Persists a contact message.
 *
 * Takes `FormData` rather than a typed object because a Server Action invoked
 * without JavaScript receives a real form post, and the two entry paths have to
 * be the same code — a form that only works with React is not a form.
 */
export async function submitContactMessage(
  formData: FormData,
): Promise<ContactActionResult> {
  const identifier = await getClientIdentifier();
  const limit = await rateLimit("contact", identifier);

  if (!limit.allowed) {
    return {
      status: "error",
      message: `We have received several messages from this connection already. Please try again in about ${minutesUntilReset(limit.resetAt)} minute${
        minutesUntilReset(limit.resetAt) === 1 ? "" : "s"
      }, or contact us by phone.`,
    };
  }

  if (isHoneypotTripped(formData)) {
    // Reported as success on purpose. See the note on ordering above.
    return { status: "success", message: SUCCESS_MESSAGE, data: undefined };
  }

  const parsed = contactMessageSchema.safeParse({
    fullName: readText(formData, "fullName"),
    email: readText(formData, "email"),
    phone: readText(formData, "phone"),
    message: readText(formData, "message"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields and try again.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  try {
    await prisma.contactMessage.create({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        // An empty string becomes null, so "no phone number" is stored as the
        // absence of one rather than as a blank value that looks like data.
        phone: parsed.data.phone === "" ? null : parsed.data.phone,
        message: parsed.data.message,
        status: MessageStatus.NEW,
      },
    });
  } catch (error) {
    // The detail is logged, not returned. A visitor learns only that it failed.
    console.error(
      "[contact] Submission failed:",
      error instanceof Error ? error.message : "unknown error",
    );

    return {
      status: "error",
      message: isDatabaseUnavailableError(error)
        ? "We could not reach our system just now, so your message was not saved. Please try again shortly, or contact us by phone or WhatsApp."
        : GENERIC_ERROR_MESSAGE,
    };
  }

  return { status: "success", message: SUCCESS_MESSAGE, data: undefined };
}

/** The hidden field, exported so the form and the check cannot drift apart. */
export { HONEYPOT_FIELD };
