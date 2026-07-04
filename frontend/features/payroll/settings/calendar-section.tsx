"use client";

import { useState } from "react";
import { PageSection } from "@/components/ui/page-wrapper";
import { MonthPicker } from "@/features/payroll/shared";
import { CalendarManager } from "@/features/payroll/reports";

function currentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function CalendarSection() {
  const [month, setMonth] = useState<string>(currentYearMonth);

  return (
    <PageSection
      title="Payroll Calendar"
      description="View and manage payroll deadline events for a given month"
      actions={
        <MonthPicker
          value={month}
          onChange={setMonth}
          className="h-8 w-44"
          yearRange={[-1, 1]}
        />
      }
    >
      <CalendarManager month={month} />
    </PageSection>
  );
}
