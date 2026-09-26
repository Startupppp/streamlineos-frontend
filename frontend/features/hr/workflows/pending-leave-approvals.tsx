"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useHrLeaveApprovals } from "@/hooks/api/hr";
import { getUserDisplayName } from "@/lib/person-display";
import {
  approvalRouteTargetLabel,
  formatDateRange,
} from "@/features/hr/workflows/leave-approval-row-format";
import {
  LeaveDecisionButtons,
  useLeaveDecisions,
} from "@/features/hr/leaves/components/leave-decision-controls";

/**
 * HRMS-E2E-013. `/hr/approvals` said "No pending approvals. You are all caught
 * up." while Leave > Approvals listed the same organisation's pending requests,
 * and the Leave nav badge showed a non-zero count beside it.
 *
 * The two screens were never reading the same thing. `/hr/approvals` reads the
 * durable workflow engine's inbox — `GET /hr/workflows/instances/inbox`, gated
 * on `hr:workflows:approve`. A leave request is not a workflow instance: it is a
 * row in `leave_requests`, routed by the approver resolver to a holder of
 * `hr:leaves:approve`, and it reaches `GET /hr/leaves/team`. Two tables, two
 * permission keys, one nav item claiming to be the queue for both — and the
 * routing text a member sees says "Routed to the HR approvals queue", which is
 * the name of the page that could not show it.
 *
 * Decision #6's recommended default is one source of truth: what is routed to
 * the HR approvals queue must appear on `/hr/approvals`, and Leave > Approvals
 * may remain a filtered view of the same data. This is that, done the safe way
 * round — the Approvals page reads the leave endpoint Leave > Approvals already
 * uses, rather than leave approval being pushed through the workflow engine.
 * PROVISIONAL until Joseph confirms #6, and deliberately additive: nothing about
 * Leave > Approvals changes, so nobody using it loses their surface.
 */
export function PendingLeaveApprovals() {
  const { data, isLoading, isError } = useHrLeaveApprovals({ status: "PENDING", limit: 50 });
  const { data: session } = useSession();
  // V-044. The same hook Leave > Approvals uses, so approving here runs the
  // same mutation through the same dialogs.
  const { onProcess, processingId, decisionDialogs } = useLeaveDecisions();

  const pending = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.data),
    [data],
  );

  if (isLoading)
    return (
      <div className="space-y-2 px-4 py-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );

  // A failure here is not the page's failure: the workflow inbox beside it may
  // have loaded. Saying nothing is better than replacing a working list with an
  // error, and the Leave surface reports its own.
  if (isError || pending.length === 0) return null;

  return (
    <section aria-labelledby="pending-leave-heading" className="border-b border-border">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <h3 id="pending-leave-heading" className="text-label font-semibold text-foreground">
          Leave requests
        </h3>
        <Badge variant="secondary" className="text-micro">
          {pending.length}
        </Badge>
      </div>
      <ul className="divide-y divide-border/60">
        {pending.map((request) => {
          const routedTo = approvalRouteTargetLabel(request.approvalRoute);
          return (
            <li
              key={request.id}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <Link
                href="/hr/leaves"
                className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="truncate text-sm font-medium text-foreground">
                  {getUserDisplayName(request.user)}
                </p>
                <p className="truncate text-dense text-muted-foreground">
                  {request.leaveType?.name ?? "Leave"} ·{" "}
                  {formatDateRange(request.startDate, request.endDate)}
                  {request.isHalfDay ? " (half day)" : ""}
                </p>
                {routedTo ? (
                  <p className="truncate text-dense text-muted-foreground">
                    {routedTo}
                  </p>
                ) : null}
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <LeaveDecisionButtons
                  request={request}
                  currentUserId={session?.user?.id}
                  processingId={processingId}
                  onProcess={onProcess}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {decisionDialogs}
    </section>
  );
}
