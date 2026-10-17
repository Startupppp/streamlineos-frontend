"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useCursorPager } from "@/components/ui/table-pagination";
import { ErrorState } from "@/components/shared/error-state";
import { usePendingCalendarBookingAllocations, useResolveCalendarBookingAllocation } from "@/hooks/api/calendar/booking-resources";
import type { PendingBookingAllocation } from "@/hooks/api/calendar/booking-resources-schema";
import { getErrorMessage } from "@/lib/get-error-message";

function ApprovalRow({ allocation }: { allocation: PendingBookingAllocation }) {
  const resolve = useResolveCalendarBookingAllocation(allocation.bookingId);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const hasReceipt = Boolean(allocation.approvalReceiptId?.trim());
  const canReject = hasReceipt || allocation.sourceKey === "hr.asset";

  async function decide(outcome: "approved" | "rejected") {
    const ownerReceiptId = allocation.approvalReceiptId ||
      (allocation.sourceKey === "hr.asset" ? `resource:${allocation.resourceId}:${allocation.version}` : null);
    if (!ownerReceiptId) return;
    try {
      await resolve.mutateAsync({
        resourceId: allocation.resourceId,
        expectedVersion: allocation.version,
        outcome,
        ownerReceiptId,
        ...(outcome === "rejected" ? { reasonCode: "resource_owner_rejected" } : {}),
      });
      setError(null);
      if (outcome === "rejected") setRejectOpen(false);
      toast.success(outcome === "approved" ? "Resource approved" : "Resource rejected");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return <div className="space-y-2 rounded-md border p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">{allocation.resourceName}</span><span className="capitalize">{allocation.state}</span></div><p className="text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(allocation.startAt))}</p>{allocation.reasonCode ? <p className="text-muted-foreground">{allocation.reasonCode.replaceAll("_", " ")}</p> : null}{error && !rejectOpen ? <p role="alert" className="text-destructive">{error}</p> : null}<div className="flex gap-2"><Button size="sm" disabled={resolve.isPending || !allocation.canApprove || !hasReceipt} onClick={() => void decide("approved")}>Approve</Button><Button size="sm" variant="outline" disabled={resolve.isPending || !canReject} onClick={() => { setError(null); setRejectOpen(true); }}>Reject</Button><ConfirmDialog title="Reject resource request?" description="This declines the booking that requires this resource." confirmLabel="Reject booking" destructive isPending={resolve.isPending} keepOpenOnConfirm open={rejectOpen} onOpenChange={setRejectOpen} onConfirm={() => void decide("rejected")} content={error ? <p role="alert" className="text-sm text-destructive">{error}</p> : undefined} /></div></div>;
}

export function CalendarResourceApprovalQueue({ onBack }: { onBack?: () => void }) {
  const { data: session } = useSession();
  const pager = useCursorPager(`${session?.orgId ?? ""}:${session?.user?.id ?? ""}`);
  const pending = usePendingCalendarBookingAllocations(pager.cursor ?? null);
  return <div className="space-y-4">{onBack ? <Button variant="outline" onClick={onBack}>Back to booking pages</Button> : null}<div><h3 className="font-medium">Resource approvals</h3><p className="text-sm text-muted-foreground">Review rooms and source-owned equipment awaiting an owner decision.</p></div>{pending.access.denied ? <p className="text-sm text-muted-foreground">Resource approvals are unavailable to this account.</p> : pending.access.unavailable || pending.isError ? <ErrorState title="Resource approvals unavailable" error={pending.error} onRetry={() => void pending.refetch()} /> : pending.access.pending || pending.isPending ? <p role="status">Loading resource approvals…</p> : pending.data?.items.length ? <div className="space-y-2">{pending.data.items.map((allocation) => <ApprovalRow key={`${allocation.bookingId}:${allocation.resourceId}`} allocation={allocation} />)}</div> : <p className="text-sm text-muted-foreground">No resource approvals are waiting on this page.</p>}{pager.hasPrevious || pending.data?.nextCursor ? <CursorPageControls page={pager.pageNumber} hasNext={Boolean(pending.data?.nextCursor)} disabled={pending.isFetching} onPrevious={pager.goPrevious} onNext={() => pager.goNext(pending.data?.nextCursor)} /> : null}</div>;
}
