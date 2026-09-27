/**
 * Notification content for a new service request.
 *
 * PURE ON PURPOSE
 * ---------------
 * Nothing here sends anything, reads the environment or touches the database.
 * That makes the part of the notification most likely to be wrong — the
 * formatting of text a stranger typed — testable without a network, and it
 * means the two channels cannot drift into describing a request differently.
 *
 * WHY PLAIN TEXT
 * --------------
 * Both notifications are plain text, and the email is plain text even though
 * HTML would look better.
 *
 * Every value interpolated here came from a public form. In an HTML email that
 * is an injection surface: a description containing markup has to be escaped, or
 * filtered, or sanitised, and forgetting is silent. There is no markup to
 * escape in a plain-text body, so the whole class of problem does not exist.
 * A notification inbox is also somewhere a plain, readable, copy-pasteable
 * summary is the right shape — nobody needs a styled template to act on it.
 */

/** The subset of a stored request a notification needs. */
export type NewServiceRequest = {
  /** Human-quotable id, e.g. `SR-20260927-A1B2C`. */
  reference: string;
  name: string;
  phone: string;
  email: string;
  /** The service's display name, already resolved to something readable. */
  service: string;
  location: string;
  /** "Phone call", "WhatsApp" or "Email". */
  contactPreference: string;
  description: string;
  /** How many files were stored with the request. */
  attachmentCount: number;
};

const CONTACT_PREFERENCE_LABELS: Record<string, string> = {
  PHONE: "Phone call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

/** The form stores an enum; the notification reads as English. */
export function contactPreferenceLabel(value: string): string {
  return CONTACT_PREFERENCE_LABELS[value] ?? value;
}

/**
 * Collapses a visitor's text to a single block.
 *
 * Multi-line input is normal in a description, but it wrecks an email body and a
 * chat message: blank lines push the useful parts off screen, and a pasted
 * paragraph break mid-summary makes it unreadable. Newlines become spaces.
 *
 * Also collapses control characters, so a description cannot inject a terminal
 * escape sequence into whatever the owner opens the message in.
 */
export function toSingleLine(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Truncates to `max` characters, measured in code points.
 *
 * Measured in code points rather than UTF-16 units because a naive `.slice()`
 * cuts a surrogate pair in half, leaving a lone replacement character at the end
 * of the message — a visible artefact in exactly the situation where someone is
 * skimming a WhatsApp notification.
 */
export function truncate(value: string, max: number): string {
  const characters = [...value];
  if (characters.length <= max) return value;
  return `${characters.slice(0, max - 1).join("").trimEnd()}…`;
}

/** Subject line. Fixed prefix so an inbox filter can match on it. */
export function serviceRequestEmailSubject(service: string): string {
  return `New Service Request: ${toSingleLine(service)}`;
}

/**
 * The email body.
 *
 * Fixed-width labels so the fields line up when read as plain text, which is
 * most of the value of a plain-text notification. The first line is a one-line
 * restatement, because many inboxes show a preview and the owner should be able
 * to tell what it is without opening it.
 */
export function serviceRequestEmailBody(request: NewServiceRequest): string {
  const lines = [
    `New service request received from the website.`,
    ``,
    `Reference:  ${request.reference}`,
    `Name:       ${toSingleLine(request.name)}`,
    `Phone:      ${toSingleLine(request.phone)}`,
    `Email:      ${toSingleLine(request.email)}`,
    `Service:    ${toSingleLine(request.service)}`,
    `Location:   ${toSingleLine(request.location)}`,
    `Prefers:    ${toSingleLine(contactPreferenceLabel(request.contactPreference))}`,
    `Attachments: ${describeAttachments(request.attachmentCount)}`,
    ``,
    `Message`,
    `-------`,
    request.description.trim(),
    ``,
    `---`,
    `Sent from the website's service request form.`,
  ];

  return lines.join("\n");
}

/**
 * The WhatsApp summary.
 *
 * Much shorter than the email, and truncated, for two reasons. WhatsApp is a
 * chat client, so a wall of text is hard to read on a phone at a glance; and the
 * detail is already in the database, so repeating all of it is redundant. What
 * the owner needs from a notification is enough to decide whether to open the
 * record and call back.
 */
export function serviceRequestWhatsAppText(request: NewServiceRequest): string {
  const description = truncate(toSingleLine(request.description), 300);

  return [
    `New service request — ${request.reference}`,
    ``,
    `Name: ${toSingleLine(request.name)}`,
    `Phone: ${toSingleLine(request.phone)}`,
    `Email: ${toSingleLine(request.email)}`,
    `Service: ${toSingleLine(request.service)}`,
    `Location: ${toSingleLine(request.location)}`,
    `Prefers: ${contactPreferenceLabel(request.contactPreference)}`,
    `Attachments: ${describeAttachments(request.attachmentCount)}`,
    ``,
    description,
  ].join("\n");
}

function describeAttachments(count: number): string {
  if (count <= 0) return "none";
  return count === 1 ? "1 file" : `${count} files`;
}
