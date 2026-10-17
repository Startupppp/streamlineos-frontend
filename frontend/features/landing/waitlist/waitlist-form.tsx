"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { TurnstileWidget, isTurnstileEnabled } from "@/components/security/turnstile-widget";
import { ApiError, isApiError } from "@/lib/api-envelope";
import { useJoinWaitlist } from "@/lib/api/hooks/waitlist";
import { cn } from "@/lib/utils";
import {
  MODULE_LABELS,
  TEAM_SIZES,
  WAITLIST_MODULES,
  waitlistSchema,
  type WaitlistFormValues,
  type WaitlistPayload,
} from "./waitlist-schema";

const FIELD_ORDER = ["name", "email", "company", "teamSize", "role", "phone", "notes", "consent"] as const;

function campaignFromLocation(): { source?: string; utm?: Record<string, string> } {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const [key, value] of params) {
    if (!key.toLowerCase().startsWith("utm_") || value.trim().length === 0) continue;
    if (Object.keys(utm).length >= 5) break;
    utm[key.slice(0, 40)] = value.trim().slice(0, 80);
  }
  const source = params.get("source")?.trim().slice(0, 50);
  return {
    source: source || undefined,
    utm: Object.keys(utm).length > 0 ? utm : undefined,
  };
}

function fieldErrorsFromApi(error: ApiError): Record<string, string> {
  const details = error.details;
  if (!details || typeof details !== "object" || !("details" in details)) return {};
  const rows = (details as { details?: { path?: string; message?: string }[] }).details;
  if (!Array.isArray(rows)) return {};
  const errors: Record<string, string> = {};
  for (const row of rows) {
    const field = row.path?.split(".").pop();
    if (field && row.message && !errors[field]) errors[field] = row.message;
  }
  return errors;
}

