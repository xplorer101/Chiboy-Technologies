/**
 * Notification content for a new service request.
 *
 * PURE ON PURPOSE
 * ---------------
 * Nothing here sends anything, reads the environment or touches the database.
 * That makes the part of the notification most likely to be wrong — the
 * formatting of text a stranger typed, and the assembly of the From address —
 * testable without a network, and it means the two channels cannot drift into
 * describing a request differently.
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

/**
 * Resend's onboarding address.
 *
 * THE ONLY ADDRESS THAT WORKS WITHOUT A VERIFIED DOMAIN, and it is not
 * configurable: Resend requires this exact address for unverified sending, so
 * the local part cannot be changed to `notifications@` or anything else. It
 * delivers only to the address on the Resend account, which is sufficient here
 * because these notifications go to the business owner.
 */
export const RESEND_ONBOARDING_ADDRESS = "onboarding@resend.dev";

/** A domain is letters, digits, dots and hyphens, and nothing else. */
const DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

/**
 * Builds the `From` address.
 *
 * Returns a COMPLETE email address, never a bare domain. The earlier version
 * returned a domain and let the caller prefix it, which meant the onboarding
 * fallback — itself already a full address — came out as
 * `notifications@onboarding@resend.dev`, and Resend rejected every send with an
 * invalid-`from` error. Composing the address in one place is what prevents that
 * class of mistake: there is no second step that can disagree about which form
 * the value is in.
 *
 * An absent or implausible domain falls back to the onboarding address rather
 * than failing the send. A wrong `RESEND_FROM_DOMAIN` should degrade to
 * "delivered to the account owner" — which still notifies the business — not to
 * "no notification at all".
 */
export function resendFromAddress(configuredDomain: string | undefined): string {
  const domain = configuredDomain?.trim();

  if (!domain || !DOMAIN_PATTERN.test(domain)) {
    return RESEND_ONBOARDING_ADDRESS;
  }

  return `notifications@${domain}`;
}

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
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

/**
 * Escapes HTML special characters to prevent injection.
 * Every value interpolated into the HTML template comes from a public form,
 * so this is mandatory — not optional.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Customer confirmation email — branded HTML.
 *
 * Uses inline CSS only (no external stylesheets) for maximum email client compatibility.
 * Colours match the site palette: Deep Navy (#1B3A6B), Rich Gold (#C8A951), White.
 * All user-supplied values are HTML-escaped before interpolation.
 */
export function customerConfirmationEmailHtml(request: NewServiceRequest): string {
  const safeName = escapeHtml(request.name);
  const safeReference = escapeHtml(request.reference);
  const safeService = escapeHtml(request.service);
  const safeLocation = escapeHtml(request.location);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Request Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1B3A6B; background-color: #F5F5F5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
    <!-- Header -->
    <tr>
      <td style="background-color: #1B3A6B; padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">CHIBOY TECHNOLOGIES</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: #C8A951; font-weight: 500;">Service Request Confirmation</p>
      </td>
    </tr>

    <!-- Gold accent bar -->
    <tr>
      <td style="background-color: #C8A951; height: 4px;"></td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px 32px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: #1B3A6B;">Dear <strong>${safeName}</strong>,</p>

        <p style="margin: 0 0 24px; font-size: 16px; color: #1B3A6B;">Thank you for contacting CHIBOY TECHNOLOGIES. We have received your service request and will review it shortly.</p>

        <!-- Details card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #E0E0E0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
          <tr>
            <td style="background-color: #1B3A6B; padding: 16px 20px;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #FFFFFF;">Request Details</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; background-color: #FAFAFA;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px; color: #1B3A6B;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #4A4A4A; width: 30%;">Reference:</td>
                  <td style="padding: 8px 0; font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace; font-size: 14px; color: #1B3A6B;">${safeReference}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #4A4A4A;">Service:</td>
                  <td style="padding: 8px 0;">${safeService}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #4A4A4A;">Location:</td>
                  <td style="padding: 8px 0;">${safeLocation}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 16px; font-size: 16px; color: #1B3A6B;">Our team will review your request and contact you within one business day using your preferred method.</p>

        <p style="margin: 0 0 24px; font-size: 16px; color: #1B3A6B;">If you need to add any information before we reach out, please reply to this email or contact us directly:</p>

        <!-- Contact info -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td style="padding: 12px 16px; background-color: #F8F8F8; border-radius: 6px; border: 1px solid #E8E8E8;">
              <p style="margin: 0; font-size: 14px; color: #1B3A6B;"><strong>Phone/WhatsApp:</strong> +234 810 285 4969</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #1B3A6B;"><strong>Email:</strong> chiboytechnologies@gmail.com</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #1B3A6B;"><strong>Address:</strong> Suite 12, City Shoppers Plaza, Kuje, FCT Abuja</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #1B3A6B;"><strong>Hours:</strong> Monday–Friday, 8:00 AM – 6:00 PM</p>
            </td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 24px 0;">

        <p style="margin: 0; font-size: 13px; color: #6B6B6B;">This is an automated confirmation. Please do not reply to this address for support — use the contact details above.</p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #1B3A6B; padding: 24px 32px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #C8A951; font-weight: 500;">CHIBOY TECHNOLOGIES</p>
        <p style="margin: 0; font-size: 12px; color: #999;">Suite 12, City Shoppers Plaza, Kuje, FCT Abuja</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Plain-text fallback for the customer confirmation email.
 * Used as the `text` part in the multipart email.
 */
export function customerConfirmationEmailText(request: NewServiceRequest): string {
  const lines = [
    "CHIBOY TECHNOLOGIES — Service Request Confirmation",
    "",
    `Dear ${toSingleLine(request.name)},`,
    "",
    "Thank you for contacting CHIBOY TECHNOLOGIES. We have received your service request and will review it shortly.",
    "",
    "Request Details",
    "---------------",
    `Reference:  ${request.reference}`,
    `Service:    ${toSingleLine(request.service)}`,
    `Location:   ${toSingleLine(request.location)}`,
    "",
    "Our team will review your request and contact you within one business day using your preferred method.",
    "",
    "If you need to add any information before we reach out, please contact us directly:",
    "",
    "Phone/WhatsApp: +234 810 285 4969",
    "Email: chiboytechnologies@gmail.com",
    "Address: Suite 12, City Shoppers Plaza, Kuje, FCT Abuja",
    "Hours: Monday–Friday, 8:00 AM – 6:00 PM",
    "",
    "---",
    "This is an automated confirmation. Please do not reply to this address for support — use the contact details above.",
    "",
    "CHIBOY TECHNOLOGIES",
    "Suite 12, City Shoppers Plaza, Kuje, FCT Abuja",
  ];
  return lines.join("\n");
}

/**
 * Subject line for the customer confirmation email.
 */
export function customerConfirmationEmailSubject(reference: string): string {
  return `Your Service Request Confirmation — ${toSingleLine(reference)}`;
}
