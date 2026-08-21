"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import {
  useJoinWaitlistMutation,
  WAITLIST_TEAM_SIZES,
  type WaitlistTeamSize,
} from "@/lib/api/hooks/waitlist";
import {
  toWaitlistPayload,
  waitlistFormSchema,
  WAITLIST_DEFAULT_VALUES,
  type WaitlistFormValues,
} from "../lib/waitlist-schema";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const RATE_LIMITED_MESSAGE =
  "Too many requests from this network. Please try again in a little while.";

export function WaitlistForm() {
  const reduce = useReducedMotion();
  const [joinedEmail, setJoinedEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const joinWaitlist = useJoinWaitlistMutation();

  const form = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistFormSchema),
    defaultValues: WAITLIST_DEFAULT_VALUES,
  });

  const teamSize = form.watch("teamSize");

  function handleTeamSizeSelect(value: WaitlistTeamSize) {
    form.setValue("teamSize", teamSize === value ? "" : value);
  }

  function handleSubmit(values: WaitlistFormValues) {
    setServerError(null);
    joinWaitlist.mutate(toWaitlistPayload(values), {
      onSuccess: () => {
        setJoinedEmail(values.email.trim().toLowerCase());
        toast.success("You're on the waitlist.");
      },
      onError: (error: unknown) => {
        const message =
          isApiError(error) && error.status === 429
            ? RATE_LIMITED_MESSAGE
            : getErrorMessage(error);
        setServerError(message);
        toast.error(message);
      },
    });
  }

  function handleReset() {
    form.reset(WAITLIST_DEFAULT_VALUES);
    setJoinedEmail(null);
    setServerError(null);
    joinWaitlist.reset();
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 lg:p-7 shadow-[0_28px_70px_-30px_rgba(2,6,23,0.65)]">
      {joinedEmail ? (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="py-8 text-center"
          role="status"
        >
          <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-core/10">
            <CheckCircle2
              className="h-7 w-7 text-brand-core"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            You&apos;re on the list.
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-slate-600">
            We&apos;ll email{" "}
            <span className="font-medium text-slate-900 break-all">
              {joinedEmail}
            </span>{" "}
            the moment your workspace is ready.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-6 text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:underline"
          >
            ← Add another email
          </button>
        </motion.div>
      ) : (
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          noValidate
          aria-busy={joinWaitlist.isPending}
          className="space-y-4"
        >
          <Field
            id="waitlist-name"
            label="Name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              id="waitlist-name"
              autoComplete="name"
              placeholder="Aditya Sharma"
              aria-invalid={!!form.formState.errors.name}
              {...form.register("name")}
            />
          </Field>

          <Field
            id="waitlist-email"
            label="Work email"
            required
            error={form.formState.errors.email?.message}
          >
            <Input
              id="waitlist-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@company.com"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
          </Field>

          <Field
            id="waitlist-company"
            label="Company"
            hint="optional"
            error={form.formState.errors.company?.message}
          >
            <Input
              id="waitlist-company"
              autoComplete="organization"
              placeholder="Acme Inc."
              aria-invalid={!!form.formState.errors.company}
              {...form.register("company")}
            />
          </Field>

          <fieldset className="space-y-2">
            <legend className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
              Team size
              <span className="text-[11px] font-normal text-slate-400">
                (optional)
              </span>
            </legend>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {WAITLIST_TEAM_SIZES.map((size) => (
                <TeamSizeChip
                  key={size}
                  size={size}
                  selected={teamSize === size}
                  onSelect={handleTeamSizeSelect}
                />
              ))}
            </div>
          </fieldset>

          {serverError && (
            <p role="alert" className="text-[13px] text-red-600">
              {serverError}
            </p>
          )}

          <LoadingButton
            type="submit"
            isPending={joinWaitlist.isPending}
            loadingText="Joining…"
            className="h-11 w-full text-[15px] font-semibold"
          >
            Join the waitlist
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </LoadingButton>

          <p className="text-center text-[12px] leading-relaxed text-slate-400">
            One email when we launch. No spam, no sharing your address.
          </p>
        </form>
      )}
    </div>
  );
}

function TeamSizeChip({
  size,
  selected,
  onSelect,
}: {
  size: WaitlistTeamSize;
  selected: boolean;
  onSelect: (value: WaitlistTeamSize) => void;
}) {
  function handleClick() {
    onSelect(size);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      className={cn(
        "rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-core/40",
        selected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-brand-core/40 hover:text-slate-900",
      )}
    >
      {size}
    </button>
  );
}

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
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700"
      >
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
