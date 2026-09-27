import { beforeEach, describe, expect, it, vi } from "vitest";

import { SUCCESS_MESSAGE, GENERIC_ERROR_MESSAGE } from "@/lib/actions/shared";
import type { NotificationOutcome } from "@/lib/notifications";
import type { NewServiceRequest } from "@/lib/notifications/template";
import { isDatabaseUnavailableError } from "@/lib/db-errors";

/**
 * The failure contract between a stored request and its notification.
 *
 * This is the whole justification for the ordering in `service-request.ts`: the
 * database write is the submission, and the notification is a copy of it. The
 * test file exists because that distinction is easy to state and easy to break —
 * a well-meaning refactor that wraps the notification in the same `try` as the
 * insert would turn an email outage into a visitor being told their request was
 * lost, which is both a lie and the thing that produces duplicate submissions.
 *
 * The database is never contacted here. What is under test is the branching, and
 * a real database would only add a network dependency without testing any more of
 * the decision.
 */

const prismaMock = {
  serviceCategory: { findUnique: vi.fn() },
  serviceRequest: { create: vi.fn() },
};

const storageMock = {
  storeAttachments: vi.fn(),
  deleteStoredFile: vi.fn(),
};

const notifyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/upload/storage", () => ({
  storeAttachments: storageMock.storeAttachments,
  deleteStoredFile: storageMock.deleteStoredFile,
}));
vi.mock("@/lib/notifications", () => ({ notifyNewServiceRequest: notifyMock }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 2, resetAt: Date.now() + 600_000 })),
  minutesUntilReset: vi.fn(() => 10),
}));
// A Server Action's module scope must not run a module that requires a real
// request context. This keeps the action importable while leaving that contract
// to the runtime, which is what actually enforces it.
vi.mock("@/lib/actions/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/actions/shared")>();
  return { ...actual, getClientIdentifier: vi.fn(async () => "203.0.113.9") };
});

const { submitServiceRequest } = await import("@/lib/actions/service-request");

/** A minimal, valid submission. Individual tests override single fields. */
function validForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const fields: Record<string, string> = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+2348102854969",
    serviceId: "networking",
    serviceOther: "",
    location: "Kuje, Abuja",
    contactPref: "PHONE",
    description: "The office has no wired network.",
    website: "",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.serviceCategory.findUnique.mockResolvedValue({ id: "cat_1", name: "Networking" });
  prismaMock.serviceRequest.create.mockResolvedValue({ id: "req_1" });
  storageMock.storeAttachments.mockResolvedValue({ ok: true, files: [] });
  storageMock.deleteStoredFile.mockResolvedValue(undefined);
  notifyMock.mockResolvedValue({ email: "sent", whatsapp: "sent", reasons: [] });
});

/** The payload the notifier was called with, asserted to exist exactly once. */
function notifiedPayload(): NewServiceRequest {
  const call = notifyMock.mock.calls[0];
  expect(call, "expected the notifier to have been called").toBeDefined();
  return call![0] as NewServiceRequest;
}

/** The `data` object handed to the Prisma insert. */
function insertedRow(): { serviceId: string | null } {
  const call = prismaMock.serviceRequest.create.mock.calls[0];
  expect(call, "expected a service request to have been created").toBeDefined();
  return (call![0] as { data: { serviceId: string | null } }).data;
}

