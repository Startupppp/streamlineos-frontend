import { useCan } from "@/hooks/api/access";
import type { ApprovalRoute } from "@/hooks/api/hr/approval-route-schema";

export interface NoApproverFix {
  href: string;
  label: string;
}

type SkipReason = ApprovalRoute["skipped"][number]["reason"];

/** Skip reasons that a reporting-manager assignment resolves. */
const MANAGER_REASONS = new Set<SkipReason>([
  "no-manager",
  "manager-not-in-organization",
  "manager-inactive",
  "manager-has-no-employment",
  "manager-exited",
  "circular",
  "self-reference",
]);

/** Skip reasons that giving someone `hr:leaves:approve` resolves. */
const QUEUE_REASONS = new Set<SkipReason>(["queue-empty", "lacks-permission"]);

/**
 * The screen that fixes an unroutable request, when the viewer can use it
 * (HRMS-E2E-032). The resolver's skip reasons say what failed; the viewer's
 * permissions decide whether a link is offered, so a member never gets a link
 * that ends at Access Denied (FE-55) and keeps the ask-an-admin hint instead.
 */
export function noApproverFix(
  route: ApprovalRoute | undefined,
  can: { canSetManagers: boolean; canAssignApprovers: boolean },
): NoApproverFix | null {
  if (!route || route.rung !== null) return null;
  const reasons = route.skipped.map((skip) => skip.reason);
  if (can.canSetManagers && reasons.some((reason) => MANAGER_REASONS.has(reason)))
    return { href: "/hr/employees/manager-coverage", label: "Set a reporting manager" };
  if (can.canAssignApprovers && reasons.some((reason) => QUEUE_REASONS.has(reason)))
    return { href: "/hr/access", label: "Choose who can approve" };
  return null;
}

export function useNoApproverFix(route: ApprovalRoute | undefined): NoApproverFix | null {
  const canSetManagers = useCan("hr:employees:update");
  const canAssignApprovers = useCan("hr:access:manage");
  return noApproverFix(route, { canSetManagers, canAssignApprovers });
}
