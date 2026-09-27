import { z } from "zod";

/**
 * Form schemas, shared by the client form and the server action.
 *
 * THE POINT OF ONE SCHEMA
 * -----------------------
 * Client validation is a courtesy; server validation is the gate. When they are
 * two different sets of rules they drift, and the drift is always in the
 * direction that matters: the client accepts something the server rejects, so a
 * visitor fills in a form carefully, presses submit, and is told it is invalid
 * with no way to find out which field. Sharing one schema removes the class of
 * bug entirely.
 *
 * Client-side use is genuinely the same validation, not a copy. Zod runs in the
 * browser because the rules are plain data, not secrets. The one thing the
 * server adds is the *decision*: `safeParse` on the server is the only thing
 * that decides whether a row is written.
 *
 * NOTHING SENSITIVE IS VALIDATED HERE
 * -----------------------------------
 * No schema reads the environment, the database, or a secret. It is pure, so it
 * can be imported by a client component, a server action, and a plain unit test
 * without any of them dragging anything heavy along.
 */

/** Shared, deliberately forgiving. Nigerian numbers vary in punctuation far
 *  more than most validators assume, and a rejected phone number costs a
 *  customer. Rejecting punctuation is not a security control — the string is
 *  never dialled by this site. */
const phoneSchema = z
  .string()
  // Absent is not the same as invalid. `formData.get()` yields `null` for a
  // field that was not in the request, and a required-string check would turn a
  // deliberately optional field into a mandatory one for any request that
  // omitted it. Normalised straight back to an empty string, so the output type
  // stays `string` and every caller has one shape to handle.
  .nullish()
  .transform((value) => (value ?? "").trim().replace(/[\s().-]/g, ""))
  .refine((value) => value === "" || /^\+?[0-9]{7,15}$/.test(value), {
    message: "Enter a phone number of 7 to 15 digits, optionally starting with +",
  });

/**
 * A name is trimmed and collapsed to single spaces.
 *
 * Collapsing matters because `"  Ada   Lovelace "` and `"Ada Lovelace"` are the
 * same person, and storing both produces two rows that no one can distinguish
 * later. A leading or trailing newline is removed for the same reason.
 */
const nameSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, " "))
  .pipe(z.string().min(2, "Please enter your name").max(100, "That name is too long"));

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().min(1, "Please enter your email address").email("Enter a valid email address"));

/**
 * The sentinel for "my problem is not one of the listed services".
 *
 * A value that cannot be a service slug, so it can never collide with a real
 * one. Using an empty string instead would make "not chosen" and "chosen, but
 * not one I recognise" indistinguishable on the server.
 */
export const OTHER_SERVICE = "__other__";

/**
 * A service slug: the same shape as the route segments under `/services`.
 *
 * The form sends a slug rather than the row's `cuid`. That is a deliberate
 * trade: a cuid would mean the page has to read the database to populate the
 * select, which turns a page that could be static into one that is not, and
 * leaves the form unusable at all if the database is briefly unreachable. A slug
 * is already in the URL of the page that links here, so preselecting a service
 * costs nothing. The action resolves it back to a row and treats an unknown
 * slug as unfiled rather than trusting whatever arrived.
 */
const SERVICE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Contact form. */
export const contactMessageSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  /** Optional: a visitor with a query but no phone number should not be blocked. */
  phone: phoneSchema,
  message: z
    .string()
    .trim()
    .min(10, "Please give us a little more detail — at least 10 characters")
    .max(5000, "Please keep this under 5000 characters"),
});

export type ContactMessageInput = z.input<typeof contactMessageSchema>;
export type ContactMessageValues = z.output<typeof contactMessageSchema>;

/** Service request form. */
export const serviceRequestSchema = z
  .object({
    fullName: nameSchema,
    email: emailSchema,
    phone: phoneSchema.refine((value) => value !== "", {
      message: "We need a phone number to call you back about",
    }),
    /**
     * A service slug, or `OTHER_SERVICE`. Empty means "not sure", which is
     * allowed — guessing on a visitor's behalf would file the request under the
     * wrong service and cost them a round of clarification.
     */
    serviceId: z
      .string()
      .trim()
      .max(64)
      .refine(
        (value) => value === "" || value === OTHER_SERVICE || SERVICE_SLUG.test(value),
        { message: "Please choose a service from the list" },
      ),
    /** Required when `serviceId` is `OTHER_SERVICE`. Enforced below. */
    serviceOther: z.string().trim().max(200),
    location: z
      .string()
      .trim()
      .min(2, "Please tell us where the work is needed")
      .max(200, "Please keep the location under 200 characters"),
    contactPref: z.enum(["PHONE", "WHATSAPP", "EMAIL"]),
    description: z
      .string()
      .trim()
      .min(20, "Please describe the problem in at least 20 characters")
      .max(5000, "Please keep this under 5000 characters"),
  })
  .superRefine((values, ctx) => {
    // Only the "other" sentinel obliges a free-text service. "Not sure" does not:
    // an unfiled request is better than one filed under a wrong category.
    if (values.serviceId === OTHER_SERVICE && values.serviceOther.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["serviceOther"],
        message: "Please tell us briefly what the work is",
      });
    }
  });

export type ServiceRequestInput = z.input<typeof serviceRequestSchema>;
export type ServiceRequestValues = z.output<typeof serviceRequestSchema>;

/**
 * The honeypot field name.
 *
 * A real visitor never sees this input: it is hidden from layout, from assistive
 * technology, and from the tab order. Automated submitters fill in every field
 * they find, so a value here is the cheapest possible signal that the submission
 * was not made by a person.
 *
 * The name is a plausible field a bot would try to fill — `website` is the
 * conventional choice — and the value is never logged, never stored, and never
 * reflected.
 */
export const HONEYPOT_FIELD = "website";

/**
 * The server-side honeypot check.
 *
 * Kept out of the Zod schemas on purpose. Putting it in the shared schema would
 * surface "this field must be empty" through the client validator, which both
 * tells a bot what it is looking at and would show a visible error to a real
 * visitor whose browser autofilled the field for some reason. Here it is a
 * silent rejection.
 *
 * Returns true when the submission looks automated.
 */
export function isHoneypotTripped(formData: FormData): boolean {
  const value = formData.get(HONEYPOT_FIELD);
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Flattens a Zod error into `{ field: message }` for the form to display.
 *
 * Only the *first* message per field is kept. A visitor cannot act on "must be
 * at least 20 characters and must not exceed 5000 characters" for a field they
 * have not finished typing yet, and showing the rule rather than the problem is
 * how forms come to feel punitive.
 *
 * `_form` collects issues with no usable field path, which is where a top-level
 * error belongs.
 */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    const key = typeof field === "string" || typeof field === "number" ? String(field) : "_form";
    flattened[key] ??= issue.message;
  }

  return flattened;
}
