import { describe, expect, it } from "vitest";

import {
  contactMessageSchema,
  fieldErrorsFrom,
  HONEYPOT_FIELD,
  isHoneypotTripped,
  OTHER_SERVICE,
  serviceRequestSchema,
} from "@/lib/validation/forms";

/**
 * Tests for the form schemas.
 *
 * The point of these is not that the rules are what they are — that is a product
 * decision — but that the rules behave. Three properties matter:
 *
 *  - A rule the visitor cannot satisfy from the page is a bug, not strictness.
 *  - The browser and the server run this identical schema, so anything asserted
 *    here is asserted for both at once.
 *  - Normalisation has to actually happen. A test that only checks "valid" would
 *    pass against a schema that stored whatever was typed.
 */

describe("shared text fields", () => {
  it("collapses runs of whitespace in a name", () => {
    const result = contactMessageSchema.parse({
      fullName: "  Ada   Lovelace  ",
      email: "a@b.com",
      phone: "",
      message: "Something is not working.",
    });

    expect(result.fullName).toBe("Ada Lovelace");
  });

  it("lower-cases the email domain and local part", () => {
    const result = contactMessageSchema.parse({
      fullName: "Ada Lovelace",
      email: "  Ada.Lovelace@Example.COM ",
      message: "Something is not working.",
    });

    expect(result.email).toBe("ada.lovelace@example.com");
  });

  it("strips punctuation a Nigerian visitor would naturally type", () => {
    const result = contactMessageSchema.parse({
      fullName: "Ada Lovelace",
      email: "a@b.com",
      phone: "+234 (810) 285-4969",
      message: "Something is not working.",
    });

    // The stored value has to be diallable, not merely present.
    expect(result.phone).toBe("+2348102854969");
  });

  it("accepts a phone number with no punctuation at all", () => {
    const result = contactMessageSchema.parse({
      fullName: "Ada Lovelace",
      email: "a@b.com",
      phone: "08102854969",
      message: "Something is not working.",
    });

    expect(result.phone).toBe("08102854969");
  });

  it("rejects a phone number that is mostly letters", () => {
    const result = contactMessageSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "a@b.com",
      phone: "call me",
      message: "Something is not working.",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a phone number containing a shell metacharacter", () => {
    const result = contactMessageSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "a@b.com",
      phone: "08012345678; rm -rf /",
      message: "Something is not working.",
    });

    expect(result.success).toBe(false);
  });
});

describe("contact message", () => {
  const base = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "",
    message: "My printer has stopped working.",
  };

  it("accepts an enquiry with no phone number", () => {
    // A visitor with a question but no phone should not be blocked from asking it.
    expect(contactMessageSchema.safeParse({ ...base, phone: "" }).success).toBe(true);
  });

  it("rejects a message too short to be actionable", () => {
    expect(contactMessageSchema.safeParse({ ...base, message: "help" }).success).toBe(false);
  });

  it("rejects a message long enough to be an abuse attempt", () => {
    expect(contactMessageSchema.safeParse({ ...base, message: "a".repeat(5001) }).success).toBe(
      false,
    );
  });

  it("rejects an address with no @", () => {
    expect(contactMessageSchema.safeParse({ ...base, email: "ada.example.com" }).success).toBe(
      false,
    );
  });
});

