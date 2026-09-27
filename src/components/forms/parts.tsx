"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Paperclip, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { HONEYPOT_FIELD } from "@/lib/validation/forms";

/**
 * Parts shared by the two public forms.
 *
 * The success and failure messaging, the honeypot, and the file picker live here
 * rather than in either form, because the two forms must behave identically in
 * the ways a visitor notices. If each had its own version, "was the message
 * announced to a screen reader?" becomes a question about the specific page
 * rather than about the form pattern.
 */

/**
 * The honeypot.
 *
 * Hidden three ways, and all three are needed. `sr-only`-style clipping leaves
 * the input technically visible to assistive technology, so it is also
 * `aria-hidden`; leaving it in the tab order would have a keyboard user
 * mysteriously land on an invisible field, so it is `tabIndex={-1}`; and
 * `autoComplete="off"` stops a browser helpfully filling in a field the visitor
 * was never shown.
 *
 * It is off-screen rather than `display: none` or `type="hidden"`, because a
 * surprising number of automated submitters skip those — they are looking for
 * something a person could see. Positioned content is still in the DOM, still
 * has a label, and is still something a script will find and fill in.
 */
export function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
    >
      <label htmlFor={HONEYPOT_FIELD}>Website</label>
      <input
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}

/**
 * The result of a submission, announced and focused.
 *
 * Focusing is the part that is easy to leave out and matters most: after
 * pressing submit, a screen-reader user's focus is still on the button and
 * nothing has told them anything happened. Moving focus to the outcome means the
 * result is read out whether it is success or failure.
 *
 * `role="status"` (rather than `alert`) on the success variant, because success
 * is not an interruption — it is a confirmation. The error variant keeps
 * `role="alert"`, which interrupts, because a failed submission that is only
 * noticed visually is a form the visitor believes was accepted.
 */
export function ResultRegion({
  status,
  message,
  reference,
  hidden,
  children,
}: {
  status: "idle" | "pending" | "success" | "error";
  message?: string | undefined;
  /** A service request reference, shown alongside the success message. */
  reference?: string | undefined;
  /**
   * Suppresses rendering.
   *
   * Used when a fuller message is already on screen — a field-level error
   * summary lists the same failures, and showing both means saying the same
   * thing twice. Nothing is lost: that summary moves focus to itself.
   */
  hidden?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "success" || status === "error") {
      ref.current?.focus();
    }
  }, [status, message]);

  if (status === "idle" || status === "pending" || !message || hidden) return null;

  const isSuccess = status === "success";

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className={cn(
        "rounded-lg border p-4 text-sm",
        isSuccess
          ? "border-success-600/30 bg-success-50 text-success-600"
          : "border-danger-600/30 bg-danger-50 text-danger-600",
      )}
    >
      <p className="font-semibold">{message}</p>
      {isSuccess && reference ? (
        <p className="mt-2">
          Your reference is{" "}
          <strong className="font-mono tracking-tight">{reference}</strong>. Please keep it for
          any follow-up.
        </p>
      ) : null}
      {children}
    </div>
  );
}

type SelectedFile = { name: string; size: number };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The attachment picker.
 *
 * Uncontrolled on purpose. A `File` in React state is a reference to a blob the
 * browser may revoke, it is awkward to serialise, and it buys nothing — the
 * browser already holds the selection on the input element, and the action reads
 * it from there. The list below is local state purely so the visitor can see and
 * undo what they picked.
 *
 * The `ref` exists for the one thing local state cannot do by itself. When a
 * submission succeeds the form clears itself, and the input has to be cleared
 * to match — otherwise a second submission quietly re-sends the same three
 * files, and the visitor never chose to send them twice. Clearing the DOM value
 * from outside is not enough, because the visible list is React state, so the
 * reset is exposed as an imperative handle and does both.
 *
 * The checks here are a courtesy, not a control. They are duplicated on the
 * server against the file's actual bytes, and this component has no way to know
 * what those bytes are.
 */
export type FileInputHandle = {
  /** Clears the selection and the visible list. */
  reset: () => void;
  /** The live selection, for the submit handler to read. */
  getFiles: () => FileList | null;
};

