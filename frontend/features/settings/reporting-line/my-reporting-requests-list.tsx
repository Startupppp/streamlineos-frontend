"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { ReportingRequestStatusBadge } from "@/components/hr/reporting-lines/reporting-status-badge";
import {
  useCancelReportingManagerRequest,
  useMyReportingManagerRequests,
} from "@/hooks/api/hr/my-reporting-line";
import type { MyReportingManagerRequest } from "@/hooks/api/hr/reporting-manager-requests-schema";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { RespondDialog } from "./respond-dialog";

export function isActiveRequest(request: Pick<MyReportingManagerRequest, "status">): boolean {
  return request.status === "PENDING" || request.status === "MORE_INFO_REQUIRED";
}

interface RequestItemProps {
  request: MyReportingManagerRequest;
  onCancel: (request: MyReportingManagerRequest) => void;
  onRespond: (request: MyReportingManagerRequest) => void;
}

function RequestItem({ request, onCancel, onRespond }: RequestItemProps) {
  function handleCancel() {
    onCancel(request);
  }

  function handleRespond() {
    onRespond(request);
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border/60 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportingRequestStatusBadge status={request.status} />
        <span className="font-mono text-dense text-muted-foreground">{formatShortDate(request.createdAt)}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm">{request.employeeReason}</p>
      {request.suggestedManager ? (
        <p className="text-dense text-muted-foreground">Suggested: {request.suggestedManager.name}</p>
      ) : null}
      {request.reviewReason ? (
        <p className="whitespace-pre-wrap text-dense">
          <span className="font-medium">HR: </span>
          {request.reviewReason}
        </p>
      ) : null}
      {isActiveRequest(request) ? (
        <div className="flex flex-wrap gap-2">
          {request.status === "MORE_INFO_REQUIRED" ? (
            <Button type="button" size="sm" onClick={handleRespond}>
              Respond
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={handleCancel}>
            Cancel request
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function MyReportingRequestsList() {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useMyReportingManagerRequests();
  const cancel = useCancelReportingManagerRequest();
  const [cancelling, setCancelling] = useState<MyReportingManagerRequest | null>(null);
  const [responding, setResponding] = useState<MyReportingManagerRequest | null>(null);
  const requests = data?.pages.flatMap((page) => page.items) ?? [];

  function handleLoadMore() {
    void fetchNextPage();
  }

  function handleCancelOpenChange(open: boolean) {
    if (!open) setCancelling(null);
  }

  function handleRespondOpenChange(open: boolean) {
    if (!open) setResponding(null);
  }

  function handleConfirmCancel() {
    if (!cancelling) return;
    cancel.mutate(cancelling.requestId, {
      onSuccess: () => {
        toast.success("Cancelled your request");
        setCancelling(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  if (requests.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">Your requests</h3>
      <ul className="flex flex-col gap-2">
        {requests.map((request) => (
          <RequestItem key={request.requestId} request={request} onCancel={setCancelling} onRespond={setResponding} />
        ))}
      </ul>
      <InfiniteScrollSentinel
        hasNextPage={Boolean(hasNextPage)}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={handleLoadMore}
        label="Load older requests"
      />
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={handleCancelOpenChange}
        title="Cancel this request?"
        description="HR will stop reviewing it. You can report the issue again later."
        confirmLabel="Cancel request"
        cancelLabel="Keep request"
        destructive
        isPending={cancel.isPending}
        onConfirm={handleConfirmCancel}
      />
      <RespondDialog
        requestId={responding?.requestId ?? null}
        hrQuestion={responding?.reviewReason ?? null}
        onOpenChange={handleRespondOpenChange}
      />
    </div>
  );
}
