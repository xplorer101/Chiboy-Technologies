"use server";

import { after } from "next/server";

import { RequestStatus } from "@/generated/prisma/enums";

import {
  fieldErrorsFrom,
  isHoneypotTripped,
  OTHER_SERVICE,
  serviceRequestSchema,
} from "@/lib/validation/forms";
import { imageUrlsSchema } from "@/lib/validation/images";
import { isDatabaseUnavailableError } from "@/lib/db-errors";
import { getConfirmationEmailConfig } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { minutesUntilReset, rateLimit } from "@/lib/rate-limit";
import { notifyNewServiceRequest, sendCustomerConfirmationEmail } from "@/lib/notifications";
import type { NewServiceRequest } from "@/lib/notifications/template";
import { readText } from "@/lib/actions/read-form-data";
import {
  GENERIC_ERROR_MESSAGE,
  SUCCESS_MESSAGE,
  generateReference,
  getClientIdentifier,
  type ActionResult,
} from "@/lib/actions/shared";

/**
 * Service request submission.
 *
 * Same shape as the contact action, with the addition of image attachments —
 * which have real failure modes and are therefore the part worth being careful
 * about.
 *
 * WHY THE IMAGES ARE UPLOADED BEFORE THE FORM IS SUBMITTED
 * -------------------------------------------------------
 * Images go straight from the browser to Vercel Blob, not through this action.
 * A Server Action request body is capped (about 4.5 MB on Vercel), so a handful
 * of phone photos would fail the submission outright if they were sent here.
 * The form therefore uploads each image as it is chosen and submits only the
 * URLs, which are a few hundred bytes.
 *
 * The consequence is that the bytes are already stored by the time this action
 * runs, so the URLs arrive from the client and must not be trusted. They are
 * re-validated here with the same schema the browser used — HTTPS, a Blob host,
 * an image extension, and at most the allowed number — so a crafted submission
 * cannot put an arbitrary URL into the record and the notification email.
 *
 * WHY NOTIFICATION IS LAST AND CANNOT FAIL THE REQUEST
 * ---------------------------------------------------
 * The notification is a copy of information that is already durable. Once the
 * insert has succeeded, treating an email outage as a failed submission would
 * tell the visitor their message was lost when it was not, which costs a
 * duplicate request and an apology. So the notifier is called after the write,
 * its result is not inspected, and it is not permitted to throw. The ordering
 * is the whole guarantee: a stored request is a stored request.
 *
 * The service itself is resolved by slug, and **only if the slug is one the site
 * published**. The schema constrains the value to slug shape, and the lookup
 * makes a match or a miss, so a crafted value cannot attach a request to a
 * category that was retired or never existed.
 */

export type ServiceRequestResult = ActionResult<{ reference: string }>;

