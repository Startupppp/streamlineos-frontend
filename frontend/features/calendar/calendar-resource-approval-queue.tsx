"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCursorPager } from "@/components/ui/table-pagination";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  usePendingCalendarBookingAllocations,
  useResolveCalendarBookingAllocation,
} from "@/hooks/api/calendar/booking-resources";
import type { PendingBookingAllocation } from "@/hooks/api/calendar/booking-resources-schema";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { SURFACE_EMPTY } from "@/lib/ui-surface-chrome";

function ApprovalRow({ allocation }: { allocation: PendingBookingAllocation }) {
  const resolve = useResolveCalendarBookingAllocation(allocation.bookingId);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const hasReceipt = Boolean(allocation.approvalReceiptId?.trim());
  const canReject = hasReceipt || allocation.sourceKey === "hr.asset";

  async function decide(outcome: "approved" | "rejected") {
    const ownerReceiptId =
      allocation.approvalReceiptId ||
      (allocation.sourceKey === "hr.asset"
        ? `resource:${allocation.resourceId}:${allocation.version}`
        : null);
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

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{allocation.resourceName}</span>
        <span className="capitalize">{allocation.state}</span>
      </div>
      <p className="text-muted-foreground">
        {new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(allocation.startAt))}
      </p>
      {allocation.reasonCode ? (
        <p className="text-muted-foreground">
          {allocation.reasonCode.replaceAll("_", " ")}
        </p>
      ) : null}
      {error && !rejectOpen ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={resolve.isPending || !allocation.canApprove || !hasReceipt}
          onClick={() => void decide("approved")}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={resolve.isPending || !canReject}
          onClick={() => {
            setError(null);
            setRejectOpen(true);
          }}
        >
          Reject
        </Button>
        <ConfirmDialog
          title="Reject resource request?"
          description="This declines the booking that requires this resource."
          confirmLabel="Reject booking"
          destructive
          isPending={resolve.isPending}
          keepOpenOnConfirm
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          onConfirm={() => void decide("rejected")}
          content={
            error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}

export function CalendarResourceApprovalQueue({ onBack }: { onBack?: () => void }) {
  const { data: session } = useSession();
  const pager = useCursorPager(`${session?.orgId ?? ""}:${session?.user?.id ?? ""}`);
  const pending = usePendingCalendarBookingAllocations(pager.cursor ?? null);
  const items = pending.data?.items ?? [];
  const queryState = usePageState({
    isLoading: pending.access.pending || pending.isPending,
    isError: pending.access.unavailable || pending.isError,
    error: pending.error,
    isEmpty: pending.access.allowed && !pending.isPending && items.length === 0,
  });
  const resolution: PageStateResolution = pending.access.denied
    ? { kind: "denied", permission: "calendar:admin:manage" }
    : queryState;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {onBack ? (
        <Button variant="outline" onClick={onBack} className="self-start">
          Back to booking pages
        </Button>
      ) : null}
      <PageState
        resolution={resolution}
        onRetry={() => void pending.refetch()}
        className="min-h-0 flex-1"
        loading={
          <div className="space-y-2" role="status" aria-label="Loading resource approvals">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="space-y-3 rounded-md border p-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        }
        empty={
          <EmptyState
            className={SURFACE_EMPTY}
            illustrationPreset="calendar"
            title="No resource approvals waiting"
            description="When rooms or source-owned equipment need an owner decision, they will show up here."
          />
        }
      >
        <div className="space-y-2">
          {items.map((allocation) => (
            <ApprovalRow
              key={`${allocation.bookingId}:${allocation.resourceId}`}
              allocation={allocation}
            />
          ))}
        </div>
        {pager.hasPrevious || pending.data?.nextCursor ? (
          <CursorPageControls
            page={pager.pageNumber}
            hasNext={Boolean(pending.data?.nextCursor)}
            disabled={pending.isFetching}
            onPrevious={pager.goPrevious}
            onNext={() => pager.goNext(pending.data?.nextCursor)}
          />
        ) : null}
      </PageState>
    </div>
  );
}
