"use client";

import { useState, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { COUNT_READ_KEY, COUNT_WRITE_KEY } from "@/hooks/api/inventory/counts";
import { useScanTarget } from "@/features/inventory/hooks/use-scan-target";
import { scanNamesVariant } from "@/features/inventory/lib/scan-resolution";
import { ScanField } from "@/features/inventory/components/scan";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  CYCLE_COUNT_STATUS_BADGE,
  CYCLE_COUNT_STATUS_LABEL,
  type CycleCountStatus,
} from "@/features/inventory/lib/inventory-status";
import type { CycleCountLine } from "@/hooks/api/inventory/counts";
import { buildCountLineColumns } from "./count-line-columns";

export interface CountDetailSharedProps {
  entityNoun: string;
  backHref: string;
  entityNumber: string | undefined;
  status: CycleCountStatus | undefined;
  lines: CycleCountLine[];
  isLoading: boolean;
  error: Error | null;
  onStart: () => void;
  onReview: () => void;
  onPost: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onSaveLine: (lineId: number, qty: number) => void;
  startPending: boolean;
  reviewPending: boolean;
  postPending: boolean;
  cancelPending: boolean;
}

export function CountDetailShared({
  entityNoun,
  backHref,
  entityNumber,
  status,
  lines,
  isLoading,
  error,
  onStart,
  onReview,
  onPost,
  onCancel,
  onRetry,
  onSaveLine,
  startPending,
  reviewPending,
  postPending,
  cancelPending,
}: CountDetailSharedProps) {
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [scannedTally, setScannedTally] = useState<Record<number, number>>({});
  const canView = useCan(COUNT_READ_KEY);
  const canCount = useCan(COUNT_WRITE_KEY);

  const shortNoun = entityNoun.split(" ").pop() ?? entityNoun;

  const isCounting = status === "COUNTING" && canCount;
  const isReview = status === "REVIEW";

  const scan = useScanTarget<CycleCountLine>({
    candidates: lines,
    documentNoun: shortNoun.toLowerCase(),
    enabled: isCounting,
    match: (line, resolved) => scanNamesVariant(resolved, line.variantId, line.variantSku),
    describe: (line) => ({
      key: String(line.id),
      primary: `${line.variantSku} · ${line.locationName ?? "no bin"}`,
      secondary: line.productName,
    }),
    acceptedMessage: (line) =>
      `${line.variantSku} at ${line.locationName ?? "no bin"} — ${(scannedTally[line.id] ?? 0) + 1} counted.`,
    onResolved: handleScanResolved,
  });

  function handleScanResolved(line: CycleCountLine): void {
    const next = (scannedTally[line.id] ?? 0) + 1;
    setScannedTally((previous) => ({ ...previous, [line.id]: next }));
    onSaveLine(line.id, next);
  }

  const actionsMutating = startPending || reviewPending || postPending || cancelPending;

  function handleOpenPostDialog(): void {
    setPostDialogOpen(true);
  }

  function handleConfirmPost(): void {
    setPostDialogOpen(false);
    onPost();
  }

  function buildActions(): React.ReactNode {
    if (!status || !canCount) return null;
    if (status === "PLANNED") {
      return (
        <Button size="sm" onClick={onStart} disabled={actionsMutating}>
          {startPending ? "Starting…" : `Start ${shortNoun}`}
        </Button>
      );
    }
    if (status === "COUNTING") {
      return (
        <Button size="sm" onClick={onReview} disabled={actionsMutating}>
          {reviewPending ? "Submitting…" : "Submit for Review"}
        </Button>
      );
    }
    if (status === "REVIEW") {
      return (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onCancel} disabled={actionsMutating}>
            {cancelPending ? "Cancelling…" : "Cancel"}
          </Button>
          <Button size="sm" onClick={handleOpenPostDialog} disabled={actionsMutating}>
            {postPending ? "Posting…" : `Post ${shortNoun}`}
          </Button>
        </div>
      );
    }
    return null;
  }

  const columns = useMemo<DataTableColumn<CycleCountLine>[]>(
    () => buildCountLineColumns({ isCounting, isReview, onSaveLine, scannedTally }),
    [isCounting, isReview, onSaveLine, scannedTally],
  );

  if (!canView) {
    return (
      <PageWrapper title={entityNoun} backHref={backHref}>
        <NoPermissionState className="flex-1" permission={COUNT_READ_KEY} />
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title={entityNoun} backHref={backHref}>
        <ErrorState
          title={`Failed to load ${entityNoun.toLowerCase()}`}
          description={getErrorMessage(error)}
          onRetry={onRetry}
          className="min-h-[40dvh]"
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title={isLoading ? entityNoun : `${entityNoun} #${entityNumber ?? ""}`}
        backHref={backHref}
        badge={
          status ? (
            <Badge
              variant="outline"
              className={`text-micro h-5 px-2 ${CYCLE_COUNT_STATUS_BADGE[status]}`}
            >
              {CYCLE_COUNT_STATUS_LABEL[status]}
            </Badge>
          ) : undefined
        }
        actions={buildActions()}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {isCounting ? (
            <ScanField scan={scan} label="Scan a unit to count it" className="shrink-0" />
          ) : null}
          <DataTable
            data={lines}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            className="flex-1 min-h-0"
            emptyState={
              <InventoryEmptyState
                compact
                title="No lines"
                description={`No inventory lines are assigned to this ${shortNoun.toLowerCase()}.`}
                className="border-0 bg-transparent min-h-[30dvh]"
              />
            }
            minWidth="600px"
          />
        </div>
      </PageWrapper>

      <AlertDialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post {entityNoun}</AlertDialogTitle>
            <AlertDialogDescription>
              This will adjust stock to matched quantities. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPost}>Post {shortNoun}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