describe("submitServiceRequest — notification failure must not fail the request", () => {
  it("returns success when the database write succeeds and notifications report failure", async () => {
    // The scenario the whole ordering exists for: the enquiry is safely stored,
    // and one of the copies never arrived.
    notifyMock.mockResolvedValue({
      email: "failed",
      whatsapp: "failed",
      reasons: ["email: timed out after 8000ms"],
    });

    const result = await submitServiceRequest(validForm());

    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.message).toBe(SUCCESS_MESSAGE);
    expect(prismaMock.serviceRequest.create).toHaveBeenCalledOnce();
  });

  it("returns success when the notifier throws outright", async () => {
    // Stronger than the case above: this is not a returned failure value, it is
    // an exception escaping the module. It still must not reach the visitor,
    // because the request is already durable and telling them otherwise costs a
    // duplicate submission.
    notifyMock.mockRejectedValue(new Error("resend module exploded"));

    const result = await submitServiceRequest(validForm());

    expect(result.status).toBe("success");
  });

  it("does not leak the internal failure reason to the visitor", async () => {
    notifyMock.mockResolvedValue({
      email: "failed",
      whatsapp: "failed",
      reasons: ["email: API key re_live_abc123 rejected", "whatsapp: not activated"],
    });

    const result = await submitServiceRequest(validForm());
    const serialised = JSON.stringify(result);

    // An API key or a third party's wording has no business in a response body.
    expect(serialised).not.toContain("re_live_abc123");
    expect(serialised).not.toContain("not activated");
  });

  it("still returns an error when the database write itself fails", async () => {
    // The other half of the contract, and the reason notifications are ordered
    // after the write: a stored-but-unnotified request is recoverable, an
    // unstored one is not.
    prismaMock.serviceRequest.create.mockRejectedValue(new Error("write failed"));

    const result = await submitServiceRequest(validForm());

    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.message).toBe(GENERIC_ERROR_MESSAGE);
    // Nothing to notify about — the request does not exist.
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("does not call the notifier before the write has succeeded", async () => {
    // Ordering, asserted rather than assumed. If the notification were moved
    // ahead of the insert, a failed write would alert the owner about an enquiry
    // that was never recorded.
    let notifyRan = false;
    notifyMock.mockImplementation(async () => {
      notifyRan = true;
      return { email: "sent", whatsapp: "sent", reasons: [] };
    });
    prismaMock.serviceRequest.create.mockImplementation(async () => {
      // If the notifier ran first, this flag would already be set.
      expect(notifyRan).toBe(false);
      return { id: "req_1" };
    });

    await submitServiceRequest(validForm());
    expect(notifyRan).toBe(true);
  });
});

