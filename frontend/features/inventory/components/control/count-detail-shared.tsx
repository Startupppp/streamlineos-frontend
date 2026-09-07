"use client";

import { useState, useRef, useMemo, memo, useEffect } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
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
import { TruncatedText } from "@/components/ui/truncated-text";
import type { CycleCountLine } from "@/hooks/api/inventory/counts";

function isCycleCountStatus(s: string | undefined): s is CycleCountStatus {
  return s === "PLANNED" || s === "COUNTING" || s === "REVIEW" || s === "POSTED" || s === "CANCELLED";
}

export interface CountDetailSharedProps {
  entityNoun: string;
  backHref: string;
  entityNumber: string | undefined;
  status: string | undefined;
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

function VarianceCell({ value }: { value: string | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const num = parseFloat(value);
  if (Number.isNaN(num) || num === 0) return <span className="tabular-nums">{value}</span>;
  if (num > 0) return <span className="tabular-nums text-status-success-ink">+{value}</span>;
  return <span className="tabular-nums text-status-danger-ink">{value}</span>;
}

const DebouncedQtyInput = memo(function DebouncedQtyInput({
  lineId,
  initial,
  onSave,
}: {
  lineId: number;
  initial: string | null;
  onSave: (lineId: number, qty: number) => void;
}) {
  const [value, setValue] = useState(initial !== null ? initial : "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(function clearPendingTimerOnUnmount() {
    return function cleanup() {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const raw = e.target.value;
    setValue(raw);
    if (timerRef.current) clearTimeout(timerRef.current);
    const num = Number(raw);
    if (raw !== "" && Number.isFinite(num) && num >= 0) {
      timerRef.current = setTimeout(() => {
        onSave(lineId, num);
      }, 300);
    }
  }

  return (
    <Input
      type="number"
      min={0}
      value={value}
      onChange={handleChange}
      className="w-24 text-xs tabular-nums"
    />
  );
});

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

  const shortNoun = entityNoun.split(" ").pop() ?? entityNoun;

  const isCounting = status === "COUNTING";
  const isReview = status === "REVIEW";

  const actionsMutating = startPending || reviewPending || postPending || cancelPending;

  function handleOpenPostDialog(): void {
    setPostDialogOpen(true);
  }

  function handleConfirmPost(): void {
    setPostDialogOpen(false);
    onPost();
  }

  function buildActions(): React.ReactNode {
    if (!status) return null;
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
    () => [
      {
        key: "product",
        header: "Product",
        cell: (row) => (
          <TruncatedText text={row.productVariant?.name ?? "—"} className="text-sm font-medium text-foreground" />
        ),
      },
      {
        key: "sku",
        header: "SKU",
        headerClassName: "w-[130px]",
        className: "font-mono text-xs text-muted-foreground",
        cell: (row) => row.productVariant?.sku ?? "—",
      },
      {
        key: "location",
        header: "Location",
        headerClassName: "w-[130px]",
        className: "text-muted-foreground",
        cell: (row) => <TruncatedText text={row.location?.name ?? "—"} className="text-sm text-muted-foreground" />,
      },
      {
        key: "systemQty",
        header: "System Qty",
        headerClassName: "w-[100px] text-right",
        className: "text-right tabular-nums text-muted-foreground",
        cell: (row) => row.systemQty,
      },
      {
        key: "countedQty",
        header: "Counted Qty",
        headerClassName: "w-[130px] text-right",
        className: "text-right",
        cell: (row) =>
          isCounting ? (
            <div className="flex justify-end">
              <DebouncedQtyInput lineId={row.id} initial={row.countedQty} onSave={onSaveLine} />
            </div>
          ) : (
            <span className="tabular-nums">
              {row.countedQty !== null ? row.countedQty : "—"}
            </span>
          ),
      },
      {
        key: "variance",
        header: "Variance",
        headerClassName: "w-[100px] text-right",
        className: "text-right",
        cell: (row) =>
          isReview ? (
            <VarianceCell value={row.varianceQty} />
          ) : (
            <span className="text-muted-foreground tabular-nums">—</span>
          ),
      },
    ],
    [isCounting, isReview, onSaveLine],
  );

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
              className={`text-micro h-5 px-2 ${isCycleCountStatus(status) ? CYCLE_COUNT_STATUS_BADGE[status] : ""}`}
            >
              {isCycleCountStatus(status) ? CYCLE_COUNT_STATUS_LABEL[status] : status}
            </Badge>
          ) : undefined
        }
        actions={buildActions()}
      >
        <div className="flex flex-1 min-h-0 flex-col">
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
