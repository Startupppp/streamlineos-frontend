"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { usePendingCalendarBookingAllocations, useResolveCalendarBookingAllocation } from "@/hooks/api/calendar/booking-resources";
import type { PendingBookingAllocation } from "@/hooks/api/calendar/booking-resources-schema";
import { getErrorMessage } from "@/lib/get-error-message";

function ApprovalRow({ allocation }: { allocation: PendingBookingAllocation }) {
  const resolve = useResolveCalendarBookingAllocation(allocation.bookingId);
  const [error, setError] = useState<string | null>(null);

  async function decide(outcome: "approved" | "rejected") {
    if (outcome === "rejected" && !window.confirm("Reject this resource request and decline the booking?")) return;
    try {
      await resolve.mutateAsync({
        resourceId: allocation.resourceId,
        expectedVersion: allocation.version,
        outcome,
        ownerReceiptId: allocation.approvalReceiptId ?? `resource:${allocation.resourceId}:${allocation.version}`,
        ...(outcome === "rejected" ? { reasonCode: "resource_owner_rejected" } : {}),
      });
      setError(null);
      toast.success(outcome === "approved" ? "Resource approved" : "Resource rejected");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return <div className="space-y-2 rounded-md border p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">{allocation.resourceName}</span><span className="capitalize">{allocation.state}</span></div><p className="text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(allocation.startAt))}</p>{allocation.reasonCode ? <p className="text-muted-foreground">{allocation.reasonCode.replaceAll("_", " ")}</p> : null}{error ? <p role="alert" className="text-destructive">{error}</p> : null}<div className="flex gap-2"><Button size="sm" disabled={resolve.isPending || !allocation.canApprove || !allocation.approvalReceiptId} onClick={() => void decide("approved")}>Approve</Button><Button size="sm" variant="outline" disabled={resolve.isPending} onClick={() => void decide("rejected")}>Reject</Button></div></div>;
}

export function CalendarResourceApprovalQueue({ onBack }: { onBack: () => void }) {
  const pending = usePendingCalendarBookingAllocations();
  return <div className="space-y-4"><Button variant="outline" onClick={onBack}>Back to booking pages</Button><div><h3 className="font-medium">Resource approvals</h3><p className="text-sm text-muted-foreground">Review rooms and source-owned equipment awaiting an owner decision.</p></div>{pending.access.denied ? <p className="text-sm text-muted-foreground">Resource approvals are unavailable to this account.</p> : pending.access.unavailable || pending.isError ? <ErrorState title="Resource approvals unavailable" error={pending.error} onRetry={() => void pending.refetch()} /> : pending.access.pending || pending.isPending ? <p role="status">Loading resource approvals…</p> : pending.data?.length ? <div className="space-y-2">{pending.data.map((allocation) => <ApprovalRow key={`${allocation.bookingId}:${allocation.resourceId}`} allocation={allocation} />)}</div> : <p className="text-sm text-muted-foreground">No resource approvals are waiting.</p>}</div>;
}