/** Read the uploaded image URLs off the form, dropping empties. */
function collectImageUrls(formData: FormData): string[] {
  return formData
    .getAll("imageUrls")
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

export async function submitServiceRequest(
  formData: FormData,
): Promise<ServiceRequestResult> {
  const identifier = await getClientIdentifier();
  // A tighter budget than the contact form: this one can store images and row
  // creation is more expensive to absorb in bulk.
  const limit = await rateLimit("service-request", identifier);

  if (!limit.allowed) {
    const minutes = minutesUntilReset(limit.resetAt);
    return {
      status: "error",
      message: `Several service requests have already been sent from this connection. Please try again in about ${minutes} minute${
        minutes === 1 ? "" : "s"
      }, or contact us by phone or WhatsApp.`,
    };
  }

  if (isHoneypotTripped(formData)) {
    // Reported as success on purpose — see the contact action for the reasoning.
    return {
      status: "success",
      message: SUCCESS_MESSAGE,
      data: { reference: generateReference() },
    };
  }

  const parsed = serviceRequestSchema.safeParse({
    fullName: readText(formData, "fullName"),
    email: readText(formData, "email"),
    phone: readText(formData, "phone"),
    serviceId: readText(formData, "serviceId"),
    serviceOther: readText(formData, "serviceOther"),
    location: readText(formData, "location"),
    // A radio group with nothing selected sends nothing at all. Defaulting to
    // the schema's own default keeps that path from failing validation.
    contactPref: readText(formData, "contactPref") || "PHONE",
    description: readText(formData, "description"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields and try again.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { data: values } = parsed;

  // Resolve the service slug against the published list. A null result means the
  // slug was not one of ours — a retired category, or a crafted value — so the
  // request is filed as unassigned rather than against an arbitrary category.
  // The name is selected as well as the id, because the notification has to say
  // which service in words rather than quoting a slug back at the business.
  let serviceId: string | null = null;
  let serviceName = values.serviceOther;
  if (values.serviceId !== "" && values.serviceId !== OTHER_SERVICE) {
    const match = await prisma.serviceCategory.findUnique({
      where: { slug: values.serviceId },
      select: { id: true, name: true },
    });
    serviceId = match?.id ?? null;
    if (match) serviceName = match.name;
  }

  // A "not sure" or unmatched choice is stored as free text, or not at all.
  // Losing the category is better than storing a wrong one.
  const serviceOther =
    values.serviceId === OTHER_SERVICE
      ? values.serviceOther
      : serviceId === null && values.serviceId !== ""
        ? values.serviceOther || null
        : null;

  // The URLs were produced by the browser upload to Blob, so they are re-checked
  // here. A URL that fails is a reason to reject: nothing has been written, and
  // a caller sending an arbitrary URL is not one whose request should be filed
  // with a link the owner might click.
  const parsedImages = imageUrlsSchema.safeParse(collectImageUrls(formData));

  if (!parsedImages.success) {
    return {
      status: "error",
      message: parsedImages.error.issues[0]?.message ?? "Please check the attached images.",
      fieldErrors: { imageUrls: parsedImages.error.issues[0]?.message ?? "Invalid images." },
    };
  }

  const imageUrls = parsedImages.data;

  const reference = generateReference();

  try {
    await prisma.serviceRequest.create({
      data: {
        reference,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        serviceId,
        serviceOther,
        location: values.location,
        contactPref: values.contactPref,
        description: values.description,
        status: RequestStatus.NEW,
        imageUrls,
      },
    });
  } catch (error) {
    console.error(
      "[service-request] Submission failed:",
      error instanceof Error ? error.message : "unknown error",
    );

    return {
      status: "error",
      message: isDatabaseUnavailableError(error)
        ? "We could not reach our system just now, so your request was not saved. Please try again shortly, or contact us by phone or WhatsApp."
        : GENERIC_ERROR_MESSAGE,
    };
  }

  // The request is stored. From here on, nothing can make the visitor's
  // submission "not have happened", so nothing below is allowed to reject.
  const requestPayload = {
    reference,
    name: values.fullName,
    phone: values.phone,
    email: values.email,
    service: serviceName || "Not specified",
    location: values.location,
    contactPreference: values.contactPref,
    description: values.description,
    attachmentCount: imageUrls.length,
    imageUrls,
  } satisfies NewServiceRequest;

  // `notifyNewServiceRequest` catches its own errors and resolves with a
  // per-channel outcome, but it is wrapped anyway: the request is already
  // durable, and an unexpected throw between here and the return must not
  // present a saved request as a failure. The trade is that an unforeseen bug
  // inside the notifier is invisible to the caller — it is logged, and the
  // business still has the record.
  await notifyNewServiceRequest(requestPayload).catch((error: unknown) => {
    console.error(
      `[service-request] Notification for ${reference} failed unexpectedly:`,
      error instanceof Error ? error.message : "unknown error",
    );
  });

  // The customer confirmation is scheduled AFTER the response is returned, with
  // `after()`. Two reasons, and the second is the one that was actually losing
  // these emails:
  //
  //  1. The visitor does not wait on a second email round trip to see their
  //     reference.
  //  2. Awaiting it inline here made it the *last* of several sequential,
  //     individually-8-second deadlines (rate limit, database, owner email,
  //     WhatsApp). A slow Resend could push the total past the serverless
  //     function's budget, and the confirmation — being last — was the work the
  //     runtime cancelled before it ever reached Resend.
  //
  // `after()` still registers the promise with the runtime, so the send is
  // awaited to completion rather than abandoned when the response is sent.
  await runAfterResponse(() => sendCustomerConfirmation(requestPayload));

  return {
    status: "success",
    message: SUCCESS_MESSAGE,
    data: { reference },
  };
}

/**
 * Runs post-response work when the runtime supports it, otherwise awaits it.
 *
 * `after()` throws outside a request scope — a unit test, or any script that
 * imports this action directly. Falling back to an inline await keeps those
 * callers working and keeps the task's own error handling the single thing that
 * decides what happens on failure, rather than having two different paths.
 */
async function runAfterResponse(task: () => Promise<void>): Promise<void> {
  try {
    after(task);
  } catch {
    await task();
  }
}

/**
 * Sends the customer confirmation. Best-effort by construction: the request is
 * already stored, so this must never throw and never affect the visitor.
 *
 * EVERY WAY IT CAN BE SKIPPED OR FAIL IS LOGGED. "The customer never got a
 * confirmation and the logs say nothing" was the original complaint, and it is
 * the failure mode this function exists to remove: a skip is now as visible as
 * a failure, and both name their reason.
 *
 * The recipient is the customer; the `From` and `replyTo` resolve inside the
 * template module, defaulting to the verified support address.
 */
async function sendCustomerConfirmation(request: NewServiceRequest): Promise<void> {
  const config = getConfirmationEmailConfig();

  if (!config) {
    console.error(
      `[service-request] ${request.reference}: confirmation email skipped (reason: RESEND_API_KEY is not set)`,
    );
    return;
  }

  console.log(
    `[service-request] ${request.reference}: sending confirmation email to ${request.email}`,
  );

  try {
    const result = await sendCustomerConfirmationEmail(request, config);

    if (result.ok) {
      console.log(
        `[service-request] ${request.reference}: confirmation email accepted by Resend`,
      );
    } else {
      console.error(
        `[service-request] ${request.reference}: confirmation email failed (reason: ${result.reason})`,
      );
    }
  } catch (error) {
    // Documented not to throw, but a bug here must still not surface as a
    // failed submission for a request that is already in the database.
    console.error(
      `[service-request] ${request.reference}: confirmation email threw unexpectedly:`,
      error instanceof Error ? error.message : "unknown error",
    );
  }
}
