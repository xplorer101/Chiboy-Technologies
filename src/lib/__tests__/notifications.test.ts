import { describe, expect, it } from "vitest";

import {
  contactPreferenceLabel,
  serviceRequestEmailBody,
  serviceRequestEmailSubject,
  serviceRequestWhatsAppText,
  toSingleLine,
  truncate,
  type NewServiceRequest,
} from "@/lib/notifications/template";
import { isRejection } from "@/lib/notifications/whatsapp";

/**
 * Notification formatting.
 *
 * The subject of this file: both notifications are built from text a stranger
 * typed, and a business inbox is the last place that should be a place where
 * someone's input breaks the layout of a message. The body of a notification is
 * also the main thing a human reads when a customer is waiting for a call, so
 * anything dropped or mangled here is a business problem, not a cosmetic one.
 *
 * Note what is deliberately NOT tested: that an email is sent, or that a
 * WhatsApp message is relayed. Those are the transport's job, and asserting on
 * them would only assert on a mock. What is tested is everything this project is
 * actually responsible for — the text it produces and the third-party protocol
 * assumptions it makes.
 */

const request: NewServiceRequest = {
  reference: "SR-20260927-A1B2C",
  name: "Ada Lovelace",
  phone: "+234 810 285 4969",
  email: "ada@example.com",
  service: "Networking",
  location: "Kuje, Abuja",
  contactPreference: "PHONE",
  description: "The office has no wired network and Wi-Fi drops in the afternoon.",
  attachmentCount: 0,
};

describe("toSingleLine", () => {
  it("collapses newlines so a multi-line description cannot break the layout", () => {
    expect(toSingleLine("line one\nline two\r\nline three")).toBe("line one line two line three");
  });

  it("collapses repeated whitespace", () => {
    expect(toSingleLine("  too     many\t\tspaces  ")).toBe("too many spaces");
  });

  it("strips control characters, so input cannot carry a terminal escape into a log or a terminal", () => {
    // ESC begins an ANSI sequence. If this survived, a description pasted into
    // whatever the owner opens the message in could reposition their cursor or
    // change colours.
    expect(toSingleLine("safe[31mred[0m")).toBe("safe [31mred [0m");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(toSingleLine("   \n\t  ")).toBe("");
  });
});

describe("truncate", () => {
  it("leaves short text untouched", () => {
    expect(truncate("short", 300)).toBe("short");
  });

  it("cuts at the limit and marks that it did", () => {
    const result = truncate("a".repeat(400), 300);
    expect(result).toHaveLength(300);
    expect(result.endsWith("…")).toBe(true);
  });

  it("does not cut a surrogate pair in half", () => {
    // "🎉" is two UTF-16 units. A naive slice(0, max) would leave a lone high
    // surrogate, rendering as a replacement character — a visible artefact at
    // exactly the moment someone is skimming a WhatsApp notification.
    const result = truncate("🎉".repeat(10), 5);
    expect(result).not.toContain("�");
    // Four whole emoji plus the ellipsis.
    expect([...result].filter((c) => c === "🎉")).toHaveLength(4);
  });

  it("does not leave a trailing space before the ellipsis", () => {
    expect(truncate("word word", 6)).toBe("word…");
  });
});

describe("contactPreferenceLabel", () => {
  it("renders the stored enum as English", () => {
    expect(contactPreferenceLabel("PHONE")).toBe("Phone call");
    expect(contactPreferenceLabel("WHATSAPP")).toBe("WhatsApp");
    expect(contactPreferenceLabel("EMAIL")).toBe("Email");
  });

  it("falls back to the raw value rather than showing nothing", () => {
    // A future enum value should appear, not disappear. The wrong word is
    // recoverable; a blank field in a notification is not.
    expect(contactPreferenceLabel("CARRIER_PIGEON")).toBe("CARRIER_PIGEON");
  });
});

describe("serviceRequestEmailSubject", () => {
  it("uses the specified format", () => {
    expect(serviceRequestEmailSubject("Networking")).toBe("New Service Request: Networking");
  });

  it("keeps the fixed prefix even when the service name is messy", () => {
    // The prefix is what an inbox filter would match on, so a newline in the
    // service name must not be able to displace it.
    const subject = serviceRequestEmailSubject("Networking\nBcc: someone@else.com");
    expect(subject.startsWith("New Service Request: ")).toBe(true);
    expect(subject).not.toContain("\n");
  });
});

