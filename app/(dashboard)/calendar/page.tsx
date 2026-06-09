import type { Metadata } from "next";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CalendarView } from "@/features/calendar/calendar-view";

export const metadata: Metadata = { title: "Calendar | StreamlineOS" };

export default function CalendarPage() {
  return (
    <PageWrapper title="Calendar" noInternalScroll>
      <CalendarView />
    </PageWrapper>
  );
}
