"use client";

import { useState, useRef, useCallback, useMemo, memo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
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
  usePhysicalAudit,
  useStartPhysicalAudit,
  useUpdatePhysicalAuditLines,
  useReviewPhysicalAudit,
  usePostPhysicalAudit,
  useCancelPhysicalAudit,
  type CycleCountLine,
} from "@/hooks/api/inventory/counts";
import {
  CYCLE_COUNT_STATUS_BADGE,
  CYCLE_COUNT_STATUS_LABEL,
  type CycleCountStatus,
} from "@/features/inventory/lib/inventory-status";

interface Props {
  auditId: number;
}

function VarianceCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  if (value === 0) return <span className="tabular-nums">0</span>;
  if (value > 0) return <span className="tabular-nums text-emerald-600">+{value}</span>;
  return <span className="tabular-nums text-red-600">{value}</span>;
}

const DebouncedQtyInput = memo(function DebouncedQtyInput({
  lineId,
  initial,
  onSave,
}: {
  lineId: number;
  initial: number | null;
  onSave: (lineId: number, qty: number) => void;
}) {
  const [value, setValue] = useState(initial !== null ? String(initial) : "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      className="h-7 w-24 text-xs tabular-nums"
    />
  );
});

export function PhysicalAuditDetailClient({ auditId }: Props) {
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  const { data: audit, isLoading, error, refetch } = usePhysicalAudit(auditId);
  const startMutation = useStartPhysicalAudit();
  const updateLinesMutation = useUpdatePhysicalAuditLines();
  const reviewMutation = useReviewPhysicalAudit();
  const postMutation = usePostPhysicalAudit();
  const cancelMutation = useCancelPhysicalAudit();

  const handleSaveLine = useCallback(
    (lineId: number, countedQty: number) => {
      updateLinesMutation.mutate({ auditId, lines: [{ lineId, countedQty }] });
    },
    [auditId, updateLinesMutation],
  );

  function handleStart(): void {
    startMutation.mutate(auditId);
  }

  function handleReview(): void {
    reviewMutation.mutate(auditId);
  }

  function handleOpenPostDialog(): void {
    setPostDialogOpen(true);
  }

  function handleConfirmPost(): void {
    setPostDialogOpen(false);
    postMutation.mutate(auditId);
  }

  function handleCancel(): void {
    cancelMutation.mutate(auditId);
  }

  function handleRetry(): void {
    void refetch();
  }

  const status = audit?.status;
  const isCounting = status === "COUNTING";
  const isReview = status === "REVIEW";

  const actionsMutating =
    startMutation.isPending ||
    reviewMutation.isPending ||
    postMutation.isPending ||
    cancelMutation.isPending;

  function buildActions(): React.ReactNode {
    if (!status) return null;
    if (status === "PLANNED") {
      return (
        <Button size="sm" onClick={handleStart} disabled={actionsMutating}>
          {startMutation.isPending ? "Starting…" : "Start Audit"}
        </Button>
      );
    }
    if (status === "COUNTING") {
      return (
        <Button size="sm" onClick={handleReview} disabled={actionsMutating}>
          {reviewMutation.isPending ? "Submitting…" : "Submit for Review"}
        </Button>
      );
    }
    if (status === "REVIEW") {
      return (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCancel} disabled={actionsMutating}>
            {cancelMutation.isPending ? "Cancelling…" : "Cancel"}
          </Button>
          <Button size="sm" onClick={handleOpenPostDialog} disabled={actionsMutating}>
            {postMutation.isPending ? "Posting…" : "Post Audit"}
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
          <span className="text-sm font-medium text-foreground">{row.productName}</span>
        ),
      },
      {
        key: "sku",
        header: "SKU",
        headerClassName: "w-[130px]",
        className: "font-mono text-xs text-muted-foreground",
        cell: (row) => row.variantSku,
      },
      {
        key: "location",
        header: "Location",
        headerClassName: "w-[130px]",
        className: "text-muted-foreground",
        cell: (row) => row.locationName ?? "—",
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
              <DebouncedQtyInput
                lineId={row.id}
                initial={row.countedQty}
                onSave={handleSaveLine}
              />
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
            <VarianceCell value={row.variance} />
          ) : (
            <span className="text-muted-foreground tabular-nums">—</span>
          ),
      },
    ],
    [isCounting, isReview, handleSaveLine],
  );

  if (error) {
    return (
      <PageWrapper
        eyebrow="Operations · Inventory"
        title="Physical Audit"
        backHref="/inventory/physical-audits"
      >
        <ErrorState
          title="Failed to load physical audit"
          description={error.message}
          onRetry={handleRetry}
          className="min-h-[40vh]"
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        eyebrow="Operations · Inventory"
        title={isLoading ? "Physical Audit" : `Physical Audit #${audit?.auditNumber ?? ""}`}
        backHref="/inventory/physical-audits"
        badge={
          status ? (
            <Badge
              variant="outline"
              className={`text-[10px] h-5 px-2 ${CYCLE_COUNT_STATUS_BADGE[status as CycleCountStatus]}`}
            >
              {CYCLE_COUNT_STATUS_LABEL[status as CycleCountStatus]}
            </Badge>
          ) : undefined
        }
        actions={buildActions()}
      >
        <DataTable
          data={audit?.lines ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              compact
              title="No lines"
              description="No inventory lines are assigned to this audit."
              className="border-0 bg-transparent min-h-[30vh]"
            />
          }
          minWidth="600px"
        />
      </PageWrapper>

      <AlertDialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post Physical Audit</AlertDialogTitle>
            <AlertDialogDescription>
              This will adjust stock to matched quantities. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPost}>Post Audit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
