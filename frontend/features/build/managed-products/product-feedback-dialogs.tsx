"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { CaptureSubmissionSheet } from "./feedback/capture-submission-sheet";
import { FeedbackPane } from "./feedback/feedback-pane";
import { FeedbucketCollectDialog } from "./feedback/feedbucket-collect-dialog";
import { RouteToIntakeDialog } from "./feedback/route-to-intake-dialog";
import { TicketDetailPane } from "@/features/build/ticket-details/ticket-detail-pane";
import { resolveProductFeedbackSubmissionHref } from "./product-feedback-model";
import type { SubmissionRow } from "./product-feedback-columns";
import type { useProductFeedbackFilters } from "./use-product-feedback-filters";
import type { useRouteToIntake } from "./feedback/route-to-intake-dialog";

interface ProductFeedbackDialogsProps {
  managedProductId: number;
  filterState: ReturnType<typeof useProductFeedbackFilters>;
  rows: SubmissionRow[];
  canCapture: boolean;
  canOpenSubmissionDetail: boolean;
  captureOpen: boolean;
  feedbucketOpen: boolean;
  onCaptureOpenChange: (open: boolean) => void;
  onFeedbucketOpenChange: (open: boolean) => void;
  intakeRouting: ReturnType<typeof useRouteToIntake>;
}

export function ProductFeedbackDialogs({
  managedProductId,
  filterState,
  rows,
  canCapture,
  canOpenSubmissionDetail,
  captureOpen,
  feedbucketOpen,
  onCaptureOpenChange,
  onFeedbucketOpenChange,
  intakeRouting,
}: ProductFeedbackDialogsProps) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const {
    listFilters,
    paneSubmissionId,
    paneTicketId,
    paneTicketProjectId,
    handleOpenTicket,
    handleCloseTicketPane,
  } = filterState;

  const handleCloseFeedbackPane = useCallback(
    (open: boolean) => { if (!open) listFilters.setValue("submission", "all"); },
    [listFilters],
  );
  const paneRow = useMemo(
    () => rows.find((row) => row.id === paneSubmissionId) ?? null,
    [rows, paneSubmissionId],
  );
  const paneDetailHref = useMemo(
    () =>
      paneRow
        ? resolveProductFeedbackSubmissionHref(paneRow, managedProductId, canOpenSubmissionDetail)
        : null,
    [paneRow, managedProductId, canOpenSubmissionDetail],
  );
  const handleOpenPaneDetail = useCallback(() => {
    if (paneDetailHref !== null) requestLeave(() => router.push(paneDetailHref));
  }, [paneDetailHref, requestLeave, router]);

  return (
    <>
      {canCapture && (
        <CaptureSubmissionSheet
          managedProductId={managedProductId}
          open={captureOpen}
          onOpenChange={onCaptureOpenChange}
        />
      )}
      {canCapture && feedbucketOpen ? (
        <FeedbucketCollectDialog
          managedProductId={managedProductId}
          open
          onOpenChange={onFeedbucketOpenChange}
        />
      ) : null}
      {paneSubmissionId !== null && (
        <FeedbackPane
          submissionId={paneSubmissionId}
          managedProductId={managedProductId}
          open={paneSubmissionId !== null}
          onOpenChange={handleCloseFeedbackPane}
          onOpenDetail={paneDetailHref === null ? undefined : handleOpenPaneDetail}
          onOpenTicket={handleOpenTicket}
        />
      )}
      {paneTicketId !== null && paneTicketProjectId !== null && (
        <TicketDetailPane
          ticketId={paneTicketId}
          projectId={paneTicketProjectId}
          originHref={
            paneSubmissionId !== null
              ? `/build/managed-products/${managedProductId}/feedback?submission=${paneSubmissionId}`
              : `/build/managed-products/${managedProductId}/feedback`
          }
        />
      )}
      {intakeRouting.target ? (
        <RouteToIntakeDialog
          managedProductId={managedProductId}
          submission={intakeRouting.target}
          mutation={intakeRouting.mutation}
          onOpenChange={intakeRouting.handleTargetOpenChange}
        />
      ) : null}
    </>
  );
}