export function FileInputField({
  id,
  label,
  hint,
  error,
  maxFiles,
  maxMb,
  accept,
  required,
  ref,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  maxFiles: number;
  maxMb: number;
  accept: string;
  required?: boolean;
  ref?: Ref<FileInputHandle>;
}) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error || localError ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const invalid = Boolean(error || localError);

  const clear = useCallback(() => {
    setFiles([]);
    setLocalError(undefined);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  useImperativeHandle(
    ref,
    () => ({ reset: clear, getFiles: () => inputRef.current?.files ?? null }),
    [clear],
  );

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-navy-900">
        {label}
        {!required ? <span className="ml-1.5 font-normal text-charcoal-500">(optional)</span> : null}
      </label>

      {hint ? (
        <p id={hintId} className="text-sm text-charcoal-600">
          {hint}
        </p>
      ) : null}

      <input
        ref={inputRef}
        id={id}
        name={id}
        type="file"
        multiple={maxFiles > 1}
        accept={accept}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          setLocalError(undefined);

          if (selected.length > maxFiles) {
            setFiles(selected.slice(0, maxFiles));
            setLocalError(`Please attach no more than ${maxFiles} files.`);
            return;
          }

          const oversized = selected.find((file) => file.size > maxMb * 1024 * 1024);
          if (oversized) {
            setLocalError(`"${oversized.name}" is larger than ${maxMb} MB.`);
            return;
          }

          setFiles(selected.map((file) => ({ name: file.name, size: file.size })));
        }}
        className={cn(
          "block w-full cursor-pointer rounded-lg border bg-white text-sm text-charcoal-900",
          "file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-navy-50",
          "file:px-4 file:py-3 file:text-sm file:font-semibold file:text-navy-900",
          "transition-colors",
          invalid ? "border-danger-600" : "border-charcoal-300 hover:border-charcoal-400",
        )}
      />

      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((file) => (
            <li
              key={file.name}
              className="flex items-center justify-between gap-3 rounded-lg bg-charcoal-50 px-3 py-2 text-sm text-charcoal-800"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Paperclip className="size-4 shrink-0 text-charcoal-500" aria-hidden="true" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-charcoal-500">{formatBytes(file.size)}</span>
              </span>
              <button
                type="button"
                onClick={clear}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-charcoal-600 hover:bg-charcoal-100 hover:text-charcoal-900"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Remove all attachments</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error || localError ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger-600">
          {error ?? localError}
        </p>
      ) : null}
    </div>
  );
}

/** A labelled group of related fields, for the two-column field grids. */
export function FieldGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <div className={cn("grid gap-5", columns === 2 ? "sm:grid-cols-2" : undefined)}>{children}</div>
  );
}

/**
 * A radio group for a short list of options.
 *
 * `registration` is React Hook Form's return value for the field name, spread
 * onto every radio. That is the documented way to wire a radio group, and the
 * reason it works is that only the checked input contributes a value to the
 * form. A hidden twin input would also "work" — the browser would send the
 * radio's value first — but it is a second source of truth for one field, and
 * the two silently disagree the moment the default changes.
 */
export function RadioGroup({
  name,
  legend,
  hint,
  error,
  options,
  columns = 3,
  registration,
}: {
  name: string;
  legend: string;
  hint?: string;
  error?: string | undefined;
  options: ReadonlyArray<{ value: string; label: string }>;
  columns?: 1 | 2 | 3;
  registration?: UseFormRegisterReturn;
}) {
  const generatedId = useId();
  const hintId = hint ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset
      aria-describedby={describedBy}
      className="space-y-2"
    >
      <legend className="text-sm font-semibold text-navy-900">{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-sm text-charcoal-600">
          {hint}
        </p>
      ) : null}

      <div
        className={cn(
          "grid gap-2",
          columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : undefined,
        )}
      >
        {options.map((option) => {
          const id = `${generatedId}-${option.value}`;
          return (
            <div key={option.value} className="relative">
              <input
                id={id}
                name={name}
                type="radio"
                value={option.value}
                className="peer sr-only"
                {...registration}
              />
              <label
                htmlFor={id}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 py-2",
                  "text-center text-sm font-medium text-charcoal-800 transition-colors",
                  "hover:border-navy-300 hover:bg-navy-50",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy-600",
                  "peer-checked:border-navy-700 peer-checked:bg-navy-50 peer-checked:text-navy-900",
                )}
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>

      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger-600">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
