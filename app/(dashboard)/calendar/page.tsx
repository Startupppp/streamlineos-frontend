import type { Metadata } from "next";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CalendarView } from "@/features/calendar/calendar-view";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata: Metadata = { title: "Calendar | StreamlineOS" };

export default async function CalendarPage() {
  await requirePermission("self:attendance");
  return (
    <PageWrapper title="Calendar" noInternalScroll>
      <CalendarView />
    </PageWrapper>
  );
}
