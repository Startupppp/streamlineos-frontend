"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { submitContactForm } from "@/server/actions/contact-submission";
import { TurnstileWidget, isTurnstileEnabled } from "@/features/security/turnstile-widget";

type ContactTopic = "sales" | "support" | "partnership" | "press" | "other";

const TOPICS: { value: ContactTopic; label: string }[] = [
  { value: "sales", label: "Talk to sales" },
  { value: "support", label: "Get support" },
  { value: "partnership", label: "Partnership" },
  { value: "press", label: "Press" },
  { value: "other", label: "Something else" },
];

type FormState = {
  name: string;
  email: string;
  company: string;
  phone: string;
  topic: ContactTopic;
  message: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  company: "",
  phone: "",
  topic: "sales",
  message: "",
};

export function ContactForm() {
  const [values, setValues] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRequired = isTurnstileEnabled();

  const handleChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);

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
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  };

  return (
    <div className="relative rounded-2xl border border-slate-200/80 bg-white/85 backdrop-blur-sm p-3 lg:p-6 shadow-[0_18px_44px_-18px_rgba(30,64,175,0.18)]">
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="py-10 text-center"
          >
            <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 inline-flex items-center justify-center shadow-[0_18px_40px_-12px_rgba(59,130,246,0.45)]">
              <CheckCircle2 className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">
              Message received.
            </h3>
            <p className="text-slate-600 text-[15px] leading-relaxed max-w-md mx-auto">
              Thanks,{" "}
              <span className="font-semibold text-slate-900">
                {values.name}
              </span>
              . A human on our team will get back to you within one business day
              at <span className="font-mono text-blue-600">{values.email}</span>
              .
            </p>
            <button
              onClick={() => {
                setValues(initialState);
                setSubmitted(false);
              }}
              className="mt-7 text-[12px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              ← Send another message
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            noValidate
            aria-busy={pending}
            className="space-y-5"
          >
            <div>
              <Label className="text-[13px] font-medium text-slate-700 mb-2 block">
                What can we help with?
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {TOPICS.map((t) => {
                  const selected = values.topic === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => handleChange("topic", t.value)}
                      className={cn(
                        "text-[12px] font-medium rounded-lg border px-2.5 py-2 transition-all",
                        selected
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-slate-900",
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name" error={fieldErrors.name} required>
                <Input
                  value={values.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Aditya Sharma"
                  className="h-10"
                  required
                />
              </Field>
              <Field label="Work email" error={fieldErrors.email} required>
                <Input
                  type="email"
                  value={values.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="you@company.com"
                  className="h-10"
                  required
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Company" error={fieldErrors.company}>
                <Input
                  value={values.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  placeholder="Acme Inc."
                  className="h-10"
                />
              </Field>
              <Field label="Phone" hint="optional" error={fieldErrors.phone}>
                <Input
                  value={values.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-10"
                />
              </Field>
            </div>

            <Field
              label="Tell us what you need"
              error={fieldErrors.message}
              required
            >
              <textarea
                value={values.message}
                onChange={(e) => handleChange("message", e.target.value)}
                rows={5}
                placeholder="Team size, what you're trying to solve, when you'd like to start…"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:border-blue-400 resize-y min-h-[120px]"
                required
              />
            </Field>

            {turnstileRequired && (
              <TurnstileWidget onToken={setTurnstileToken} className="mt-1" />
            )}

            {serverError && (
              <p role="alert" className="text-sm text-red-600">
                {serverError}
              </p>
            )}

            <Button
              type="submit"
              disabled={pending || (turnstileRequired && !turnstileToken)}
              className="w-full h-11"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending…
                </>
              ) : (
                <>
                  Send message
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-[12px] font-medium text-slate-400 text-center">
              Your message is encrypted in transit. We&apos;ll never share your email.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
        {label}
        {required && (
          <span className="text-red-500" aria-hidden>
            *
          </span>
        )}
        {hint && (
          <span className="text-[11px] font-normal text-slate-400">
            ({hint})
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p role="alert" className="text-[12px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
