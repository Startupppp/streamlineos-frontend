import type { TimesheetPeriod } from "@/features/timesheets/types";

export type ApprovalStanding =
  | "self"
  | "assigned"
  | "unassigned"
  | "delegate"
  | "owner-override";

export interface ApprovalSubject {
  userId: string;
  currentApproverId: string | null;
}

export function approvalSubjectOf(
  period: Pick<TimesheetPeriod, "userMembershipId" | "currentApproverMembershipId">,
): ApprovalSubject {
  return {
    userId: period.userMembershipId === null ? "" : String(period.userMembershipId),
    currentApproverId:
      period.currentApproverMembershipId === null
        ? null
        : String(period.currentApproverMembershipId),
  };
}

export function approvalStanding(
  viewerId: string | null | undefined,
  isOrgOwner: boolean,
  period: ApprovalSubject,
): ApprovalStanding {
  if (!viewerId) return "unassigned";
  if (period.userId === viewerId && !isOrgOwner) return "self";

  const approverId = period.currentApproverId;
  if (isOrgOwner) {
    if (approverId && approverId !== viewerId) return "owner-override";
    return approverId ? "assigned" : "unassigned";
  }

  if (!approverId) return "unassigned";
  if (approverId === viewerId) return "assigned";
  return "delegate";
}

export interface BorrowedAuthority {
  standing: "delegate" | "owner-override";
  count: number;
  approverIds: string[];
}

export function summarizeBorrowedAuthority(
  viewerId: string | null | undefined,
  isOrgOwner: boolean,
  periods: readonly TimesheetPeriod[],
): BorrowedAuthority | null {
  const approverIds = new Set<string>();
  let count = 0;

  for (const period of periods) {
    const subject = approvalSubjectOf(period);
    const standing = approvalStanding(viewerId, isOrgOwner, subject);
    if (standing !== "delegate" && standing !== "owner-override") continue;
    count += 1;
    if (subject.currentApproverId) approverIds.add(subject.currentApproverId);
  }

  if (count === 0) return null;
  return {
    standing: isOrgOwner ? "owner-override" : "delegate",
    count,
    approverIds: [...approverIds],
  };
}
