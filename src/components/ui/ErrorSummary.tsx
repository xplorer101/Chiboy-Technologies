"use client";

import { useEffect, useRef } from "react";
import { TriangleAlert } from "lucide-react";

/**
 * Form-level error summary.
 *
 * In its own client module rather than alongside `Alert`, because it has to
 * move focus and `Alert` is imported by server components. A hook in that file
 * would either have forced the whole module across the client boundary or been
 * silently non-functional.
 *
 * WHY IT TAKES FOCUS
 * ------------------
 * After pressing submit, focus is still sitting on the button. Nothing has been
 * announced and nothing has scrolled into view, so the failure is only visible
 * to someone already looking at the area. Moving focus here means the outcome is
 * read out and scrolled to, whether the failure came from the browser's own
 * validation or from the server.
 *
 * `role="alert"` announces it independently of the focus move, so a screen
 * reader that does not follow focus still gets the message. `tabIndex={-1}`
 * makes the element programmatically focusable without putting it in the tab
 * order — it is a destination, not somewhere to Tab to.
 */
export function FormErrorSummary({
  errors,
  labels,
  heading = "Please check the following",
}: {
  /** Field name -> message. Rendered as a linked list of the failed fields. */
  errors: Record<string, string>;
  /**
   * Field name -> the label the visitor actually sees, so the list reads
   * "Your name: …" rather than "fullName: …". Anything unmapped falls back to
   * the field name, which is worse but never wrong.
   */
  labels?: Record<string, string>;
  heading?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Re-focus whenever the set of failures changes, so a second failed attempt
  // is announced again even though the component never unmounted.
  useEffect(() => {
    if (Object.keys(errors).length > 0) ref.current?.focus();
  }, [errors]);

  const entries = Object.entries(errors);
  if (entries.length === 0) return null;

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-lg border border-danger-600/30 bg-danger-50 p-4 text-danger-600"
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        {heading}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
        {entries.map(([field, message]) => (
          <li key={field}>
            <a href={`#${field}`} className="underline underline-offset-2 hover:no-underline">
              <span className="font-medium">{labels?.[field] ?? field}</span>: {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
