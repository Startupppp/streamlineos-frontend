import type {
  EngagementStatus,
  WorkerEngagement,
} from "@/types/directory/workers";
import {
  EMPTY_WORKER_ENGAGEMENT_FORM_VALUES,
  type WorkerEngagementFormValues,
} from "./worker-engagement-form-schema";

const NON_BLOCKING_ENGAGEMENT_STATUSES = new Set<EngagementStatus>([
  "COMPLETED",
  "TERMINATED",
  "CANCELLED",
]);

export function getWorkerEngagementDefaults(
  engagement?: WorkerEngagement | null,
): WorkerEngagementFormValues {
  if (!engagement) return EMPTY_WORKER_ENGAGEMENT_FORM_VALUES;

  return {
    startsOn: engagement.startsOn,
    endsOn: engagement.endsOn ?? "",
    workerType: engagement.workerType,
    isPrimary: engagement.isPrimary,
    designation: engagement.designation ?? "",
  };
}

export function findConflictingWorkerEngagement(
  period: { startsOn: string; endsOn?: string | null },
  engagements: WorkerEngagement[],
  excludedWorkerEngagementId?: string,
): WorkerEngagement | undefined {
  const periodEnd = period.endsOn || "9999-12-31";
  return engagements.find((engagement) => {
    if (engagement.workerEngagementId === excludedWorkerEngagementId)
      return false;
    if (NON_BLOCKING_ENGAGEMENT_STATUSES.has(engagement.status)) return false;
    const existingPeriodEnd = engagement.endsOn || "9999-12-31";
    return (
      period.startsOn < existingPeriodEnd && engagement.startsOn < periodEnd
    );
  });
}