describe("submitServiceRequest — what the notifier is told", () => {
  it("passes the resolved service name, not the slug", async () => {
    await submitServiceRequest(validForm());

    // A slug in a business notification is unreadable; the name is the point.
    expect(notifiedPayload().service).toBe("Networking");
  });

  it("passes the human-readable contact preference and the reference", async () => {
    const result = await submitServiceRequest(validForm({ contactPref: "WHATSAPP" }));

    expect(notifiedPayload().contactPreference).toBe("WHATSAPP");
    if (result.status === "success") {
      // The reference the visitor is shown and the business is emailed must be
      // the same string, or a follow-up phone call quotes a number that matches
      // nothing in the inbox.
      expect(notifiedPayload().reference).toBe(result.data.reference);
    }
  });

  it("reports an unmatched service slug as unfiled rather than guessing", async () => {
    prismaMock.serviceCategory.findUnique.mockResolvedValue(null);

    const result = await submitServiceRequest(validForm({ serviceId: "retired-service" }));

    expect(result.status).toBe("success");
    // A notification saying "Networking" for a request filed against nothing
    // would send the owner to the wrong record.
    expect(notifiedPayload().service).not.toBe("Networking");
    expect(insertedRow().serviceId).toBeNull();
  });

  it("counts the stored files so the owner knows to look for them", async () => {
    storageMock.storeAttachments.mockResolvedValue({
      ok: true,
      files: [
        { storageKey: "a/1", originalName: "plan.pdf", mimeType: "application/pdf", sizeBytes: 10 },
        { storageKey: "a/2", originalName: "photo.png", mimeType: "image/png", sizeBytes: 20 },
      ],
    });

    await submitServiceRequest(validForm());

    expect(notifiedPayload().attachmentCount).toBe(2);
  });

  it("does not notify for a rejected submission", async () => {
    const result = await submitServiceRequest(validForm({ email: "not-an-email" }));

    expect(result.status).toBe("error");
    expect(prismaMock.serviceRequest.create).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("does not notify for a honeypot trip", async () => {
    // The honeypot path reports success to a bot and stores nothing. Notifying
    // would tell the owner about a submission that does not exist.
    const result = await submitServiceRequest(validForm({ website: "https://spam.example" }));

    expect(result.status).toBe("success");
    expect(prismaMock.serviceRequest.create).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });
});

describe("notifyNewServiceRequest — channel independence", () => {
  // The orchestrator is mocked in the tests above, so its own behaviour — the
  // part that decides a missing channel is not an error — is checked here
  // against the real implementation, with only the two senders replaced.
  const emailMock = vi.fn();
  const whatsappMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    // This block tests the real orchestrator, so the file-level mock of the
    // module under test is replaced with the module itself. Only the two
    // transports below it stay mocked. Without this, the import would resolve to
    // the stub and every assertion would be about the mock.
    vi.doMock("@/lib/notifications", () => vi.importActual("@/lib/notifications"));
    vi.doMock("@/lib/notifications/email", () => ({ sendServiceRequestEmail: emailMock }));
    vi.doMock("@/lib/notifications/whatsapp", () => ({
      sendServiceRequestWhatsApp: whatsappMock,
    }));
  });

  async function run(config: {
    email: { apiKey: string; ownerEmail: string; fromDomain: string } | null;
    whatsapp: { apiKey: string; phone: string } | null;
  }): Promise<NotificationOutcome> {
    vi.doMock("@/lib/env", () => ({ getNotificationConfig: () => config }));
    const module = await import("@/lib/notifications");
    return module.notifyNewServiceRequest({
      reference: "SR-20260927-A1B2C",
      name: "Ada Lovelace",
      phone: "+2348102854969",
      email: "ada@example.com",
      service: "Networking",
      location: "Kuje, Abuja",
      contactPreference: "PHONE",
      description: "No wired network.",
      attachmentCount: 0,
    });
  }

  it("skips both channels when neither is configured, without throwing", async () => {
    const outcome = await run({ email: null, whatsapp: null });

    expect(outcome).toEqual({ email: "skipped", whatsapp: "skipped", reasons: [] });
    expect(emailMock).not.toHaveBeenCalled();
    expect(whatsappMock).not.toHaveBeenCalled();
  });

  it("sends the email and skips WhatsApp when only Resend is configured", async () => {
    emailMock.mockResolvedValue({ ok: true });

    const outcome = await run({
      email: { apiKey: "k", ownerEmail: "o@example.com", fromDomain: "d" },
      whatsapp: null,
    });

    expect(outcome.email).toBe("sent");
    expect(outcome.whatsapp).toBe("skipped");
  });

  it("starts both channels concurrently rather than one after the other", async () => {
    // The stated requirement: neither channel blocks the other. Verified with a
    // gate rather than a timer, so the result does not depend on machine speed.
    //
    // Both senders block until released. If the channels ran sequentially, the
    // second would not begin until the first finished — which it never does,
    // because the gate is only released after both have started. So the await
    // below can only complete if the two are genuinely in flight together, and
    // a sequential implementation would hang and fail on the test timeout.
    let releaseGate: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });

    const started: string[] = [];
    // `new Promise` runs its executor synchronously, so every resolver is
    // registered by the time this expression finishes.
    const resolvers = new Map<string, () => void>();
    const bothStarted = ["email", "whatsapp"].map(
      (channel) =>
        new Promise<void>((resolve) => {
          resolvers.set(channel, resolve);
        }),
    );

    const signalStart = (channel: string) => {
      started.push(channel);
      resolvers.get(channel)?.();
    };

    emailMock.mockImplementation(async () => {
      signalStart("email");
      await gate;
      return { ok: true };
    });
    whatsappMock.mockImplementation(async () => {
      signalStart("whatsapp");
      await gate;
      return { ok: true };
    });

    const pending = run({
      email: { apiKey: "k", ownerEmail: "o@example.com", fromDomain: "d" },
      whatsapp: { apiKey: "k", phone: "2348102854969" },
    });

    await Promise.all(bothStarted);
    expect(started.sort()).toEqual(["email", "whatsapp"]);

    releaseGate();
    await expect(pending).resolves.toMatchObject({ email: "sent", whatsapp: "sent" });
  });

  it("records a failing channel without losing the channel that worked", async () => {
    emailMock.mockResolvedValue({ ok: false, channel: "email", reason: "API key rejected" });
    whatsappMock.mockResolvedValue({ ok: true });

    const outcome = await run({
      email: { apiKey: "k", ownerEmail: "o@example.com", fromDomain: "d" },
      whatsapp: { apiKey: "k", phone: "2348102854969" },
    });

    // `Promise.all` would have rejected here and lost the WhatsApp result.
    expect(outcome.email).toBe("failed");
    expect(outcome.whatsapp).toBe("sent");
    expect(outcome.reasons[0]).toContain("API key rejected");
  });

  it("survives a sender that rejects instead of returning a failure", async () => {
    emailMock.mockRejectedValue(new Error("network down"));
    whatsappMock.mockResolvedValue({ ok: true });

    const outcome = await run({
      email: { apiKey: "k", ownerEmail: "o@example.com", fromDomain: "d" },
      whatsapp: { apiKey: "k", phone: "2348102854969" },
    });

    expect(outcome.email).toBe("failed");
    expect(outcome.whatsapp).toBe("sent");
  });
});

describe("isDatabaseUnavailableError still classifies a Prisma connection failure", () => {
  it("reports a pooler timeout as a database outage, not a generic error", () => {
    // Guards the import above against a refactor that changes the classifier's
    // signature, which would otherwise turn every database outage into the
    // generic message and lose the "try again shortly" guidance.
    const error = Object.assign(new Error("Connection terminated due to connection timeout"), {
      code: "P1002",
    });

    expect(isDatabaseUnavailableError(error)).toBe(true);
  });
});
