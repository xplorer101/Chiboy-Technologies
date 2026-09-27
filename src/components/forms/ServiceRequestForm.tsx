"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { submitServiceRequest } from "@/lib/actions/service-request";
import { Button } from "@/components/ui/Button";
import { FormErrorSummary } from "@/components/ui/ErrorSummary";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import {
  FieldGrid,
  FileInputField,
  HoneypotField,
  RadioGroup,
  ResultRegion,
  type FileInputHandle,
} from "@/components/forms/parts";
import { buildFormData } from "@/lib/utils/form-data";
import {
  HONEYPOT_FIELD,
  OTHER_SERVICE,
  serviceRequestSchema,
  type ServiceRequestInput,
  type ServiceRequestValues,
} from "@/lib/validation/forms";

/**
 * The service request form.
 *
 * WHY THE SERVICE IS A SELECT AND NOT A REQUIRED FIELD
 * ----------------------------------------------------
 * "Not sure" is allowed, and is offered as an explicit option. Making the
 * category mandatory would mean a visitor who does not recognise their problem
 * in our list has to either pick a wrong one or leave the page — and a request
 * filed under the wrong service costs a round of clarification that asking them
 * to describe it in their own words would not. An unfiled request beats a
 * misfiled one.
 *
 * WHY THE FREE-TEXT SERVICE FIELD IS REVEALED CONDITIONALLY
 * ---------------------------------------------------------
 * Shown only when "Other" is chosen, so the common path is not a form with a
 * field most people will never fill in. The server enforces the same rule
 * independently, since a visitor can trivially submit the hidden field anyway.
 *
 * WHY THE SELECT IS NOT REHYDRATED FROM RHF
 * ------------------------------------------
 * The whole form resets on success, and a controlled `watch()` for the selected
 * service would need a reset too. Reading it from `watch` in a `useEffect` is
 * the smaller amount of state to get wrong, because RHF already owns the value
 * and there is only one source of truth.
 */

const EMPTY: ServiceRequestInput = {
  fullName: "",
  email: "",
  phone: "",
  serviceId: "",
  serviceOther: "",
  location: "",
  contactPref: "PHONE",
  description: "",
};

const FIELD_LABELS: Record<string, string> = {
  fullName: "Your name",
  email: "Email address",
  phone: "Phone number",
  serviceId: "Service needed",
  serviceOther: "What the work is",
  location: "Location",
  contactPref: "Preferred contact method",
  description: "Description",
  _form: "This form",
};

