"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { describeReportingWarnings } from "@/components/hr/reporting-lines/reporting-line-warnings";
import { AppSheet } from "@/components/shared/app-sheet";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportingRequestStatusBadge } from "@/components/hr/reporting-lines/reporting-status-badge";
import { describeManager } from "@/components/hr/reporting-lines/manager-candidate-picker";
import {
  useReportingManagerRequest,
  useReviewReportingManagerRequest,
} from "@/hooks/api/hr/reporting-manager-requests";
import type { HrReportingManagerRequest } from "@/hooks/api/hr/reporting-manager-requests-schema";
import type { ManagerRef } from "@/hooks/api/hr/reporting-lines-schema";
import { isApiError } from "@/lib/api-envelope";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { ReviewDecisionFormFields } from "./review-decision-form-fields";
import {
  decisionToast,
  reviewDecisionSchema,
  toReviewPayload,
  type ReviewDecisionInput,
  type ReviewDecisionValues,
} from "./review-decision-schema";

const TITLE = "Review reporting-manager request";
const DESCRIPTION = "An employee asked HR to check who they report to. Nothing changes until you record a decision.";

export function isOpenRequest(status: HrReportingManagerRequest["status"]): boolean {
  return status === "PENDING" || status === "MORE_INFO_REQUIRED";
}

function PersonLine({ label, person, empty }: { label: string; person: ManagerRef | null; empty: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-dense font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">
        {person ? (
          <>
            <span className="font-medium">{person.name}</span>
            <span className="block text-dense text-muted-foreground">{describeManager(person)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{empty}</span>
        )}
      </dd>
    </div>
  );
}

export function RequestSummary({ request }: { request: HrReportingManagerRequest }) {
  return (
    <dl className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <PersonLine label="Employee" person={request.employee} empty="Unknown employee" />
        <ReportingRequestStatusBadge status={request.status} />
      </div>
      <PersonLine label="Current primary manager" person={request.currentManager} empty="No manager on record" />
      <PersonLine label="Suggested manager" person={request.suggestedManager} empty="None suggested" />
      <div className="flex flex-col gap-0.5">
        <dt className="text-dense font-medium text-muted-foreground">Employee&apos;s reason</dt>
        <dd className="whitespace-pre-wrap text-sm">{request.employeeReason}</dd>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-dense text-muted-foreground">
        <span>
          Submitted <span className="font-mono">{formatShortDate(request.createdAt)}</span>
        </span>
        {request.requestedEffectiveFrom ? (
          <span>
            Requested from <span className="font-mono">{formatShortDate(request.requestedEffectiveFrom)}</span>
          </span>
        ) : null}
      </div>
      {request.reviewReason ? (
        <div className="flex flex-col gap-0.5">
          <dt className="text-dense font-medium text-muted-foreground">Reviewer&apos;s reason</dt>
          <dd className="whitespace-pre-wrap text-sm">{request.reviewReason}</dd>
        </div>
      ) : null}
    </dl>
  );
}

interface ReportingRequestReviewSheetProps {
  requestId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function ReportingRequestReviewSheet({ requestId, onOpenChange }: ReportingRequestReviewSheetProps) {
  const { data: request, isLoading, isError, error, refetch } = useReportingManagerRequest(requestId);
  const review = useReviewReportingManagerRequest();
  const open = requestId !== null;

  function handleRetry() {
    void refetch();
  }

  function handleSubmit(values: ReviewDecisionValues) {
    if (!request) return;
    review.mutate(
      { requestId: request.requestId, ...toReviewPayload(values) },
      {
        onSuccess: (result) => {
          toast.success(decisionToast(values.decision, request.employee.name));
          for (const sentence of describeReportingWarnings(result.warnings)) toast.warning(sentence);
          onOpenChange(false);
        },
        onError: (mutationError) => {
          if (isApiError(mutationError) && mutationError.status === 409) {
            toast.error("This request changed since you opened it. It has been reloaded.");
            void refetch();
            return;
          }
          toast.error(getErrorMessage(mutationError));
        },
      },
    );
  }

  if (!request || !isOpenRequest(request.status)) {
    return (
      <AppSheet open={open} onOpenChange={onOpenChange} title={TITLE} description={DESCRIPTION}>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <ErrorState compact title="Couldn't load this request" description={getErrorMessage(error)} onRetry={handleRetry} />
        ) : request ? (
          <RequestSummary request={request} />
        ) : null}
      </AppSheet>
    );
  }

  const defaultValues: ReviewDecisionInput = {
    decision: "APPROVE",
    managerUserId: request.suggestedManager?.userId ?? "",
    effectiveFrom: request.requestedEffectiveFrom ?? "",
    reviewReason: "",
  };

  return (
    <EntityFormSheet<ReviewDecisionInput, ReviewDecisionValues>
      key={request.requestId}
      open={open}
      onOpenChange={onOpenChange}
      title={TITLE}
      description={DESCRIPTION}
      resolver={zodResolver(reviewDecisionSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={review.isPending}
      submitLabel="Record decision"
    >
      {(form) => (
        <>
          <RequestSummary request={request} />
          <ReviewDecisionFormFields form={form} request={request} />
        </>
      )}
    </EntityFormSheet>
  );
}
