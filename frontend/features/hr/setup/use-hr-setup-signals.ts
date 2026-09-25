"use client";

import { useHrEmployeeCounts } from "@/hooks/api/hr/employee-list";
import { useHrDocumentStats } from "@/hooks/api/hr/documents";
import { useLeavePolicies } from "@/hooks/api/hr/leave-policies";
import { useHrShifts } from "@/hooks/api/hr/shifts";
import type { HrSetupSignals } from "./hr-start-here";

/**
 * Returns null until every signal has settled. Rendering mid-load showed each
 * pending signal as "unknown" (an unchecked step with a button), then flipped
 * to ticks once data landed. A query disabled for lack of permission is not
 * loading, so it still resolves to a null signal rather than blocking forever.
 */
export function useHrSetupSignals(): HrSetupSignals | null {
  // Headcount counts every active, verified member — the founder included —
  // so a brand-new org read as "people added" before anyone was. Count active
  // plus invited people and leave out the one account that always exists.
  const employees = useHrEmployeeCounts({});
  // Leave types are seeded for every org at creation, so counting them marked
  // this step done before anyone configured anything. Policies are not seeded.
  const leavePolicies = useLeavePolicies();
  const shifts = useHrShifts();
  const documents = useHrDocumentStats();

  if ([employees, leavePolicies, shifts, documents].some((query) => query.isLoading)) {
    return null;
  }

  return {
    people: employees.data
      ? Math.max(0, employees.data.active + employees.data.pending - 1)
      : null,
    leavePolicies: leavePolicies.data ? leavePolicies.data.length : null,
    shifts: shifts.data ? shifts.data.length : null,
    documents: documents.data ? documents.data.total : null,
  };
}
