export const MILESTONE_STATUSES = ["PENDING", "ACHIEVED", "MISSED"] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export function toMilestoneStatus(value: string | null | undefined): MilestoneStatus {
  return MILESTONE_STATUSES.find((s) => s === value) ?? "PENDING";
}

export function toMilestoneTargetDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
