import type { Metadata } from "next";
import { Suspense } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CalendarView } from "@/features/calendar/calendar-view";
import { requireSession } from "@/lib/rbac/require-permission";

export const metadata: Metadata = { title: "Calendar | StreamlineOS" };

export default async function CalendarPage() {
  await requireSession();
  return (
    <PageWrapper title="Calendar" noInternalScroll>
      <Suspense>
        <CalendarView />
      </Suspense>
    </PageWrapper>
  );
}
