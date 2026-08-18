import type { BadgeTone } from "@/components/ui/semantic-badge";
import type {
  EngagementStatus,
  WorkerEngagement,
  WorkerType,
} from "@/types/directory/workers";

export const WORKER_TYPE_OPTIONS: { value: WorkerType; label: string }[] = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "INTERN", label: "Intern" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "AGENCY", label: "Agency" },
  { value: "FREELANCER", label: "Freelancer" },
];

export const ENGAGEMENT_STATUS_TONE: Record<EngagementStatus, BadgeTone> = {
  PLANNED: "info",
  ACTIVE: "success",
  COMPLETED: "neutral",
  TERMINATED: "danger",
  CANCELLED: "warning",
};

export function getEngagementStatusLabel(status: EngagementStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function getWorkerTypeLabel(workerType: WorkerType): string {
  return (
    WORKER_TYPE_OPTIONS.find((option) => option.value === workerType)?.label ??
    workerType
  );
}

export function formatWorkerEngagementDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function getWorkerEngagementPeriodLabel(
  engagement: WorkerEngagement,
): string {
  const startDate = formatWorkerEngagementDate(engagement.startsOn);
  if (!engagement.endsOn) return `${startDate} â€“ ongoing`;
  return `${startDate} â€“ ${formatWorkerEngagementDate(engagement.endsOn)}`;
}
