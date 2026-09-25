"use client";

import { useHrAnalytics } from "@/hooks/api/hr/analytics";
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
  const analytics = useHrAnalytics();
  // Leave types are seeded for every org at creation, so counting them marked
  // this step done before anyone configured anything. Policies are not seeded.
  const leavePolicies = useLeavePolicies();
  const shifts = useHrShifts();
  const documents = useHrDocumentStats();

  if ([analytics, leavePolicies, shifts, documents].some((query) => query.isLoading)) {
    return null;
  }

  return {
    people: analytics.data ? analytics.data.headcount.total : null,
    leavePolicies: leavePolicies.data ? leavePolicies.data.length : null,
    shifts: shifts.data ? shifts.data.length : null,
    documents: documents.data ? documents.data.total : null,
  };
}
