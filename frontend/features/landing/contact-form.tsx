"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { PhoneInput } from "@/components/ui/phone-input";
import { cn } from "@/lib/utils";
import {
  TurnstileWidget,
  isTurnstileEnabled,
} from "@/components/security/turnstile-widget";
import { PublicFormField, fieldErrorId } from "./components/public-form-field";
import { withCorrelation } from "@/lib/observability/with-correlation";
import { contactErrorBodySchema } from "./contact-api-schema";

/* Relay's footer signup field — a light pill with navy ink — on the dark page.
   Focus draws a light-cyan outline outside the pill; an invalid field a danger
   ring, so the two never hide each other. */
const FIELD_BASE =
  "w-full bg-footer-signup-fill px-5 text-body leading-body text-on-accent outline-none placeholder:text-footer-ink-copy transition-shadow duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-accent-soft aria-invalid:ring-2 aria-invalid:ring-status-danger-ink";
const FIELD = `${FIELD_BASE} h-13 rounded-full`;
const TEXTAREA_FIELD = `${FIELD_BASE} min-h-32 resize-y rounded-footer-panel py-4`;

/* The phone control is a composite (country button + input): the pill is its
   wrapper, the inner parts go transparent on it. */
const PHONE_FIELD =
  "h-13 items-center rounded-full bg-footer-signup-fill pr-5 pl-2 focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-solid focus-within:outline-accent-soft [&_button]:h-10 [&_button]:rounded-full [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-on-accent [&_input]:h-12 [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-3 [&_input]:text-base [&_input]:text-on-accent [&_input]:shadow-none [&_input]:placeholder:text-footer-ink-copy [&_input]:focus-visible:ring-0 [&_input]:focus-visible:ring-offset-0";

type ContactTopic = "sales" | "support" | "partnership" | "press" | "other";

const TOPICS: { value: ContactTopic; label: string }[] = [
  { value: "sales", label: "Talk to sales" },
  { value: "support", label: "Get support" },
  { value: "partnership", label: "Partnership" },
  { value: "press", label: "Press" },
  { value: "other", label: "Something else" },
];

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Work email is required")
    .email("Enter a valid email address"),
  company: z.string(),
  phone: z.string(),
  topic: z.enum(["sales", "support", "partnership", "press", "other"]),
  message: z.string().trim().min(1, "Message is required"),
});

type FormValues = z.infer<typeof schema>;

type ContactResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof FormValues, string>> };