describe("serviceRequestEmailBody", () => {
  const body = serviceRequestEmailBody(request);

  it("includes every field the owner needs to act", () => {
    expect(body).toContain(request.reference);
    expect(body).toContain("Ada Lovelace");
    expect(body).toContain("+234 810 285 4969");
    expect(body).toContain("ada@example.com");
    expect(body).toContain("Networking");
    expect(body).toContain("Kuje, Abuja");
    expect(body).toContain("Phone call");
  });

  it("keeps the description verbatim, since it is the substance of the request", () => {
    expect(body).toContain(request.description);
  });

  it("states that there are no attachments rather than omitting the field", () => {
    // An absent line reads as "not reported". An explicit "none" reads as
    // "confirmed none", which is the difference between reading a message and
    // finding a hidden file.
    expect(body).toContain("Attachments: none");
  });

  it("pluralises the attachment count", () => {
    expect(serviceRequestEmailBody({ ...request, attachmentCount: 1 })).toContain("Attachments: 1 file");
    expect(serviceRequestEmailBody({ ...request, attachmentCount: 2 })).toContain("Attachments: 2 files");
  });

  it("summarises in the first line, because inboxes show a preview", () => {
    expect(body.split("\n")[0]).toContain("New service request received");
  });
});

describe("serviceRequestWhatsAppText", () => {
  const text = serviceRequestWhatsAppText(request);

  it("includes the identifying fields so the owner can decide whether to open the record", () => {
    expect(text).toContain(request.reference);
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("+234 810 285 4969");
    expect(text).toContain("Networking");
  });

  it("is much shorter than the email, because it is read on a phone", () => {
    expect(text.length).toBeLessThan(serviceRequestEmailBody(request).length);
  });

  it("truncates a very long description", () => {
    const long = serviceRequestWhatsAppText({ ...request, description: "x".repeat(5000) });
    expect(long.length).toBeLessThan(700);
    expect(long).toContain("…");
  });

  it("flattens a multi-line description into one line", () => {
    const multi = serviceRequestWhatsAppText({
      ...request,
      description: "First paragraph.\n\nSecond paragraph.",
    });
    expect(multi).toContain("First paragraph. Second paragraph.");
  });
});

describe("isRejection", () => {
  /**
   * The single most important behaviour in the WhatsApp channel. CallMeBot
   * returns HTTP 200 for its own failures, so a transport that trusted the
   * status code would report every one of these as delivered.
   */
  it("treats the unactivated-number response as a failure", () => {
    // The response a new integration actually gets first, because activation is
    // a manual step the code cannot perform.
    expect(isRejection("Phone number is not activated")).toBe(true);
  });

  it("recognises the other documented failure bodies", () => {
    expect(isRejection("Invalid apikey")).toBe(true);
    expect(isRejection("invalid api key")).toBe(true);
    expect(isRejection("Phone number is not valid")).toBe(true);
    expect(isRejection("Error: something went wrong")).toBe(true);
  });

  it("accepts the success acknowledgement", () => {
    expect(isRejection("Message sent")).toBe(false);
  });

  it("is case-insensitive, since these are hand-written service strings", () => {
    expect(isRejection("MESSAGE SENT")).toBe(false);
    expect(isRejection("Phone number is NOT ACTIVATED")).toBe(true);
  });

  it("defaults to failure for an unrecognised body", () => {
    // Deliberate asymmetry. Missing a notification is recoverable; failing to
    // notice one that never arrived is not, because nobody knows to look.
    expect(isRejection("something entirely new from the service")).toBe(true);
  });

  it("treats an empty body as a failure, not as an implicit success", () => {
    // Regression. The caller falls back to `""` when the body cannot be read, so
    // a body that confirms nothing used to be read as a delivered message. The
    // original version of this function had exactly that bug.
    expect(isRejection("")).toBe(true);
    expect(isRejection("   ")).toBe(true);
  });

  it("does not read a negated acknowledgement as a delivery", () => {
    // "Message not sent" contains the word "sent". Checking for success before
    // checking for failure would report this as delivered.
    expect(isRejection("Message not sent")).toBe(true);
    expect(isRejection("Message wasn't sent")).toBe(true);
    expect(isRejection("Message was not sent")).toBe(true);
    expect(isRejection("Could not send message")).toBe(true);
  });

  it("accepts the other acknowledgement wordings the service uses", () => {
    expect(isRejection("Delivered")).toBe(false);
    expect(isRejection("OK")).toBe(false);
  });
});