export function WaitlistForm() {
  const mutation = useJoinWaitlist();
  const successRef = useRef<HTMLHeadingElement>(null);
  const [succeededEmail, setSucceededEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRequired = isTurnstileEnabled();
  const form = useForm<WaitlistFormValues, unknown, WaitlistPayload>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      role: "",
      teamSize: undefined,
      modules: [],
      phone: "",
      notes: "",
      website: "",
      consent: undefined,
    },
  });

  useEffect(() => {
    if (succeededEmail) successRef.current?.focus();
  }, [succeededEmail]);

  function focusFirstInvalid() {
    const names = Object.keys(form.formState.errors);
    const first = FIELD_ORDER.find((name) => names.includes(name)) ?? names[0];
    if (!first) return;
    const node = document.getElementById(first);
    if (node instanceof HTMLElement) node.focus();
  }

  function handleValid(values: WaitlistPayload) {
    setFormError(null);
    if (turnstileRequired && !turnstileToken) {
      setFormError("Please complete the bot verification challenge.");
      return;
    }
    const campaign = campaignFromLocation();
    mutation.mutate(
        {
          ...values,
          role: values.role || undefined,
          notes: values.notes || undefined,
          modules: values.modules?.length ? values.modules : undefined,
          website: values.website || undefined,
          source: campaign.source,
          utm: campaign.utm,
          cfTurnstileToken: turnstileToken ?? undefined,
        },
      {
        onSuccess: () => setSucceededEmail(values.email),
        onError: (error) => {
          if (isApiError(error) && error.status === 400) {
            const fields = fieldErrorsFromApi(error);
            for (const [name, message] of Object.entries(fields)) {
              form.setError(name as keyof WaitlistFormValues, { message });
            }
            setFormError(Object.keys(fields).length === 0 ? "Check the highlighted fields and try again." : null);
            return;
          }
          if (isApiError(error) && error.status === 429) {
            setFormError("Too many attempts. Try again in a little while.");
            return;
          }
          setFormError("We couldn't add you just now. Your answers are still here.");
          toast.error("We couldn't add you just now. Please try again.");
        },
      },
    );
  }

  if (succeededEmail) {
    return (
      <div className="lp-card rounded-3xl p-6 sm:p-8">
        <h2
          ref={successRef}
          tabIndex={-1}
          id="waitlist-success"
          className="lp-display text-4xl text-foreground outline-none"
        >
          You're on the list. We'll email you when your spot opens.
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          We'll write to <span className="font-medium text-foreground">{succeededEmail}</span>.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-(--lp-ink) px-5 text-sm font-medium text-(--lp-canvas)"
          onClick={() => {
            setSucceededEmail(null);
            form.reset();
            mutation.reset();
          }}
        >
          Add another email
        </button>
      </div>
    );
  }

  const errors = form.formState.errors;

  return (
    <form
      noValidate
      aria-busy={mutation.isPending}
      className="lp-card relative space-y-5 rounded-3xl p-6 sm:p-8"
      onSubmit={form.handleSubmit(handleValid, focusFirstInvalid)}
    >
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" aria-hidden="true" {...form.register("website")} />
      </div>

      <Field id="name" label="Full name" error={errors.name?.message} required>
        <input id="name" autoComplete="name" className={inputClass} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} {...form.register("name")} />
      </Field>
      <Field id="email" label="Work email" error={errors.email?.message} required>
        <input id="email" type="email" autoComplete="email" className={inputClass} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} {...form.register("email")} />
      </Field>
      <Field id="company" label="Company name" error={errors.company?.message} required>
        <input id="company" autoComplete="organization" className={inputClass} aria-invalid={Boolean(errors.company)} aria-describedby={errors.company ? "company-error" : undefined} {...form.register("company")} />
      </Field>

      <fieldset id="teamSize" tabIndex={-1} className="outline-none" aria-describedby={errors.teamSize ? "teamSize-error" : undefined}>
        <legend className="text-sm font-medium text-foreground">
          Team size <span className="text-(--lp-accent)">*</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TEAM_SIZES.map((size) => (
            <label key={size} className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-(--lp-ink)/15 px-4 text-sm has-[:checked]:bg-(--lp-ink) has-[:checked]:text-(--lp-canvas)">
              <input type="radio" className="sr-only" value={size} {...form.register("teamSize")} />
              {size}
            </label>
          ))}
        </div>
        {errors.teamSize?.message ? (
          <p id="teamSize-error" role="alert" className="mt-2 text-sm text-red-700">
            {errors.teamSize.message}
          </p>
        ) : null}
      </fieldset>

      <Field id="role" label="Role / title" hint="Optional" error={errors.role?.message}>
        <input id="role" autoComplete="organization-title" className={inputClass} aria-invalid={Boolean(errors.role)} aria-describedby={errors.role ? "role-error" : undefined} {...form.register("role")} />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Modules interested in</legend>
        <p className="mt-1 text-sm text-muted-foreground">Optional. Pick the product you'd onboard first.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {WAITLIST_MODULES.map((moduleId) => (
            <label key={moduleId} className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-(--lp-ink)/15 px-4 text-sm has-[:checked]:bg-(--lp-accent-soft) has-[:checked]:text-foreground">
              <input type="checkbox" className="sr-only" value={moduleId} {...form.register("modules")} />
              {MODULE_LABELS[moduleId]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="phone" label="Phone" hint="Optional" error={errors.phone?.message}>
        <input id="phone" type="tel" autoComplete="tel" className={inputClass} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} {...form.register("phone")} />
      </Field>
      <Field id="notes" label="What problem are you solving?" hint="Optional" error={errors.notes?.message}>
        <textarea id="notes" rows={4} maxLength={500} className={cn(inputClass, "min-h-28 resize-y")} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? "notes-error" : undefined} {...form.register("notes")} />
      </Field>

      <div>
        <label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed text-foreground">
          <input id="consent" type="checkbox" className="mt-1 size-4" aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consent-error" : undefined} {...form.register("consent")} />
          <span>
            I agree to be contacted by StreamlineOS about early access. See our{" "}
            <Link href="/legal/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.consent?.message ? (
          <p id="consent-error" role="alert" className="mt-2 text-sm text-red-700">
            {errors.consent.message}
          </p>
        ) : null}
      </div>

      {turnstileRequired ? <TurnstileWidget onToken={setTurnstileToken} /> : null}
      {formError ? (
        <p role="alert" className="text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <LoadingButton
        type="submit"
        isPending={mutation.isPending}
        className="min-h-11 rounded-full bg-(--lp-ink) px-6 text-(--lp-canvas) hover:bg-(--lp-ink)"
      >
        Join the waitlist
      </LoadingButton>
    </form>
  );
}

const inputClass =
  "min-h-11 w-full rounded-2xl border border-(--lp-ink)/15 bg-(--lp-surface) px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-(--lp-accent)";

function Field({
  id,
  label,
  hint,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-(--lp-accent)"> *</span> : null}
        {hint ? <span className="font-normal text-muted-foreground"> {hint}</span> : null}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
