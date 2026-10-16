"use client";

import { CalendarDays } from "lucide-react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePublicCalendarBookingOffering,
  usePublicCalendarBookingSession,
} from "@/hooks/api/calendar-booking-public";
import { getErrorMessage } from "@/lib/get-error-message";
import { PublicCalendarBookingForm } from "./public-calendar-booking-form";

function queryValue(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim();
  return value ? value.slice(0, 160) : null;
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
  const offering = offeringQuery.data;
  const session = sessionQuery.data;
  const loading = offeringQuery.isPending || sessionQuery.isPending;
  const unavailable = offeringQuery.error ?? sessionQuery.error;
  const title = session?.copy.title ?? offering?.title ?? "Book a time";
  const description = session?.copy.description ?? offering?.description;

  return (
    <main lang={session?.locale} className="flex min-h-dvh justify-center bg-background px-4 py-6 text-foreground sm:px-6 sm:py-12">
      <Card className="h-fit w-full max-w-2xl gap-0 overflow-hidden rounded-xl border-border bg-card py-0 shadow-sm">
        <div
          aria-hidden="true"
          className="h-1 bg-primary"
          style={session?.branding.primaryColor ? { backgroundColor: session.branding.primaryColor } : undefined}
        />
        <header className="flex items-start gap-4 border-b border-border px-5 py-6 sm:px-8 sm:py-7">
          {session?.branding.logoUrl ? (
            <Image
              src={session.branding.logoUrl}
              alt={session.branding.displayName ?? "Booking page logo"}
              width={48}
              height={48}
              unoptimized
              className="size-12 shrink-0 rounded-xl border border-border bg-background object-contain p-1"
            />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CalendarDays className="size-6" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {session?.branding.displayName ? `Booking with ${session.branding.displayName}` : "StreamlineOS Calendar"}
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </header>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          {loading && (
            <div
              className="space-y-5 py-4"
              aria-label="Loading booking page"
            >
              <Skeleton className="h-6 w-40" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {unavailable && (
            <div className="space-y-2 py-14 text-center" role="alert">
              <p className="text-lg font-semibold text-foreground">
                This booking page is unavailable
              </p>
              <p className="text-sm text-muted-foreground">
                {getErrorMessage(unavailable) || "Ask the organizer for a new booking link."}
              </p>
            </div>
          )}

          {offering && session && (
            <PublicCalendarBookingForm
              token={token}
              offering={offering}
              session={session}
              callbackState={callbackState}
            />
          )}

        </div>
        {session?.branding.showPoweredBy && (
          <footer className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground sm:px-8">
            Scheduled with StreamlineOS
          </footer>
        )}
      </Card>
    </main>
  );
}
