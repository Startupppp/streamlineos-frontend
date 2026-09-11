import type { TimesheetPeriod } from "@/features/timesheets/types";

/**
 * Whose authority the viewer would be using to decide this timesheet.
 *
 * Mirrors `canActOnPeriod` in `timesheets/core/lib/approval-guard.ts`, which
 * is the only place that decides. The backend's branches, in its order:
 * your own timesheet is refused unless you own the org; an org owner may act
 * on anything; with an approver assigned only that approver or someone they
 * have delegated to may act; with none assigned, any holder of the permission
 * may.
 *
 * `delegate` is therefore not a guess about the delegation table — it is the
 * only branch left. A non-owner is looking at a row assigned to someone else,
 * and the backend will accept their decision if and only if that person has
 * delegated to them. The frontend cannot check the table itself:
 * `GET /access/delegations` requires `settings:rbac:manage`, which the
 * delegate of a line manager does not hold.
 */
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

/**
 * The rows on this page the viewer would decide on somebody else's authority.
 *
 * A page can hold both kinds only if the viewer owns the org, and an owner is
 * always an owner — so the two never mix, and `owner-override` wins.
 */
export function summarizeBorrowedAuthority(
  viewerId: string | null | undefined,
  isOrgOwner: boolean,
  periods: readonly TimesheetPeriod[],
): BorrowedAuthority | null {
  const approverIds = new Set<string>();
  let count = 0;

  for (const period of periods) {
    const standing = approvalStanding(viewerId, isOrgOwner, period);
    if (standing !== "delegate" && standing !== "owner-override") continue;
    count += 1;
    if (period.currentApproverId) approverIds.add(period.currentApproverId);
  }

  if (count === 0) return null;
  return {
    standing: isOrgOwner ? "owner-override" : "delegate",
    count,
    approverIds: [...approverIds],
  };
}
