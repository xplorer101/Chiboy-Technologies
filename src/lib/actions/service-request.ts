"use server";

import { RequestStatus } from "@/generated/prisma/enums";

import { deleteStoredFile, storeAttachments, type StoredAttachment } from "@/lib/upload/storage";
import {
  fieldErrorsFrom,
  isHoneypotTripped,
  OTHER_SERVICE,
  serviceRequestSchema,
} from "@/lib/validation/forms";
import { isDatabaseUnavailableError } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { minutesUntilReset, rateLimit } from "@/lib/rate-limit";
import { notifyNewServiceRequest } from "@/lib/notifications";
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
 * Same shape as the contact action, with the addition of file handling — which
 * is the part with real failure modes and therefore the part worth being careful
 * about.
 *
 * WHY ATTACHMENTS ARE STORED BEFORE THE ROW IS WRITTEN
 * ---------------------------------------------------
 * Files land on disk first, then the request is inserted, then the attachment
 * rows are written. The ordering is chosen so the database is never left
 * pointing at files that do not exist. If the insert fails, the files are
 * removed; the reverse order would leave a request claiming three attachments
 * that were never stored, which is the state nobody can reconcile later.
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

/** Read the uploaded files off the form, ignoring any empty file input. */
function collectFiles(formData: FormData): File[] {
  const entries = formData.getAll("attachments");
  return entries.filter(
    (entry): entry is File => entry instanceof File && entry.size > 0 && entry.name !== "",
  );
}

export async function submitServiceRequest(
  formData: FormData,
): Promise<ServiceRequestResult> {
  const identifier = await getClientIdentifier();
  // A tighter budget than the contact form: this one stores files, and each
  // attempt costs disk as well as a row.
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

  const files = collectFiles(formData);
  const uploaded = await storeAttachments(files);

  // A file the visitor should not have sent is a reason to reject: nothing has
  // been written, and sending it again unchanged would fail the same way.
  //
  // A storage backend that cannot be written to is not. The file was
  // acceptable and the enquiry is the thing that matters, so the request is
  // still recorded below and only the attachment is lost. The alternative —
  // failing the whole submission — loses a real customer over a supplementary
  // file, and is the path every Vercel deployment takes for any attachment.
  if (!uploaded.ok && !uploaded.storageUnavailable) {
    // Nothing was written to disk: `storeAttachments` validates every file before
    // writing any of them.
    return { status: "error", message: uploaded.message };
  }

  const attachmentProblem = !uploaded.ok ? uploaded.message : null;
  const storedFiles = uploaded.ok ? uploaded.files : [];

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
        // The one thing a human reading this record needs to know that the
        // columns cannot show: a file was offered and is not on disk.
        ...(attachmentProblem
          ? { internalNotes: `Attachment not stored: ${attachmentProblem}` }
          : {}),
        // Nested create, so the request and its attachments are one transaction.
        // A partial attachment set is not a state the database can be in.
        ...(storedFiles.length > 0
          ? { attachments: { create: toAttachmentRows(storedFiles) } }
          : {}),
      },
    });
  } catch (error) {
    // Roll the files back. The database write is the thing that failed, so the
    // files it would have referenced have no reason to exist.
    await Promise.all(storedFiles.map((file) => deleteStoredFile(file.storageKey)));

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
  //
  // `notifyNewServiceRequest` catches its own errors and resolves with a
  // per-channel outcome, but it is wrapped anyway: the request is already
  // durable, and an unexpected throw between here and the return must not
  // present a saved request as a failure. The trade is that an unforeseen bug
  // inside the notifier is invisible to the caller — it is logged, and the
  // business still has the record.
  await notifyNewServiceRequest({
    reference,
    name: values.fullName,
    phone: values.phone,
    email: values.email,
    service: serviceName || "Not specified",
    location: values.location,
    contactPreference: values.contactPref,
    description: values.description,
    attachmentCount: storedFiles.length,
  }).catch((error: unknown) => {
    console.error(
      `[service-request] Notification for ${reference} failed unexpectedly:`,
      error instanceof Error ? error.message : "unknown error",
    );
  });

  return {
    status: "success",
    // The stored request is reported as stored in both cases. When a file was
    // lost, the visitor is told plainly rather than shown a bare success they
    // would read as "everything you sent arrived".
    message: attachmentProblem ? `${SUCCESS_MESSAGE} ${attachmentProblem}` : SUCCESS_MESSAGE,
    data: { reference },
  };
}

/** Maps the storage result onto the attachment table's columns. */
function toAttachmentRows(files: readonly StoredAttachment[]) {
  return files.map((file) => ({
    originalName: file.originalName,
    storedName: file.storageKey.split("/").at(-1) ?? file.storageKey,
    storageKey: file.storageKey,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
  }));
}
