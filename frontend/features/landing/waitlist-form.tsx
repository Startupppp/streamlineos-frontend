"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  TurnstileWidget,
  isTurnstileEnabled,
} from "@/features/security/turnstile-widget";
import { PublicFormField } from "./components/public-form-field";
import { joinWaitlist } from "./waitlist-client";
import {
  TEAM_SIZES,
  waitlistSchema,
  type WaitlistEntry,
  type WaitlistFieldErrors,
  type WaitlistFormValues,
} from "./waitlist-schema";

export function WaitlistForm() {
  const [serverFieldErrors, setServerFieldErrors] = useState<WaitlistFieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [pending, startTransition] = useTransition();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRequired = isTurnstileEnabled();

  const form = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      name: "",
      email: "",
      organization: "",
      role: "",
      teamSize: "11-50",
      notes: "",
    },
  });

  const watchedTeamSize = form.watch("teamSize");
  const watchedName = form.watch("name");
  const watchedEmail = form.watch("email");

  function handleTeamSizeSelect(value: (typeof TEAM_SIZES)[number]) {
    form.setValue("teamSize", value, { shouldValidate: true });
  }

  function handleSubmit(values: WaitlistFormValues) {
    setServerError(null);
    setServerFieldErrors({});

    if (turnstileRequired && !turnstileToken) {
      setServerError("Please complete the bot verification challenge.");
      return;
    }

    startTransition(async () => {
      const result = await joinWaitlist(values, turnstileToken ?? undefined);
      if (result.ok) {
        setEntry(result.entry);
      } else {
        setServerError(result.error);
        if (result.fieldErrors) setServerFieldErrors(result.fieldErrors);
      }
    });
  }

  return (
    <div className="relative rounded-2xl border border-border bg-white/85 backdrop-blur-sm p-3 lg:p-6 shadow-[0_18px_44px_-18px_rgba(30,64,175,0.18)]">
      <AnimatePresence mode="wait">
        {entry ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="py-10 text-center"
          >
            <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-gradient-to-br from-gradient-info-from to-gradient-info-to inline-flex items-center justify-center shadow-[0_18px_40px_-12px_rgba(59,130,246,0.45)]">
              <CheckCircle2 className="w-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">
              {entry.alreadyJoined ? "You're already on the list." : "You're on the list."}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              Thanks,{" "}
              <span className="font-semibold text-foreground">{watchedName}</span>. We&apos;ll
              email <span className="font-mono text-status-info-ink">{watchedEmail}</span> the
              moment your invite is ready.
            </p>
            {entry.position > 0 && (
              <p className="mt-6 text-label font-medium text-foreground">
                You&apos;re number{" "}
                <span className="font-mono text-status-info-ink">#{entry.position}</span> in the
                queue
                {entry.reference && (
                  <>
                    {" · "}
                    <span className="font-mono text-muted-foreground">{entry.reference}</span>
                  </>
                )}
              </p>
            )}
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
            <div className="grid sm:grid-cols-2 gap-4">
              <PublicFormField
                label="Name"
                error={form.formState.errors.name?.message ?? serverFieldErrors.name}
                required
              >
                <Input placeholder="Aditya Sharma" {...form.register("name")} />
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
              <PublicFormField
                label="Organization"
                error={
                  form.formState.errors.organization?.message ??
                  serverFieldErrors.organization
                }
                required
              >
                <Input placeholder="Acme Inc." {...form.register("organization")} />
              </PublicFormField>
              <PublicFormField
                label="Your role"
                hint="optional"
                error={serverFieldErrors.role}
              >
                <Input placeholder="Head of Operations" {...form.register("role")} />
              </PublicFormField>
            </div>

            <div>
              <Label className="text-label font-medium text-foreground mb-2 block">
                How many people?
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {TEAM_SIZES.map((size) => {
                  const selected = watchedTeamSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleTeamSizeSelect(size)}
                      aria-pressed={selected}
                      className={cn(
                        "text-xs font-medium rounded-lg border px-2.5 py-2 transition-all",
                        selected
                          ? "bg-status-neutral-fill text-white border-border shadow-sm"
                          : "bg-white text-foreground border-border hover:border-status-info-rule hover:text-muted-foreground",
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <PublicFormField
              label="What are you hoping to run on it?"
              hint="optional"
              error={serverFieldErrors.notes}
            >
              <textarea
                rows={4}
                placeholder="HR and payroll today, projects and CRM next quarter…"
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-info-rule focus-visible:border-status-info-rule resize-y min-h-[100px]"
                {...form.register("notes")}
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
              loadingText="Adding you…"
              className="w-full h-11"
            >
              Join the waitlist
              <ArrowRight className="ml-2 h-4 w-4" />
            </LoadingButton>

            <p className="text-xs font-medium text-muted-foreground text-center">
              No card, no commitment. We&apos;ll only email you about your invite.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
