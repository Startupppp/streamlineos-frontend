import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { CalendarWorkspace } from "@/features/calendar/calendar-workspace";
import { requireSession } from "@/lib/rbac/require-permission";
import { prefetchCalendarSources } from "@/lib/prefetch/calendar";
import CalendarLoading from "./loading";

export const metadata: Metadata = { title: "Calendar" };

async function CalendarHydrated() {
  await requireSession();
  const state = await prefetchCalendarSources();
  return (
    <HydrationBoundary state={state}>
      <CalendarWorkspace />
    </HydrationBoundary>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarLoading />}>
      <CalendarHydrated />
    </Suspense>
  );
}