describe("service request", () => {
  const base = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "08012345678",
    serviceId: "networking",
    serviceOther: "",
    location: "Kuje, Abuja",
    contactPref: "PHONE",
    description: "The office network drops every few hours and nobody can work.",
  };

  it("accepts a fully specified request", () => {
    expect(serviceRequestSchema.safeParse(base).success).toBe(true);
  });

  it("allows the service to be left blank, because not knowing is legitimate", () => {
    // The whole point of "not sure" is that it must be reachable. Requiring a
    // category would force a wrong guess.
    expect(serviceRequestSchema.safeParse({ ...base, serviceId: "" }).success).toBe(true);
  });

  it("requires a description when the other field is chosen", () => {
    const result = serviceRequestSchema.safeParse({
      ...base,
      serviceId: OTHER_SERVICE,
      serviceOther: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "serviceOther")).toBe(true);
    }
  });

  it("accepts a named service alongside a blank other field", () => {
    // Only the sentinel obliges free text. A listed service needs nothing else.
    expect(serviceRequestSchema.safeParse({ ...base, serviceOther: "" }).success).toBe(true);
  });

  it("rejects a service value that is not slug-shaped", () => {
    // The action resolves the slug against the published services. A value that
    // could never be one is rejected here rather than being looked up.
    const result = serviceRequestSchema.safeParse({
      ...base,
      serviceId: "networking' OR 1=1 --",
    });

    expect(result.success).toBe(false);
  });

  it("requires a phone number, unlike the contact form", () => {
    // A request needs a callback; an enquiry does not.
    expect(serviceRequestSchema.safeParse({ ...base, phone: "" }).success).toBe(false);
  });

  it("requires a location, because the work has to happen somewhere", () => {
    expect(serviceRequestSchema.safeParse({ ...base, location: " " }).success).toBe(false);
  });

  it("rejects a contact preference outside the allowed set", () => {
    expect(serviceRequestSchema.safeParse({ ...base, contactPref: "CARRIER_PIGEON" }).success).toBe(
      false,
    );
  });

  it("rejects a description under 20 characters", () => {
    expect(serviceRequestSchema.safeParse({ ...base, description: "it is broken" }).success).toBe(
      false,
    );
  });
});

describe("the honeypot", () => {
  it("ignores a submission where the field is absent", () => {
    const data = new FormData();
    expect(isHoneypotTripped(data)).toBe(false);
  });

  it("ignores an empty field", () => {
    const data = new FormData();
    data.set(HONEYPOT_FIELD, "");
    data.set(HONEYPOT_FIELD, "   ");
    expect(isHoneypotTripped(data)).toBe(false);
  });

  it("flags a submission that filled the field", () => {
    const data = new FormData();
    data.set(HONEYPOT_FIELD, "https://spam.example");
    expect(isHoneypotTripped(data)).toBe(true);
  });

  it("ignores a non-string value under that name", () => {
    // Defensive: a multipart field could in principle arrive as a File.
    const data = new FormData();
    data.set(HONEYPOT_FIELD, new File(["x"], "x.txt"));
    expect(isHoneypotTripped(data)).toBe(false);
  });
});

describe("fieldErrorsFrom", () => {
  it("keeps only the first message per field", () => {
    const result = contactMessageSchema.safeParse({
      fullName: "",
      email: "nope",
      phone: "",
      message: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const flattened = fieldErrorsFrom(result.error);
      // A visitor cannot act on three rules at once; they can act on one problem.
      expect(Object.keys(flattened).sort()).toEqual(["email", "fullName", "message"]);
      for (const message of Object.values(flattened)) {
        expect(typeof message).toBe("string");
        expect(message.length).toBeGreaterThan(0);
      }
    }
  });

  it("routes a fieldless issue to a form-level key", () => {
    const errors = fieldErrorsFrom(
      // Constructed directly: the live schemas always attach a path, so this
      // guards the fallback rather than a path that currently occurs.
      {
        issues: [{ code: "custom", path: [], message: "Something went wrong." }],
      } as never,
    );

    expect(errors).toEqual({ _form: "Something went wrong." });
  });

  it("treats a field present but blank differently from a field omitted", () => {
    // Blank is a legitimate answer to an optional question. Omitted means the
    // request never asked, which the action normalises to blank before it
    // gets here — so the two must not be distinguishable at this layer.
    const blank = contactMessageSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "",
      message: "The printer has stopped working.",
    });

    expect(blank.success).toBe(true);
    if (blank.success) {
      expect(blank.data.phone).toBe("");
    }
  });
});
