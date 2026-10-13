"use client";

import { CalendarCheck2, Loader2 } from "lucide-react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
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
    <main className="surface-soft flex min-h-dvh items-start justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-3xl">
        <div
          className="gradient-brand rounded-t-2xl px-6 py-8 text-center text-white shadow-noir"
          style={session?.branding.primaryColor
            ? { background: session.branding.primaryColor }
            : undefined}
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
          {description && (
            <p className="mx-auto mt-2 max-w-xl text-sm text-white/90">{description}</p>
          )}
        </div>

        <Card className="rounded-t-none border-t-0 px-4 py-6 shadow-noir sm:px-7">
          {loading && (
            <div
              className="flex min-h-64 items-center justify-center"
              aria-label="Loading booking page"
            >
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
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

          {session?.branding.showPoweredBy && (
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Scheduled with StreamlineOS
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}
