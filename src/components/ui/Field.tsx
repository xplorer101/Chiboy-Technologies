import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { TriangleAlert } from "lucide-react";

/**
 * Form field primitives.
 *
 * Every control is wrapped in a labelled field component rather than written
 * inline per form, so that label association, hint text, error text and the
 * `aria-invalid` / `aria-describedby` wiring are implemented once and applied
 * consistently to both public forms.
 */

const controlClasses =
  "w-full rounded-lg border bg-white px-4 py-3 text-[0.9375rem] text-charcoal-900 " +
  "placeholder:text-charcoal-500 transition-colors " +
  "focus:border-navy-600 disabled:bg-charcoal-50 disabled:text-charcoal-500";

function controlClass(invalid: boolean): string {
  return cn(
    controlClasses,
    invalid
      ? "border-danger-600 focus:border-danger-600"
      : "border-charcoal-300 hover:border-charcoal-400",
  );
}

type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  className?: string;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-navy-900">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-1 text-danger-600">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-charcoal-500">(optional)</span>
        )}
      </label>

      {hint ? (
        <p id={hintId} className="text-xs text-charcoal-500">
          {hint}
        </p>
      ) : null}

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-sm font-medium text-danger-600"
        >
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  id,
  label,
  type = "text",
  hint,
  error,
  required,
  className,
  ...props
}: {
  id: string;
  label: string;
  type?: "text" | "email" | "tel";
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  className?: string;
} & Omit<React.ComponentProps<"input">, "id" | "type" | "className">) {
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {({ id: fieldId, describedBy, invalid }) => (
        <input
          id={fieldId}
          type={type}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={controlClass(invalid)}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  required,
  className,
  rows = 5,
  ...props
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  className?: string;
  rows?: number;
} & Omit<React.ComponentProps<"textarea">, "id" | "className" | "rows">) {
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {({ id: fieldId, describedBy, invalid }) => (
        <textarea
          id={fieldId}
          rows={rows}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(controlClass(invalid), "resize-y")}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  required,
  className,
  options,
  placeholder,
  ...props
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  className?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
} & Omit<React.ComponentProps<"select">, "id" | "className" | "children">) {
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {({ id: fieldId, describedBy, invalid }) => (
        <select
          id={fieldId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(controlClass(invalid), "appearance-none bg-[length:1.1rem] pr-10")}
          style={{
            // Inline chevron avoids shipping a background image request.
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23555' %3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd' %3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.75rem center",
          }}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

/**
 * Renders a business value that has not been supplied yet. Showing an explicit
 * marker is deliberate: a silently empty field would look like an oversight,
 * and an invented value would be worse.
 *
 * Accessibility labelling is the caller's responsibility — surrounding markup
 * supplies it (for example the footer's `sr-only` "Phone: " prefix).
 */
export function PlaceholderValue({
  value,
  isPlaceholder,
  className,
}: {
  value: string;
  isPlaceholder: boolean;
  className?: string;
}) {
  if (isPlaceholder) {
    return (
      <span className={cn("break-anywhere text-charcoal-500 italic", className)}>
        {value}
      </span>
    );
  }

  return <span className={cn("break-anywhere", className)}>{value}</span>;
}
