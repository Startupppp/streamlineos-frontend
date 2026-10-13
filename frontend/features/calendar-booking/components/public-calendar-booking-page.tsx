"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarCheck2, Clock3, Loader2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import {
  useConfirmPublicCalendarBooking,
  useCreatePublicCalendarBookingHold,
  usePublicCalendarBookingCallback,
  usePublicCalendarBookingOffering,
  usePublicCalendarBookingSession,
} from "@/hooks/api/calendar-booking-public";
import { getErrorMessage } from "@/lib/get-error-message";

const bookingFormSchema = z.object({
  slotStart: z.string().min(1, "Choose a time"),
  guestName: z.string().trim().min(1, "Enter your name").max(160),
  guestEmail: z.string().trim().email("Enter a valid email").max(320),
  intake: z.record(z.string(), z.string()),
  consentAccepted: z.boolean(),
  website: z.string().max(200),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

function queryValue(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim();
  return value ? value.slice(0, 160) : null;
}

function idempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function PublicCalendarBookingPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params.token ?? "";
  const [range] = useState(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 14 * 86_400_000);
    return { from: from.toISOString(), to: to.toISOString() };
  });
  const callbackState = searchParams.get("state")?.slice(0, 500) ?? null;
  const locale = searchParams.get("locale")?.slice(0, 35);
  const attribution = useMemo(() => ({
    source: queryValue(searchParams, "utm_source"),
    medium: queryValue(searchParams, "utm_medium"),
    campaign: queryValue(searchParams, "utm_campaign"),
    content: queryValue(searchParams, "utm_content"),
    term: queryValue(searchParams, "utm_term"),
    referrerDomain: null,
  }), [searchParams]);
  const sessionInput = useMemo(() => ({
    locale,
    callbackState,
    consentAccepted: false,
    honeypot: "",
    attribution,
  }), [attribution, callbackState, locale]);
  const offeringQuery = usePublicCalendarBookingOffering(token, range.from, range.to);
  const sessionQuery = usePublicCalendarBookingSession(token, sessionInput);
  const acquireHold = useCreatePublicCalendarBookingHold(token);
  const confirmBooking = useConfirmPublicCalendarBooking(token);
  const receipt = confirmBooking.data;
  const callbackQuery = usePublicCalendarBookingCallback(
    token,
    sessionQuery.data?.sessionToken ?? null,
    sessionQuery.data?.channel === "embed" &&
      (receipt?.outcome === "confirmed" || receipt?.outcome === "pending"),
  );
  const [holdIdempotencyKey] = useState(idempotencyKey);
  const [commitIdempotencyKey] = useState(idempotencyKey);
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
  const offering = offeringQuery.data;
  const session = sessionQuery.data;
  const visibleIntakeFields = useMemo(() => {
    if (!offering || !session) return [];
    const enabled = new Set(session.intakeKeys);
    return offering.intakeFields.filter((field) => enabled.has(field.key));
  }, [offering, session]);
  const pending = acquireHold.isPending || confirmBooking.isPending;
  const failure = acquireHold.error ?? confirmBooking.error;

  useEffect(() => {
    if (!callbackQuery.data || !session?.targetOrigin || !callbackState) return;
    window.parent.postMessage(
      { ...callbackQuery.data, state: callbackState },
      session.targetOrigin,
    );
  }, [callbackQuery.data, callbackState, session?.targetOrigin]);

  async function handleSubmit(values: BookingFormValues) {
    if (!offering || !session) return;
    const hold = await acquireHold.mutateAsync({
      start: values.slotStart,
      sessionToken: session.sessionToken,
      idempotencyKey: holdIdempotencyKey,
      consentAccepted: values.consentAccepted,
      honeypot: values.website,
    });
    await confirmBooking.mutateAsync({
      holdId: hold.id,
      sessionToken: session.sessionToken,
      idempotencyKey: commitIdempotencyKey,
      expectedFencingToken: hold.fencingToken,
      expectedRuleVersion: offering.version,
      guestName: values.guestName,
      guestEmail: values.guestEmail,
      intake: values.intake,
      consentAccepted: values.consentAccepted,
      honeypot: values.website,
    });
  }

  function handleConsentChange(checked: boolean | "indeterminate") {
    form.setValue("consentAccepted", checked === true, { shouldValidate: true });
  }

  const loading = offeringQuery.isPending || sessionQuery.isPending;
  const unavailable = offeringQuery.error ?? sessionQuery.error;
  const title = session?.copy.title ?? offering?.title ?? "Book a time";
  const description = session?.copy.description ?? offering?.description;

  return (
    <main className="surface-soft flex min-h-dvh items-start justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-3xl">
        <div
          className="gradient-brand rounded-t-2xl px-6 py-8 text-center text-white shadow-noir"
          style={session?.branding.primaryColor ? { background: session.branding.primaryColor } : undefined}
        >
          {session?.branding.logoUrl ? (
            <Image
              src={session.branding.logoUrl}
              alt={session.branding.displayName ?? "Booking page logo"}
              width={64}
              height={64}
              unoptimized
              className="mx-auto mb-3 size-16 rounded-xl object-contain"
            />
          ) : (
            <CalendarCheck2 className="mx-auto h-9 w-9" aria-hidden="true" />
          )}
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mx-auto mt-2 max-w-xl text-sm text-white/90">{description}</p>}
        </div>

        <Card className="rounded-t-none border-t-0 px-4 py-6 shadow-noir sm:px-7">
          {loading && (
            <div className="flex min-h-64 items-center justify-center" aria-label="Loading booking page">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}

          {unavailable && (
            <div className="space-y-2 py-14 text-center" role="alert">
              <p className="text-lg font-semibold text-foreground">This booking page is unavailable</p>
              <p className="text-sm text-muted-foreground">
                {getErrorMessage(unavailable) || "Ask the organizer for a new booking link."}
              </p>
            </div>
          )}

          {offering && session && !receipt && (
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
                  <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2" role="radiogroup" aria-label="Available times">
                    {offering.slots.map((slot) => (
                      <label key={slot.start} className="flex cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                        <input
                          type="radio"
                          value={slot.start}
                          className="size-4 accent-primary"
                          {...form.register("slotStart")}
                        />
                        <span className="text-sm font-medium text-foreground">
                          {format(new Date(slot.start), "EEE, MMM d · p")}
                        </span>
                      </label>
                    ))}
                  </div>
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
                          {...form.register(`intake.${field.key}`)}
                        />
                      ) : field.type === "select" ? (
                        <select
                          id={`intake-${field.key}`}
                          required={field.required}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          {...form.register(`intake.${field.key}`)}
                        >
                          <option value="">Choose an option</option>
                          {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : (
                        <Input
                          id={`intake-${field.key}`}
                          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                          required={field.required}
                          {...form.register(`intake.${field.key}`)}
                        />
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
                    {session.copy.consentLabel ?? "I agree that my details may be used to arrange this booking."}
                  </Label>
                </div>
              )}

              {failure && (
                <p className="text-sm text-destructive" role="alert">
                  {getErrorMessage(failure) || "The booking could not be completed. Try again."}
                </p>
              )}

              <LoadingButton
                type="submit"
                className="w-full"
                isPending={pending}
                loadingText="Confirming…"
                disabled={offering.slots.length === 0 || (session.consentRequired && !form.watch("consentAccepted"))}
              >
                Confirm booking
              </LoadingButton>
            </form>
          )}

          {receipt && (
            <div className="space-y-4 py-12 text-center" aria-live="polite">
              <ShieldCheck className="mx-auto size-10 text-success" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-foreground">
                {receipt.outcome === "confirmed" ? "Your booking is confirmed" :
                  receipt.outcome === "pending" ? "Your booking request was received" :
                    "Your booking needs attention"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(new Date(receipt.startAt), "PPPP 'at' p")} · {offering?.timeZone ?? "Local time"}
              </p>
              {receipt.reasonCode && <p className="text-sm text-muted-foreground">{receipt.reasonCode.replaceAll("_", " ")}</p>}
            </div>
          )}

          {session?.branding.showPoweredBy && (
            <p className="mt-8 text-center text-xs text-muted-foreground">Scheduled with StreamlineOS</p>
          )}
        </Card>
      </div>
    </main>
  );
}