async function submitContactForm(
  data: FormValues & { cfTurnstileToken?: string },
): Promise<ContactResult> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/contact`, {
      method: "POST",
      headers: withCorrelation(new Headers({ "Content-Type": "application/json" })),
      body: JSON.stringify(data),
    });
    if (res.ok) return { ok: true };
    const raw = await res.json().catch(() => null);
    const body = contactErrorBodySchema.safeParse(raw).data ?? {};
    return {
      ok: false,
      error: body.error ?? "Failed to send message. Please try again.",
      fieldErrors: body.fieldErrors,
    };
  } catch {
    return { ok: false, error: "Failed to send message. Please try again." };
  }
}

export function ContactForm() {
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRequired = isTurnstileEnabled();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      phone: "",
      topic: "sales",
      message: "",
    },
  });

  const watchedTopic = form.watch("topic");
  const watchedName = form.watch("name");
  const watchedEmail = form.watch("email");

  function handleTopicSelect(value: ContactTopic) {
    form.setValue("topic", value, { shouldValidate: true });
  }

  function handleSubmit(values: FormValues) {
    setServerError(null);
    setServerFieldErrors({});

    if (turnstileRequired && !turnstileToken) {
      setServerError("Please complete the bot verification challenge.");
      return;
    }

    startTransition(async () => {
      const result = await submitContactForm({
        ...values,
        cfTurnstileToken: turnstileToken ?? undefined,
      });
      if (result.ok) {
        setSubmitted(true);
      } else {
        setServerError(result.error);
        if (result.fieldErrors) setServerFieldErrors(result.fieldErrors);
      }
    });
  }

  function handleReset() {
    form.reset();
    setServerFieldErrors({});
    setServerError(null);
    setSubmitted(false);
  }

  const nameError = form.formState.errors.name?.message ?? serverFieldErrors.name;
  const emailError = form.formState.errors.email?.message ?? serverFieldErrors.email;
  const messageError = form.formState.errors.message?.message ?? serverFieldErrors.message;

  return (
    <div className="relative rounded-footer-panel border border-border-subtle bg-card-glass p-8 shadow-float backdrop-blur-card w768:p-6 w390:p-5">
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="py-10 text-center"
          >
            <div className="mx-auto mb-6 inline-flex size-14 items-center justify-center rounded-full bg-linear-135 from-brand-from to-brand-to text-on-accent shadow-float">
              <CheckCircle2 className="size-7" strokeWidth={2.5} aria-hidden />
            </div>
            <h3 className="mb-3 text-section-title leading-section-title font-semibold tracking-title text-foreground">
              Message received.
            </h3>
            <p className="mx-auto max-w-md text-body leading-body text-foreground-muted">
              Thanks,{" "}
              <span className="font-semibold text-foreground">
                {watchedName}
              </span>
              . A human on our team will get back to you within one business day
              at <span className="font-mono break-all text-accent-soft">{watchedEmail}</span>
              .
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-8 rounded-full px-3 py-1.5 text-relay-label leading-label font-medium text-foreground transition-colors duration-(--motion-fast) outline-none hover:text-accent-soft focus-visible:ring-2 focus-visible:ring-accent-soft"
            >
              ← Send another message
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={form.handleSubmit(handleSubmit)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            noValidate
            aria-busy={pending}
            className="flex flex-col gap-6"
          >
            <fieldset>
              <legend className="mb-3 text-relay-label leading-label font-medium text-foreground">
                What can we help with?
              </legend>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => {
                  const selected = watchedTopic === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => handleTopicSelect(t.value)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-relay-label leading-label font-medium transition-colors duration-(--motion-fast) outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        selected
                          ? "border-transparent bg-linear-135 from-brand-from to-brand-to text-on-accent"
                          : "border-border-glass bg-surface-glass text-foreground-muted hover:border-glass-stroke-active hover:text-foreground",
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-5 w768:grid-cols-1">
              <PublicFormField label="Name" htmlFor="contact-name" error={nameError} required>
                <input
                  id="contact-name"
                  autoComplete="name"
                  placeholder="Aditya Sharma"
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? fieldErrorId("contact-name") : undefined}
                  className={FIELD}
                  {...form.register("name")}
                />
              </PublicFormField>
              <PublicFormField label="Work email" htmlFor="contact-email" error={emailError} required>
                <input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? fieldErrorId("contact-email") : undefined}
                  className={FIELD}
                  {...form.register("email")}
                />
              </PublicFormField>
            </div>

            <div className="grid grid-cols-2 gap-5 w768:grid-cols-1">
              <PublicFormField
                label="Company"
                htmlFor="contact-company"
                error={serverFieldErrors.company}
              >
                <input
                  id="contact-company"
                  autoComplete="organization"
                  placeholder="Acme Inc."
                  aria-invalid={serverFieldErrors.company ? true : undefined}
                  aria-describedby={
                    serverFieldErrors.company ? fieldErrorId("contact-company") : undefined
                  }
                  className={FIELD}
                  {...form.register("company")}
                />
              </PublicFormField>
              <PublicFormField
                label="Phone"
                htmlFor="contact-phone"
                hint="optional"
                error={serverFieldErrors.phone}
              >
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneInput
                      id="contact-phone"
                      value={field.value}
                      onChange={field.onChange}
                      defaultCountry="IN"
                      aria-invalid={serverFieldErrors.phone ? true : undefined}
                      aria-describedby={
                        serverFieldErrors.phone ? fieldErrorId("contact-phone") : undefined
                      }
                      className={PHONE_FIELD}
                    />
                  )}
                />
              </PublicFormField>
            </div>

            <PublicFormField
              label="Tell us what you need"
              htmlFor="contact-message"
              error={messageError}
              required
            >
              <textarea
                id="contact-message"
                rows={5}
                placeholder="Team size, what you're trying to solve, when you'd like to start…"
                aria-invalid={messageError ? true : undefined}
                aria-describedby={messageError ? fieldErrorId("contact-message") : undefined}
                className={TEXTAREA_FIELD}
                {...form.register("message")}
              />
            </PublicFormField>

            {turnstileRequired && (
              <TurnstileWidget onToken={setTurnstileToken} className="mt-1" />
            )}

            {serverError && (
              <p
                role="alert"
                className="rounded-2xl border border-status-danger-ink px-5 py-3 text-body leading-body text-status-danger-ink"
              >
                {serverError}
              </p>
            )}

            <LoadingButton
              type="submit"
              disabled={turnstileRequired && !turnstileToken}
              isPending={pending}
              loadingText="Sending…"
              className="h-13 w-full rounded-full bg-linear-135 from-brand-from to-brand-to text-base font-medium text-on-accent drop-shadow-cta hover:bg-none hover:bg-brand-deep hover:text-accent-soft focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Send message
              <ArrowRight className="size-4" aria-hidden />
            </LoadingButton>

            <p className="text-center text-relay-label leading-label text-foreground-muted">
              Your message is encrypted in transit. We&apos;ll never share your
              email.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
