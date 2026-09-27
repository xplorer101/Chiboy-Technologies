/**
 * Reading a Server Action's `FormData` safely.
 *
 * WHY THIS EXISTS
 * ---------------
 * `formData.get("phone")` returns `null` when the field was not in the request,
 * not `""`. Zod's `z.string()` rejects `null`, so a request that simply omits an
 * optional field would be rejected as invalid rather than treated as empty — a
 * confusing failure for something the visitor is entitled to leave blank, and
 * one that depends on the client having sent the field at all.
 *
 * The form always sends its text fields, so this only fires for a crafted or
 * truncated request. It still matters: the server has to be the thing that
 * decides, and it has to decide correctly for input the form would not produce.
 *
 * A `File` is passed through as an empty string rather than coerced, because a
 * file arriving where a string belongs is a malformed request, not an empty
 * field, and it should not be silently laundered into something valid.
 */

/** Reads a text field, treating an absent or file-valued entry as empty. */
export function readText(formData: FormData, field: string): string {
  const value = formData.get(field);
  if (typeof value === "string") return value;
  return "";
}
