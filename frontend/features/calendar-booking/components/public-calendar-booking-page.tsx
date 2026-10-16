"use client";

import { CalendarDays, Link2Off } from "lucide-react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePublicCalendarBookingOffering,
  usePublicCalendarBookingSession,
} from "@/hooks/api/calendar-booking-public";
import { PublicCalendarBookingForm } from "./public-calendar-booking-form";
import { publicBookingCopy, publicBookingUiLocale } from "../lib/public-booking-copy";

function queryValue(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim();
  return value ? value.slice(0, 160) : null;
}

function referringDomain(referrer: string): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.hostname.length <= 253 ? url.hostname : null;
  } catch {
    return null;
  }
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
    referrerDomain: typeof document === "undefined" ? null : referringDomain(document.referrer),
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
  const unavailable = offeringQuery.isError || sessionQuery.isError;
  const offering = unavailable ? undefined : offeringQuery.data;
  const session = unavailable ? undefined : sessionQuery.data;
  const uiLocale = publicBookingUiLocale(session?.locale ?? locale);
  const copy = publicBookingCopy(uiLocale);
  const loading = offeringQuery.isPending || sessionQuery.isPending;
  const title = session?.copy.title ?? offering?.title ?? copy.defaultTitle;
  const description = session?.copy.description ?? offering?.description;

  return (
    <main lang={uiLocale} className="flex min-h-dvh justify-center bg-background px-4 py-6 text-foreground sm:px-6 sm:py-12">
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
              {session?.branding.displayName ? <>{copy.brand} <span lang={session.locale}>{session.branding.displayName}</span></> : copy.platform}
            </p>
            <h1 lang={session?.copy.title ? session.locale : undefined} className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            {description && <p lang={session?.copy.description ? session.locale : undefined} className="text-sm text-muted-foreground">{description}</p>}
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

          {unavailable && !loading && (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center sm:py-14" role="alert">
              <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-surface-inset text-muted-foreground dark:border-background">
                <Link2Off className="size-6" aria-hidden="true" />
              </span>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.unavailableTitle}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {copy.unavailableDescription}
                </p>
              </div>
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
            {copy.poweredBy}
          </footer>
        )}
      </Card>
    </main>
  );
}
