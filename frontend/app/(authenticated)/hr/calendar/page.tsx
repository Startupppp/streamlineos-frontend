"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { HrMonthCalendar } from "@/features/hr/helpdesk/hr-month-calendar";

export default function HrCalendarPage() {
  return (
    <PageWrapper
      title="HR Calendar"
      subtitle="Holidays, leaves, reviews, training, and more in one view"
    >
      <HrMonthCalendar />
    </PageWrapper>
  );
}
