/**
 * Turning validated form state into the payload a Server Action receives.
 *
 * WHY NOT `new FormData(formElement)`
 * -----------------------------------
 * Because it would throw away the validated values. The form is checked in the
 * browser with the same Zod schema the server uses, and that schema normalises
 * as it checks: an email is lower-cased, a name has its internal runs of
 * whitespace collapsed, a phone number has its punctuation stripped. Reading
 * straight from the DOM would discard every one of those transformations and
 * post the raw keystrokes instead, so the browser and the server would be
 * storing different strings for the same submission.
 *
 * So the values come from the validator, and only the two things the validator
 * has no business holding — files and the honeypot — are read from the DOM.
 */

/** Anything a validated form can legitimately produce. */
export type FormValues = Record<string, unknown>;

/**
 * The honeypot input, structurally rather than as an `HTMLInputElement`.
 *
 * Only `name` and `value` are read, so the type says exactly that. It also makes
 * the function testable without a DOM — a unit test can pass the two fields the
 * function actually depends on instead of standing up a document.
 */
export type HoneypotInput = { name: string; value: string };

export function buildFormData(options: {
  /** Validated values. Non-strings are stringified; null and undefined are dropped. */
  values: FormValues;
  /** Raw file input, read from the DOM because the validator never holds a File. */
  files?: FileList | null | undefined;
  /** The honeypot input, read from the DOM for the same reason. */
  honeypot?: HoneypotInput | null | undefined;
}): FormData {
  const { values, files, honeypot } = options;
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      // `set`, not `append`: a field name appearing twice in a form is a bug
      // here, and `set` means the last write wins rather than the action
      // silently reading whichever entry the runtime happened to return first.
      data.set(key, value);
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      data.set(key, String(value));
    }
  }

  if (files && files.length > 0) {
    for (const file of Array.from(files)) {
      // Named `attachments` to match what the action reads.
      data.append("attachments", file, file.name);
    }
  }

  if (honeypot) {
    data.set(honeypot.name, honeypot.value);
  }

  return data;
}
