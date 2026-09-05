import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { CalendarView } from "@/features/calendar/calendar-view";
import { requireSession } from "@/lib/rbac/require-permission";
import { prefetchCalendarSources } from "@/lib/prefetch/calendar";

export const metadata: Metadata = { title: "Calendar | StreamlineOS" };

export default async function CalendarPage() {
  await requireSession();
  const state = await prefetchCalendarSources();
  return (
    <HydrationBoundary state={state}>
      <Suspense>
        <CalendarView />
      </Suspense>
    </HydrationBoundary>
  );
}
