import type { NamedUser } from "@/lib/person-display";
import type { ApprovalStatus } from "@/types/projects";

const OWNERS: Record<string, NamedUser> = {
  user_priya: { firstName: "Priya", lastName: "Nair" },
  user_daniel: { firstName: "Daniel", lastName: "Okafor" },
};

export function ownerOf(userId: string | null): NamedUser | null {
  return userId ? (OWNERS[userId] ?? null) : null;
}

export function memberName(userId: string | null): string {
  const owner = ownerOf(userId);
  if (!owner) return "Unassigned";
  return `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim();
}

export function approvalMemberName(membershipId: number | null): string {
  return membershipId == null ? "Unassigned" : `Member ${membershipId}`;
}

const APPROVAL_STATUS_VALUES: ApprovalStatus[] = [
  "requested",
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "escalated",
  "cancelled",
];

export function toApprovalStatus(s: string): ApprovalStatus {
  return APPROVAL_STATUS_VALUES.find((v) => v === s) ?? "pending";
}
