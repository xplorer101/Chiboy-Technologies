import { describe, expect, it } from "vitest";

import {
  contactPreferenceLabel,
  customerConfirmationEmailHtml,
  customerConfirmationEmailText,
  resolveFromAddress,
  resolveSupportEmail,
  resendFromAddress,
  RESEND_ONBOARDING_ADDRESS,
  serviceRequestEmailBody,
  serviceRequestEmailHtml,
  serviceRequestEmailSubject,
  serviceRequestWhatsAppText,
  SUPPORT_EMAIL_ADDRESS,
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

describe("resendFromAddress", () => {
  /**
   * Regression tests for a bug found only by sending a real email.
   *
   * The previous code had `env.ts` return a *domain* and the sender prefix it
   * with `notifications@`. But the fallback for an unconfigured domain was
   * `onboarding@resend.dev`, which is already a complete address — so the
   * header went out as `CHIBOY TECHNOLOGIES <notifications@onboarding@resend.dev>`
   * and Resend rejected every send with "Invalid `from` field". The unit tests
   * passed, because none of them involved a real API.
   */
  it("returns a complete address for a configured domain", () => {
    expect(resendFromAddress("chiboytechnologies.com")).toBe(
      "notifications@chiboytechnologies.com",
    );
  });

  it("produces exactly one @ for a configured domain", () => {
    // The precise shape of the original failure.
    const address = resendFromAddress("chiboytechnologies.com");
    expect(address.split("@")).toHaveLength(2);
  });

  it("uses Resend's onboarding address when no domain is configured", () => {
    // Not `notifications@onboarding@resend.dev` — Resend requires this exact
    // address for unverified sending and the local part cannot be changed.
    expect(resendFromAddress(undefined)).toBe(RESEND_ONBOARDING_ADDRESS);
    expect(resendFromAddress("")).toBe(RESEND_ONBOARDING_ADDRESS);
    expect(resendFromAddress("   ")).toBe(RESEND_ONBOARDING_ADDRESS);
    expect(RESEND_ONBOARDING_ADDRESS).toBe("onboarding@resend.dev");
  });

  it("degrades to the onboarding address rather than failing the send", () => {
    // A malformed domain should still notify the business owner, just not from
    // the address they asked for.
    for (const bad of [
      "not a domain",
      "chiboytechnologies.com; subject=hi",
      "user@evil.example.com",
      // Header injection: a CRLF in the middle survives `trim()` but is not in
      // the allowed character class, so it is rejected rather than prefixed.
      "chiboytech.com\r\nBcc: attacker@example.com",
      "-leading-hyphen.com",
      "double..dot.com",
      "<script>",
    ]) {
      expect(resendFromAddress(bad)).toBe(RESEND_ONBOARDING_ADDRESS);
    }
  });

  it("accepts a subdomain and a hyphenated domain", () => {
    expect(resendFromAddress("mail.chiboytechnologies.com")).toBe(
      "notifications@mail.chiboytechnologies.com",
    );
    expect(resendFromAddress("my-tech.co")).toBe("notifications@my-tech.co");
  });

  it("trims surrounding whitespace rather than rejecting a padded value", () => {
    // An env file routinely leaves a trailing newline on a value. Trimming it is
    // the helpful behaviour, and it is safe: the remaining string is still
    // matched against the full pattern, so an embedded CRLF is still rejected.
    expect(resendFromAddress("  chiboytechnologies.com  ")).toBe(
      "notifications@chiboytechnologies.com",
    );
    expect(resendFromAddress("chiboytechnologies.com\n")).toBe(
      "notifications@chiboytechnologies.com",
    );
  });
});

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

describe("resolveSupportEmail", () => {
  it("uses the configured address when there is one", () => {
    expect(resolveSupportEmail("help@chiboytechnologies.com")).toBe(
      "help@chiboytechnologies.com",
    );
  });

  it("falls back to the business support address when unset", () => {
    // The requirement: a reply must never be lost because the variable was not
    // set. Unset, empty and whitespace all resolve to the same address.
    expect(resolveSupportEmail(undefined)).toBe(SUPPORT_EMAIL_ADDRESS);
    expect(resolveSupportEmail("")).toBe(SUPPORT_EMAIL_ADDRESS);
    expect(resolveSupportEmail("   ")).toBe(SUPPORT_EMAIL_ADDRESS);
    expect(SUPPORT_EMAIL_ADDRESS).toBe("support@chiboytechnologies.com");
  });

  it("falls back rather than emitting a malformed address", () => {
    expect(resolveSupportEmail("not an address")).toBe(SUPPORT_EMAIL_ADDRESS);
    expect(resolveSupportEmail("two@@example.com")).toBe(SUPPORT_EMAIL_ADDRESS);
  });

  it("trims padding rather than rejecting a value an env file left a newline on", () => {
    expect(resolveSupportEmail("  support@chiboytechnologies.com\n")).toBe(
      "support@chiboytechnologies.com",
    );
  });
});

describe("resolveFromAddress", () => {
  it("uses EMAIL_FROM verbatim when it is a complete, safe header", () => {
    // The whole reason EMAIL_FROM exists: it is the only input that can carry
    // the display name, so it must not be re-composed from the domain.
    expect(
      resolveFromAddress(
        "Chiboy Technologies <noreply@chiboytechnologies.com>",
        "chiboytechnologies.com",
      ),
    ).toBe("Chiboy Technologies <noreply@chiboytechnologies.com>");
  });

  it("accepts a bare address", () => {
    expect(resolveFromAddress("noreply@chiboytechnologies.com", undefined)).toBe(
      "noreply@chiboytechnologies.com",
    );
  });

  it("rejects header injection rather than passing it through", () => {
    // A CRLF here is the character that turns one header into two. Falling back
    // is the safe direction: the send still happens, from the domain address.
    const injected = "noreply@chiboytechnologies.com\r\nBcc: attacker@example.com";
    expect(resolveFromAddress(injected, "chiboytechnologies.com")).toBe(
      "CHIBOY TECHNOLOGIES <notifications@chiboytechnologies.com>",
    );
    expect(resolveFromAddress("no address here", "chiboytechnologies.com")).toBe(
      "CHIBOY TECHNOLOGIES <notifications@chiboytechnologies.com>",
    );
  });

  it("composes from the domain when EMAIL_FROM is unset", () => {
    expect(resolveFromAddress(undefined, "chiboytechnologies.com")).toBe(
      "CHIBOY TECHNOLOGIES <notifications@chiboytechnologies.com>",
    );
  });

  it("falls back to the onboarding address when neither is usable", () => {
    expect(resolveFromAddress(undefined, undefined)).toBe(
      `CHIBOY TECHNOLOGIES <${RESEND_ONBOARDING_ADDRESS}>`,
    );
  });
});

describe("serviceRequestEmailBody with images", () => {
  const imageUrls = [
    "https://store.public.blob.vercel-storage.com/service-requests/a1.jpg",
    "https://store.public.blob.vercel-storage.com/service-requests/b2.png",
  ];

  it("lists each image URL so the owner can open it", () => {
    const body = serviceRequestEmailBody({ ...request, attachmentCount: 2, imageUrls });

    for (const url of imageUrls) expect(body).toContain(url);
  });

  it("omits the image section entirely when there are none", () => {
    // An orphaned "Images" heading with nothing under it reads as a rendering
    // bug. The "Attachments: none" line already says the same thing.
    const body = serviceRequestEmailBody({ ...request, attachmentCount: 0, imageUrls: [] });
    expect(body).not.toContain("Images\n------");
  });

  it("keeps the plain-text attachment count unchanged", () => {
    // The count line predates the image list and existing inbox filters may rely
    // on it; the URLs are added, not substituted.
    expect(serviceRequestEmailBody({ ...request, attachmentCount: 2, imageUrls })).toContain(
      "Attachments: 2 files",
    );
  });
});

describe("serviceRequestEmailHtml", () => {
  it("makes every image a clickable link", () => {
    const url = "https://store.public.blob.vercel-storage.com/service-requests/a1.jpg";
    const html = serviceRequestEmailHtml({ ...request, attachmentCount: 1, imageUrls: [url] });

    expect(html).toContain(`<a href="${url}">${url}</a>`);
  });

  it("says None rather than leaving an empty list when there are no images", () => {
    expect(serviceRequestEmailHtml({ ...request, attachmentCount: 0 })).toContain("None.");
  });

  it("escapes the description, because it comes from a public form", () => {
    const html = serviceRequestEmailHtml({
      ...request,
      description: '<script>alert("x")</script>',
    });

    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes the name and service too", () => {
    const html = serviceRequestEmailHtml({
      ...request,
      name: "<img src=x onerror=alert(1)>",
      service: "Networking & <b>more</b>",
    });

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&amp;");
  });
});

describe("customer confirmation address and image mention", () => {
  it("shows the support address in the HTML body", () => {
    const html = customerConfirmationEmailHtml(request);

    expect(html).toContain(SUPPORT_EMAIL_ADDRESS);
    // The old hard-coded gmail address must be gone from the template.
    expect(html).not.toContain("chiboytechnologies@gmail.com");
  });

  it("shows the support address in the text body", () => {
    const text = customerConfirmationEmailText(request);

    expect(text).toContain(SUPPORT_EMAIL_ADDRESS);
    expect(text).not.toContain("chiboytechnologies@gmail.com");
  });

  it("uses a configured support address instead of the default", () => {
    const text = customerConfirmationEmailText(request, "help@chiboytechnologies.com");
    expect(text).toContain("help@chiboytechnologies.com");
  });

  it("mentions how many images were received, and only when some were", () => {
    const withOne = customerConfirmationEmailText({ ...request, attachmentCount: 1 });
    const withTwo = customerConfirmationEmailText({ ...request, attachmentCount: 2 });
    const withNone = customerConfirmationEmailText({ ...request, attachmentCount: 0 });

    expect(withOne).toContain("the image you attached");
    expect(withTwo).toContain("the 2 images you attached");
    expect(withNone).not.toContain("you attached");
  });

  it("mentions the images in the HTML body as well", () => {
    const html = customerConfirmationEmailHtml({ ...request, attachmentCount: 2 });
    expect(html).toContain("the 2 images you attached");
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
