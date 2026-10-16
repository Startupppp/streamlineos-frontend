"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  TurnstileWidget,
  isTurnstileEnabled,
} from "@/components/security/turnstile-widget";
import { PublicFormField } from "./components/public-form-field";
import { withCorrelation } from "@/lib/observability/with-correlation";
import { contactErrorBodySchema } from "./contact-api-schema";
import { EASE_OUT } from "./components/motion/variants";

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

  function handleTopicSelect(event: MouseEvent<HTMLButtonElement>) {
    const topic = TOPICS.find((t) => t.value === event.currentTarget.dataset.topic);
    if (topic) form.setValue("topic", topic.value, { shouldValidate: true });
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

  return (
    <div className="lp-card relative rounded-3xl p-5 sm:p-8">
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="py-10 text-center"
          >
            <div className="mx-auto mb-5 inline-flex size-14 items-center justify-center rounded-full bg-(--lp-accent)">
              <CheckCircle2 className="w-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="lp-display mb-2 text-4xl text-foreground">
              Message received.
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              Thanks,{" "}
              <span className="font-semibold text-foreground">
                {watchedName}
              </span>
              . A human on our team will get back to you within one business day
              at <span className="font-mono text-status-info-ink">{watchedEmail}</span>
              .
            </p>
            <button
              onClick={handleReset}
              className="mt-7 text-xs font-medium text-foreground hover:text-muted-foreground transition-colors"
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
            className="space-y-5"
          >
            <div>
              <Label className="text-label font-medium text-foreground mb-2 block">
                What can we help with?
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {TOPICS.map((t) => {
                  const selected = watchedTopic === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      data-topic={t.value}
                      aria-pressed={selected}
                      onClick={handleTopicSelect}
                      className={cn(
                        "rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                        selected
                          ? "border-foreground bg-foreground text-white"
                          : "border-border bg-card text-foreground hover:border-(--lp-ink)/40",
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <PublicFormField
                label="Name"
                error={form.formState.errors.name?.message ?? serverFieldErrors.name}
                required
              >
                <Input
                  placeholder="Aditya Sharma"
                  {...form.register("name")}
                />
              </PublicFormField>
              <PublicFormField
                label="Work email"
                error={form.formState.errors.email?.message ?? serverFieldErrors.email}
                required
              >
                <Input
                  type="email"
                  placeholder="you@company.com"
                  {...form.register("email")}
                />
              </PublicFormField>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <PublicFormField label="Company" error={serverFieldErrors.company}>
                <Input
                  placeholder="Acme Inc."
                  {...form.register("company")}
                />
              </PublicFormField>
              <PublicFormField label="Phone" hint="optional" error={serverFieldErrors.phone}>
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      defaultCountry="IN"
                    />
                  )}
                />
              </PublicFormField>
            </div>

            <PublicFormField
              label="Tell us what you need"
              error={form.formState.errors.message?.message ?? serverFieldErrors.message}
              required
            >
              <textarea
                rows={5}
                placeholder="Team size, what you're trying to solve, when you'd like to start…"
                className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-info-rule focus-visible:border-status-info-rule resize-y min-h-[120px]"
                {...form.register("message")}
              />
            </PublicFormField>

            {turnstileRequired && (
              <TurnstileWidget onToken={setTurnstileToken} className="mt-1" />
            )}

            {serverError && (
              <p role="alert" className="text-sm text-status-danger-ink">
                {serverError}
              </p>
            )}

            <LoadingButton
              type="submit"
              disabled={turnstileRequired && !turnstileToken}
              isPending={pending}
              loadingText="Sending…"
              className="h-11 w-full rounded-full font-semibold"
            >
              Send message
              <ArrowRight className="ml-2 h-4 w-4" />
            </LoadingButton>

            <p className="text-xs font-medium text-muted-foreground text-center">
              Your message is encrypted in transit. We&apos;ll never share your
              email.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
