"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, CircleAlert, CircleCheck, CircleX, Clock3, Mail } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useConfirmPublicCalendarBooking,
  useCreatePublicCalendarBookingHold,
  usePublicCalendarBookingCallback,
} from "@/hooks/api/calendar-booking-public";
import type {
  PublicCalendarBookingHold,
  PublicCalendarBookingOffering,
  PublicCalendarBookingReceipt,
  PublicCalendarBookingSession,
} from "@/hooks/api/calendar-booking-public-schema";
import { isApiError } from "@/lib/api-envelope";
import { statusToneClasses } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { usePaidCalendarBooking } from "../hooks/use-paid-calendar-booking";
import { PublicCalendarBookingPaymentStatus } from "./public-calendar-booking-payment-status";

const bookingFormSchema = z.object({
  slotStart: z.string().min(1, "Choose a time"),
  guestName: z.string().trim().min(1, "Enter your name").max(160),
  guestEmail: z.string().trim().email("Enter a valid email").max(320),
  intake: z.record(z.string(), z.string()),
  consentAccepted: z.boolean(),
  website: z.string().max(200),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

function idempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function outcomeTitle(outcome: string): string {
  if (outcome === "confirmed") return "Your booking is confirmed";
  if (outcome === "pending") return "Your booking request was received";
  if (outcome === "expired") return "The time reservation expired";
  if (outcome === "cancelled") return "The booking was cancelled";
  if (outcome === "uncertain") return "We could not confirm availability yet";
  return "Your booking needs attention";
}

function bookingTime(value: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function slotTime(value: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

function keyFor(keys: Map<string, string>, identity: string): string {
  const existing = keys.get(identity);
  if (existing) return existing;
  const next = idempotencyKey();
  keys.set(identity, next);
  return next;
}

export function PublicCalendarBookingForm({
  token,
  offering,
  session,
  callbackState,
}: {
  token: string;
  offering: PublicCalendarBookingOffering;
  session: PublicCalendarBookingSession;
  callbackState: string | null;
}) {
  const acquireHold = useCreatePublicCalendarBookingHold(token);
  const confirmBooking = useConfirmPublicCalendarBooking(token);
  const queryClient = useQueryClient();
  const paidBooking = usePaidCalendarBooking(token, offering, session);
  const paymentResult = paidBooking.result;
  const [lastReceipt, setLastReceipt] = useState<PublicCalendarBookingReceipt | null>(null);
  const receipt = paymentResult?.receipt ?? confirmBooking.data ?? lastReceipt;
  const callbackQuery = usePublicCalendarBookingCallback(
    token,
    session.sessionToken,
    session.channel === "embed" &&
      (receipt?.outcome === "confirmed" || receipt?.outcome === "pending"),
  );
  const holdKeys = useRef(new Map<string, string>());
  const commitKeys = useRef(new Map<string, string>());
  const replayPayload = useRef<Parameters<typeof confirmBooking.mutateAsync>[0] | null>(null);
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      slotStart: "",
      guestName: "",
      guestEmail: "",
      intake: {},
      consentAccepted: false,
      website: "",
    },
  });
  const visibleIntakeFields = useMemo(() => {
    const enabled = new Set(session.intakeKeys);
    return offering.intakeFields.filter((field) => enabled.has(field.key));
  }, [offering.intakeFields, session.intakeKeys]);
  const pending = acquireHold.isPending || confirmBooking.isPending ||
    paidBooking.pending;
  const failure = acquireHold.error ?? confirmBooking.error ??
    paidBooking.error;

  useEffect(() => {
    if (
      !callbackQuery.data ||
      !session.targetOrigin ||
      !session.callbackSignature ||
      callbackQuery.data.signature !== session.callbackSignature ||
      !callbackState
    ) return;
    window.parent.postMessage(
      { ...callbackQuery.data, state: callbackState },
      session.targetOrigin,
    );
  }, [callbackQuery.data, callbackState, session.callbackSignature, session.targetOrigin]);

  useEffect(() => {
    if (confirmBooking.data) setLastReceipt(confirmBooking.data);
  }, [confirmBooking.data]);

  async function handleSubmit(values: BookingFormValues) {
    for (const field of visibleIntakeFields) {
      if (field.required && !values.intake[field.key]?.trim()) {
        form.setError(`intake.${field.key}`, {
          type: "required",
          message: `Enter ${session.copy.fieldLabels[field.key] ?? field.label}`,
        });
        form.setFocus(`intake.${field.key}`);
        return;
      }
    }
    if (!offering.slots.some((slot) => slot.start === values.slotStart)) {
      form.setValue("slotStart", "", { shouldValidate: true });
      await queryClient.invalidateQueries({ queryKey: ["public", "calendar", "booking", token, "offering"] });
      return;
    }
    let hold: PublicCalendarBookingHold;
    try {
      hold = await acquireHold.mutateAsync({
        start: values.slotStart,
        sessionToken: session.sessionToken,
        idempotencyKey: keyFor(holdKeys.current, values.slotStart),
        consentAccepted: values.consentAccepted,
        honeypot: values.website,
      });
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        holdKeys.current.delete(values.slotStart);
        form.setValue("slotStart", "");
        await queryClient.invalidateQueries({
          queryKey: ["public", "calendar", "booking", token, "offering"],
        });
      }
      return;
    }
    if (session.payment) {
      await paidBooking.submit(hold, values);
      return;
    }
    try {
      const payload = {
        holdId: hold.id,
        sessionToken: session.sessionToken,
        idempotencyKey: keyFor(commitKeys.current, hold.id),
        expectedFencingToken: hold.fencingToken,
        expectedRuleVersion: offering.version,
        guestName: values.guestName,
        guestEmail: values.guestEmail,
        intake: values.intake,
        consentAccepted: values.consentAccepted,
        honeypot: values.website,
      };
      replayPayload.current = payload;
      await confirmBooking.mutateAsync(payload);
    } catch {
      return;
    }
  }

  function handleConsentChange(checked: boolean | "indeterminate") {
    form.setValue("consentAccepted", checked === true, { shouldValidate: true });
  }

  function chooseAnotherTime(preferredStart?: string) {
    const currentSlot = form.getValues("slotStart");
    if (currentSlot) holdKeys.current.delete(currentSlot);
    if (acquireHold.data?.id) commitKeys.current.delete(acquireHold.data.id);
    replayPayload.current = null;
    setLastReceipt(null);
    acquireHold.reset();
    confirmBooking.reset();
    form.setValue("slotStart", offering.slots.some((slot) => slot.start === preferredStart) ? preferredStart ?? "" : "");
    void queryClient.invalidateQueries({ queryKey: ["public", "calendar", "booking", token, "offering"] });
  }

  function handleRefreshBookingStatus() {
    if (replayPayload.current) confirmBooking.mutate(replayPayload.current);
  }

  function handleChooseAnotherTime() {
    chooseAnotherTime();
  }

  function handleAlternativeClick(event: MouseEvent<HTMLButtonElement>) {
    chooseAnotherTime(event.currentTarget.dataset.start);
  }

  if (
    paymentResult &&
    !(
      paymentResult.paymentState === "captured" &&
      (paymentResult.bookingState === "confirmed" || receipt?.outcome === "pending")
    )
  ) {
    return <PublicCalendarBookingPaymentStatus payment={paymentResult} />;
  }

  if (receipt) {
    const tone = statusToneClasses(
      receipt.outcome === "confirmed" ? "success" :
        receipt.outcome === "pending" || receipt.outcome === "uncertain" ? "warning" : "danger",
    );
    const ReceiptIcon = receipt.outcome === "confirmed" ? CircleCheck :
      receipt.outcome === "pending" || receipt.outcome === "uncertain" ? CircleAlert : CircleX;
    const hasFollowUps = ["pending", "failed", "uncertain"].includes(receipt.providerSyncStatus) ||
      ["pending", "failed", "uncertain"].includes(receipt.externalEffectsStatus);
    return (
      <div className="mx-auto max-w-xl space-y-6 py-2" aria-live="polite">
        <div className="space-y-3 text-center">
          <span className={cn("mx-auto flex size-12 items-center justify-center rounded-xl border", tone.surface, tone.ink, tone.rule)}>
            <ReceiptIcon className="size-6" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {outcomeTitle(receipt.outcome)}
          </h2>
          {receipt.reasonCode && (
            <p className="text-sm text-muted-foreground">
              {receipt.reasonCode.replaceAll("_", " ")}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface-inset p-4 dark:border-background">
          <p className="text-xs font-medium text-muted-foreground">
            {receipt.outcome === "confirmed" ? "Booked time" : "Requested time"}
          </p>
          <p className="mt-1 font-semibold text-foreground">
            {bookingTime(receipt.startAt, offering.timeZone, session.locale)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{offering.timeZone}</p>
        </div>

        {hasFollowUps && (
          <div className="space-y-3" aria-label="Booking follow-ups">
            <h3 className="text-sm font-semibold text-foreground">What happens next</h3>
            {["pending", "failed", "uncertain"].includes(receipt.providerSyncStatus) && (
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  {receipt.providerSyncStatus === "pending" && "Calendar synchronization is in progress."}
                  {receipt.providerSyncStatus === "failed" && "Calendar synchronization needs attention. Your local booking status is shown above."}
                  {receipt.providerSyncStatus === "uncertain" && "Calendar synchronization has not been confirmed yet."}
                </p>
              </div>
            )}
            {["pending", "failed", "uncertain"].includes(receipt.externalEffectsStatus) && (
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  {receipt.externalEffectsStatus === "pending" && "Invitations and other follow-ups are in progress."}
                  {receipt.externalEffectsStatus === "failed" && "A booking follow-up needs attention."}
                  {receipt.externalEffectsStatus === "uncertain" && "Booking follow-ups have not been confirmed yet."}
                </p>
              </div>
            )}
          </div>
        )}

        {confirmBooking.isError && <p className="text-sm text-destructive" role="alert">{getErrorMessage(confirmBooking.error) || "Booking status could not be refreshed. Try again."}</p>}
        <div className="flex flex-wrap gap-2">
          {replayPayload.current && ["confirmed", "pending", "uncertain"].includes(receipt.outcome) && (
            <Button type="button" variant="outline" disabled={confirmBooking.isPending} onClick={handleRefreshBookingStatus}>
              {confirmBooking.isPending ? "Checking booking status…" : "Refresh booking status"}
            </Button>
          )}
          {["rejected", "expired", "cancelled", "uncertain"].includes(receipt.outcome) && (
            <Button type="button" variant="secondary" onClick={handleChooseAnotherTime}>Choose another time</Button>
          )}
        </div>

        {receipt.alternatives.length > 0 && (
          <div className="space-y-2 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">Other available times</h3>
            {receipt.alternatives.map((alternative) => (
              <Button key={alternative.start} type="button" variant="outline" data-start={alternative.start} className="w-full justify-start" onClick={handleAlternativeClick}>
                Review {slotTime(alternative.start, offering.timeZone, session.locale)}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (replayPayload.current && confirmBooking.isError) {
    return (
      <div className="space-y-4 py-12 text-center" role="alert">
        <h2 className="text-xl font-semibold text-foreground">Booking status needs confirmation</h2>
        <p className="text-sm text-muted-foreground">Your request may have succeeded. Check its status before choosing another time.</p>
        <p className="text-sm text-destructive">{getErrorMessage(confirmBooking.error) || "Booking status could not be checked."}</p>
        <Button
          type="button"
          variant="link"
          disabled={confirmBooking.isPending}
          onClick={() => {
            if (replayPayload.current) confirmBooking.mutate(replayPayload.current);
          }}
        >
          Check booking status
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-7" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <section aria-labelledby="booking-time-heading">
        <div className="flex items-center gap-2">
          <Clock3 className="size-5 text-primary" aria-hidden="true" />
          <h2 id="booking-time-heading" className="text-lg font-semibold text-foreground">
            Choose a time
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {offering.durationMinutes} minutes · {offering.timeZone}
        </p>
        {offering.slots.length > 0 ? (
          <Controller control={form.control} name="slotStart" render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              required
              aria-label="Available times"
              className="mt-4 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2"
            >
              {offering.slots.map((slot, index) => (
                <Label
                  key={slot.start}
                  htmlFor={`booking-slot-${index}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 font-normal",
                    field.value === slot.start && "border-primary ring-1 ring-primary",
                  )}
                >
                  <RadioGroupItem
                    id={`booking-slot-${index}`}
                    value={slot.start}
                    ref={index === 0 ? field.ref : undefined}
                    onBlur={field.onBlur}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {slotTime(slot.start, offering.timeZone, session.locale)}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          )} />
        ) : (
          <p className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            {offering.message}
          </p>
        )}
        {form.formState.errors.slotStart && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {form.formState.errors.slotStart.message}
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Your details">
        <div className="space-y-2">
          <Label htmlFor="guest-name">Name</Label>
          <Input id="guest-name" autoComplete="name" {...form.register("guestName")} />
          <p className="text-sm text-destructive">{form.formState.errors.guestName?.message}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="guest-email">Email</Label>
          <Input id="guest-email" type="email" autoComplete="email" {...form.register("guestEmail")} />
          <p className="text-sm text-destructive">{form.formState.errors.guestEmail?.message}</p>
        </div>
      </section>

      {visibleIntakeFields.length > 0 && (
        <section className="grid gap-4" aria-label="Additional information">
          {visibleIntakeFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`intake-${field.key}`}>
                {session.copy.fieldLabels[field.key] ?? field.label}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={`intake-${field.key}`}
                  required={field.required}
                  aria-invalid={Boolean(form.formState.errors.intake?.[field.key])}
                  aria-describedby={form.formState.errors.intake?.[field.key] ? `intake-${field.key}-error` : undefined}
                  {...form.register(`intake.${field.key}`)}
                />
              ) : field.type === "select" ? (
                <Controller control={form.control} name={`intake.${field.key}`} defaultValue="" render={({ field: choice }) => (
                  <Select value={choice.value ?? ""} onValueChange={choice.onChange}>
                    <SelectTrigger
                      id={`intake-${field.key}`}
                      ref={choice.ref}
                      onBlur={choice.onBlur}
                      aria-required={field.required}
                      aria-invalid={Boolean(form.formState.errors.intake?.[field.key])}
                      aria-describedby={form.formState.errors.intake?.[field.key] ? `intake-${field.key}-error` : undefined}
                      className="w-full"
                    >
                      <SelectValue placeholder="Choose an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              ) : (
                <Input
                  id={`intake-${field.key}`}
                  type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                  required={field.required}
                  aria-invalid={Boolean(form.formState.errors.intake?.[field.key])}
                  aria-describedby={form.formState.errors.intake?.[field.key] ? `intake-${field.key}-error` : undefined}
                  {...form.register(`intake.${field.key}`)}
                />
              )}
              {form.formState.errors.intake?.[field.key] && (
                <p id={`intake-${field.key}-error`} className="text-sm text-destructive" role="alert">
                  {form.formState.errors.intake[field.key]?.message}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="sr-only" aria-hidden="true">
        <Label htmlFor="booking-website">Website</Label>
        <Input id="booking-website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
      </div>

      {session.consentRequired && (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4">
          <Checkbox
            id="booking-consent"
            checked={form.watch("consentAccepted")}
            onCheckedChange={handleConsentChange}
            aria-required="true"
          />
          <Label htmlFor="booking-consent" className="font-normal leading-5">
            {session.copy.consentLabel ??
              "I agree that my details may be used to arrange this booking."}
          </Label>
        </div>
      )}

      {(failure || paidBooking.flowError) && (
        <p className="text-sm text-destructive" role="alert">
          {paidBooking.flowError ?? (getErrorMessage(failure) || "The booking could not be completed. Try again.")}
        </p>
      )}

      <LoadingButton
        type="submit"
        className="w-full"
        isPending={pending}
        loadingText={session.payment ? "Opening payment…" : "Confirming…"}
        disabled={offering.slots.length === 0 ||
          (session.consentRequired && !form.watch("consentAccepted"))}
      >
        {session.payment
          ? `Pay ${new Intl.NumberFormat(session.locale, { style: "currency", currency: session.payment.currency }).format(session.payment.amountMinor / 100)} and book`
          : "Confirm booking"}
      </LoadingButton>
    </form>
  );
}
