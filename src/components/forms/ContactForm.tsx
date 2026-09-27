"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { submitContactMessage } from "@/lib/actions/contact";
import { Button } from "@/components/ui/Button";
import { FormErrorSummary } from "@/components/ui/ErrorSummary";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { FieldGrid, HoneypotField, ResultRegion } from "@/components/forms/parts";
import { buildFormData } from "@/lib/utils/form-data";
import {
  contactMessageSchema,
  HONEYPOT_FIELD,
  type ContactMessageInput,
  type ContactMessageValues,
} from "@/lib/validation/forms";

/**
 * The contact form.
 *
 * WHY THE VALIDATION RUNS TWICE
 * -----------------------------
 * The same Zod schema is the resolver here and the gate in the server action.
 * That is not redundancy — the browser run is there to point at the field that
 * needs attention, and the server run is there to be the authority. The browser
 * one is trivially bypassed by anyone who bothers, so the server one is what
 * actually decides whether a row is written.
 *
 * WHY THE FIELDS ARE NOT RESET ON ERROR
 * --------------------------------------
 * A visitor who has written four paragraphs of description and mistyped their
 * email has not made that text disposable. Resetting on failure is the commonest
 * way a form loses someone's work, so the values are left exactly where they
 * were and only the message changes.
 *
 * WHY JAVASCRIPT IS REQUIRED
 * --------------------------
 * A form that posts through a Server Action needs the client runtime to handle
 * the response. This one is not usable with scripting disabled, which is a real
 * limitation, and the reason the page carries the phone, WhatsApp and email links
 * as first-class content rather than as a footnote — a visitor with JavaScript
 * off is not left without a way to reach the business. See the README.
 *
 * WHY THERE IS ONE ERROR MESSAGE, NOT TWO
 * ---------------------------------------
 * A failed submission that has field errors shows the error summary alone, which
 * both explains what is wrong and links to each field. Adding the server's
 * general "please check the highlighted fields" on top would be the same message
 * twice. A failure with no field errors — rate limited, database unreachable —
 * has nothing to point at, so it shows the message on its own.
 */

const EMPTY: ContactMessageInput = {
  fullName: "",
  email: "",
  phone: "",
  message: "",
};

/** Field names are an implementation detail; the summary speaks to the visitor. */
const FIELD_LABELS: Record<string, string> = {
  fullName: "Your name",
  email: "Email address",
  phone: "Phone number",
  message: "Message",
  _form: "This form",
};

type Result =
  | { status: "idle" | "pending" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors: Record<string, string> | undefined };

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<Result>({ status: "idle" });

  const form = useForm<ContactMessageInput, unknown, ContactMessageValues>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: EMPTY,
    // Validate on the way out of a field, then live once that field has been
    // visited. Validating on every keystroke from empty would flag a half-typed
    // email before the visitor has finished reading their own address back.
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  /**
   * Server errors win over client errors.
   *
   * The two are usually identical, because the schemas are identical. They
   * diverge in the one case that matters: the server saw something the browser
   * could not, and its version is the one that was enforced.
   */
  const serverErrors = result.status === "error" ? result.fieldErrors : undefined;
  const errorFor = (field: keyof ContactMessageInput): string | undefined =>
    serverErrors?.[field] ?? errors[field]?.message;

  const fieldErrors =
    result.status === "error" ? (result.fieldErrors ?? undefined) : undefined;

  const onValid = async (values: ContactMessageValues) => {
    setResult({ status: "pending" });

    const honeypot =
      formRef.current?.querySelector<HTMLInputElement>(`[name="${HONEYPOT_FIELD}"]`) ?? null;

    const response = await submitContactMessage(buildFormData({ values, honeypot }));

    if (response.status === "success") {
      // Only now is the work genuinely finished, so only now is it cleared.
      reset(EMPTY);
      setResult({ status: "success", message: response.message });
      return;
    }

    setResult({
      status: "error",
      message: response.message,
      fieldErrors: response.fieldErrors,
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(onValid)}
      noValidate
      className="relative space-y-6 rounded-xl border border-charcoal-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <HoneypotField />

      {fieldErrors ? <FormErrorSummary errors={fieldErrors} labels={FIELD_LABELS} /> : null}

      <ResultRegion
        status={result.status}
        message={result.status === "success" || result.status === "error" ? result.message : undefined}
        // A validation failure is fully described by the summary above it.
        hidden={fieldErrors !== undefined && result.status === "error"}
      />

      <FieldGrid>
        <TextField
          id="fullName"
          label="Your name"
          required
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          error={errorFor("fullName")}
          {...register("fullName")}
        />
        <TextField
          id="email"
          label="Email address"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
          error={errorFor("email")}
          {...register("email")}
        />
      </FieldGrid>

      <TextField
        id="phone"
        label="Phone number"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        enterKeyHint="next"
        hint="Optional, but it is the fastest way to reach you."
        error={errorFor("phone")}
        {...register("phone")}
      />

      <TextAreaField
        id="message"
        label="How can we help?"
        required
        rows={6}
        hint="Tell us what you need, and anything you have already tried."
        error={errorFor("message")}
        {...register("message")}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          loadingText="Sending your message…"
        >
          Send message
        </Button>
        <p className="text-sm text-charcoal-600">We reply to messages during business hours.</p>
      </div>
    </form>
  );
}