const CONTACT_PREFERENCES = [
  { value: "PHONE", label: "Phone call" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
] as const;

type Result =
  | { status: "idle" | "pending" }
  | { status: "success"; message: string; reference: string }
  | { status: "error"; message: string; fieldErrors: Record<string, string> | undefined };

export function ServiceRequestForm({
  services,
  maxFiles,
  maxMb,
  accept,
  preselectedService,
}: {
  /** The published services, as id/label pairs. */
  services: ReadonlyArray<{ id: string; name: string }>;
  maxFiles: number;
  maxMb: number;
  accept: string;
  /** Pre-selected when arriving from a service page's own request link. */
  preselectedService?: string | undefined;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<FileInputHandle>(null);
  const [result, setResult] = useState<Result>({ status: "idle" });

  const form = useForm<ServiceRequestInput, unknown, ServiceRequestValues>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: { ...EMPTY, serviceId: preselectedService ?? "" },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const serviceId = watch("serviceId");
  const showServiceOther = serviceId === OTHER_SERVICE;

  const serverErrors = result.status === "error" ? result.fieldErrors : undefined;
  const errorFor = (field: keyof ServiceRequestInput): string | undefined =>
    serverErrors?.[field] ?? errors[field]?.message;

  const fieldErrors = result.status === "error" ? result.fieldErrors : undefined;

  const onValid = async (values: ServiceRequestValues) => {
    setResult({ status: "pending" });

    const honeypot =
      formRef.current?.querySelector<HTMLInputElement>(`[name="${HONEYPOT_FIELD}"]`) ?? null;

    const data = buildFormData({
      values,
      honeypot,
      files: fileInputRef.current?.getFiles() ?? null,
    });

    const response = await submitServiceRequest(data);

    if (response.status === "success") {
      reset({ ...EMPTY, serviceId: preselectedService ?? "" });
      // The picker clears itself: the DOM value and the visible list are two
      // different pieces of state, and a second submission must not quietly
      // re-send files the visitor chose once.
      fileInputRef.current?.reset();
      setResult({
        status: "success",
        message: response.message,
        reference: response.data.reference,
      });
      return;
    }

    setResult({ status: "error", message: response.message, fieldErrors: response.fieldErrors });
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(onValid)}
      noValidate
      className="relative space-y-7 rounded-xl border border-charcoal-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <HoneypotField />

      {fieldErrors ? <FormErrorSummary errors={fieldErrors} labels={FIELD_LABELS} /> : null}

      <ResultRegion
        status={result.status}
        reference={result.status === "success" ? result.reference : undefined}
        message={result.status === "success" || result.status === "error" ? result.message : undefined}
        hidden={fieldErrors !== undefined && result.status === "error"}
      />

      <fieldset className="space-y-5">
        <legend className="sr-only">Your details</legend>

        <FieldGrid>
          <TextField
            id="fullName"
            label="Your name"
            required
            autoComplete="name"
            autoCapitalize="words"
            error={errorFor("fullName")}
            {...register("fullName")}
          />
          <TextField
            id="phone"
            label="Phone number"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            hint="We will need to call or message you about this."
            error={errorFor("phone")}
            {...register("phone")}
          />
        </FieldGrid>

        <TextField
          id="email"
          label="Email address"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          error={errorFor("email")}
          {...register("email")}
        />
      </fieldset>

      <fieldset className="space-y-5 border-t border-charcoal-200 pt-7">
        <legend className="sr-only">The work you need</legend>

        <SelectField
          id="serviceId"
          label="Which service do you need?"
          placeholder="Not sure — please read the description below"
          error={errorFor("serviceId")}
          // Restates the preselection as the control's own default, so the
          // server-rendered HTML already shows the right option selected.
          //
          // React Hook Form sets the value on mount, which would make the
          // preselection correct *eventually* — but the server would still
          // render the first option, so a visitor arriving from a service page
          // would see the wrong service selected until hydration, and a
          // JS-blocked visitor would see it wrong permanently. `register()`
          // supplies `name`/`onChange`/`onBlur` but never `value`, so this
          // stays an uncontrolled field and does not fight the library.
          defaultValue={preselectedService ?? ""}
          options={[
            ...services.map((service) => ({ value: service.id, label: service.name })),
            { value: OTHER_SERVICE, label: "Something else" },
          ]}
          {...register("serviceId")}
        />

        {showServiceOther ? (
          <TextField
            id="serviceOther"
            label="What do you need?"
            required
            enterKeyHint="next"
            hint="A few words is enough — you can add detail below."
            error={errorFor("serviceOther")}
            {...register("serviceOther")}
          />
        ) : null}

        <TextField
          id="location"
          label="Where is the work needed?"
          required
          autoComplete="street-address"
          enterKeyHint="next"
          hint="A street address, an area, or an office — however you would describe it on the phone."
          error={errorFor("location")}
          {...register("location")}
        />

        <TextAreaField
          id="description"
          label="Describe the problem or the job"
          required
          rows={7}
          hint="What is not working, what you need done, and when you need it by. Photos of a screen or a fault help a lot."
          error={errorFor("description")}
          {...register("description")}
        />

        <FileInputField
          id="attachments"
          ref={fileInputRef}
          label="Photos or documents"
          maxFiles={maxFiles}
          maxMb={maxMb}
          accept={accept}
          hint={`Up to ${maxFiles} files, ${maxMb} MB each. Screenshots of the problem are usually more useful than a written description.`}
        />
      </fieldset>

      <fieldset className="border-t border-charcoal-200 pt-7">
        <legend className="sr-only">How to reach you</legend>
        <RadioGroup
          name="contactPref"
          legend="How should we contact you?"
          hint="We usually try the fastest option first."
          error={errorFor("contactPref")}
          options={CONTACT_PREFERENCES}
          registration={register("contactPref")}
        />
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-charcoal-200 pt-7 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          loadingText="Sending your request…"
        >
          Request this service
        </Button>
        <p className="text-sm text-charcoal-600">You will get a reference to quote.</p>
      </div>
    </form>
  );
}
