"use client";

import { useHrAnalytics } from "@/hooks/api/hr/analytics";
import { useHrDocumentStats } from "@/hooks/api/hr/documents";
import { useLeaveTypesAdmin } from "@/hooks/api/hr/leaves";
import { useHrShifts } from "@/hooks/api/hr/shifts";
import type { HrSetupSignals } from "./hr-start-here";

export function useHrSetupSignals(): HrSetupSignals {
  const analytics = useHrAnalytics();
  const leaveTypes = useLeaveTypesAdmin();
  const shifts = useHrShifts();
  const documents = useHrDocumentStats();

  return {
    people: analytics.data ? analytics.data.headcount.total : null,
    leaveTypes: leaveTypes.data ? leaveTypes.data.length : null,
    shifts: shifts.data ? shifts.data.length : null,
    documents: documents.data ? documents.data.total : null,
  };
}
