import { toMilestoneStatus } from "@/features/build/milestones/milestone-status";
import type { MilestoneFormValues } from "@/features/build/milestones/milestone-schema";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";
import type { ProjectMilestone } from "@/hooks/api/build/milestones";

export const CONFLICT_EMPTY = "Not set";

export function displayConflictValue(value: unknown): string {
  if (value === null || value === undefined || value === "")
    return CONFLICT_EMPTY;
  return String(value);
}

export function buildMilestoneConflictDiffs(
  values: MilestoneFormValues,
  baseline: ProjectMilestone,
  ownerLabel: (membershipId: number | null) => string,
): TicketConflictFieldDiff[] {
  const pairs: Array<{
    key: string;
    label: string;
    server: unknown;
    pending: unknown;
  }> = [
    {
      key: "name",
      label: "Name",
      server: baseline.name,
      pending: values.name.trim(),
    },
    {
      key: "description",
      label: "Description",
      server: baseline.description ?? null,
      pending: values.description?.trim() || null,
    },
    {
      key: "targetDate",
      label: "Target date",
      server: baseline.targetDate ?? null,
      pending: values.targetDate || null,
    },
    {
      key: "status",
      label: "Status",
      server: toMilestoneStatus(baseline.status),
      pending: values.status,
    },
    {
      key: "ownerMembershipId",
      label: "Owner",
      server: ownerLabel(baseline.ownerMembershipId ?? null),
      pending: ownerLabel(values.ownerMembershipId ?? null),
    },
  ];
  return pairs
    .filter(
      ({ server, pending }) => String(server ?? "") !== String(pending ?? ""),
    )
    .map(({ key, label, server, pending }) => ({
      key,
      label,
      serverValue: displayConflictValue(server),
      pendingValue: displayConflictValue(pending),
    }));
}
