"use client";

import { memo, useCallback, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useCan } from "@/hooks/api/access";
import {
  useQualityInspection,
  useStartInspection,
  usePassInspection,
  useFailInspection,
  useDisposeInspection,
  useCancelInspection,
} from "@/hooks/api/inventory/quality";
import type { InspectionLine } from "@/hooks/api/inventory/quality";
import {
  INSPECTION_STATUS_BADGE,
  INSPECTION_STATUS_LABEL,
} from "@/features/inventory/lib";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

type Disposition = "RELEASE_TO_AVAILABLE" | "QUARANTINE" | "RETURN_TO_VENDOR" | "SCRAP";

const DISPOSITION_LABELS: Record<Disposition, string> = {
  RELEASE_TO_AVAILABLE: "Release to Available",
  QUARANTINE: "Quarantine",
  RETURN_TO_VENDOR: "Return to Vendor",
  SCRAP: "Scrap",
};

const DISPOSITION_OPTIONS: Disposition[] = [
  "RELEASE_TO_AVAILABLE",
  "QUARANTINE",
  "RETURN_TO_VENDOR",
  "SCRAP",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  inspectionId: number | null;
}

const LineDispositionRow = memo(function LineDispositionRow({
  line,
  value,
  onChange,
}: {
  line: InspectionLine;
  value: string;
  onChange: (lineId: number, d: string) => void;
}) {
  function handleChange(d: string): void {
    onChange(line.id, d);
  }

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
      <TruncatedText text={line.variantName} className="flex-1 text-xs" />
      <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">{line.qty}</span>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-44 text-xs">
          <SelectValue placeholder="Choose..." />
        </SelectTrigger>
        <SelectContent>
          {DISPOSITION_OPTIONS.map((d) => (
            <SelectItem key={d} value={d} className="text-xs">
              {DISPOSITION_LABELS[d]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

const INSPECTION_LINE_COLUMNS: DataTableColumn<InspectionLine>[] = [
  {
    key: "variantName",
    header: "Variant",
    className: "text-xs",
    cell: (line) => <TruncatedText text={line.variantName} className="max-w-[160px]" />,
  },
  {
    key: "qty",
    header: "Qty",
    className: "text-right tabular-nums text-xs",
    headerClassName: "text-right",
    cell: (line) => line.qty,
  },
  {
    key: "disposition",
    header: "Disposition",
    className: "text-muted-foreground text-xs",
    cell: (line) => line.disposition ?? "—",
  },
];

export function InspectionDetailSheet({ open, onOpenChange, inspectionId }: Props) {
  const [showFailForm, setShowFailForm] = useState(false);
  const [failDispositions, setFailDispositions] = useState<Record<number, string>>({});

  const canRelease = useCan("inventory:quality:release");

  const inspectionQuery = useQualityInspection(inspectionId ?? 0);
  const startMut = useStartInspection();
  const passMut = usePassInspection();
  const failMut = useFailInspection();
  const disposeMut = useDisposeInspection();
  const cancelMut = useCancelInspection();

  const inspection = inspectionQuery.data;
  const isLoading = inspectionQuery.isLoading;

  function handleStart(): void {
    if (!inspectionId) return;
    startMut.mutate(inspectionId, {
      onSuccess: () => toast.success("Inspection started"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handlePass(): void {
    if (!inspectionId) return;
    passMut.mutate(inspectionId, {
      onSuccess: () => toast.success("Inspection passed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleHideFail(): void {
    setShowFailForm(false);
  }

  function handleShowFail(): void {
    setShowFailForm(true);
    const initial: Record<number, string> = {};
    for (const line of inspection?.lines ?? []) {
      initial[line.id] = "QUARANTINE";
    }
    setFailDispositions(initial);
  }

  const handleDispositionChange = useCallback((lineId: number, d: string): void => {
    setFailDispositions((prev) => ({ ...prev, [lineId]: d }));
  }, []);

  function handleSubmitFail(): void {
    if (!inspectionId || !inspection) return;
    const lines = inspection.lines.map((l) => ({
      lineId: l.id,
      disposition: (failDispositions[l.id] ?? "QUARANTINE") as Disposition,
    }));
    failMut.mutate(
      { inspectionId, lines },
      {
        onSuccess: () => {
          toast.success("Inspection failed and dispositions set");
          setShowFailForm(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleDispose(): void {
    if (!inspectionId) return;
    disposeMut.mutate(
      { inspectionId },
      {
        onSuccess: () => toast.success("Disposition applied"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleCancel(): void {
    if (!inspectionId) return;
    cancelMut.mutate(inspectionId, {
      onSuccess: () => {
        toast.success("Inspection cancelled");
        onOpenChange(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const isBusy =
    startMut.isPending || passMut.isPending || failMut.isPending ||
    disposeMut.isPending || cancelMut.isPending;

  const status = inspection?.status;
  const isTerminal = status === "PASSED" || status === "COMPLETED" || status === "CANCELLED";

  const footer = (
    <div className="flex items-center gap-2 flex-wrap">
      {status === "PENDING" && (
        <Button size="sm" onClick={handleStart} disabled={isBusy}>Start</Button>
      )}
      {status === "IN_PROGRESS" && !showFailForm && (
        <>
          {canRelease && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="default" disabled={isBusy}>Pass</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Pass inspection?</AlertDialogTitle>
                  <AlertDialogDescription>All lines will be released to available stock.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePass}>Confirm Pass</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button size="sm" variant="destructive" onClick={handleShowFail} disabled={isBusy}>Fail</Button>
        </>
      )}
      {status === "IN_PROGRESS" && showFailForm && (
        <>
          <Button size="sm" variant="outline" onClick={handleHideFail} disabled={isBusy}>Back</Button>
          <Button size="sm" variant="destructive" onClick={handleSubmitFail} disabled={isBusy}>Submit Fail</Button>
        </>
      )}
      {(status === "FAILED" || status === "DISPOSITION_REQUIRED") && (
        <Button size="sm" onClick={handleDispose} disabled={isBusy}>Dispose</Button>
      )}
      {!isTerminal && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={isBusy}>Cancel</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel inspection?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Back</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel}>Cancel Inspection</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Inspection #${inspectionId ?? "—"}`}
      description="Quality inspection details and actions"
      footer={inspection && !isLoading ? footer : undefined}
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !inspection ? (
        <p className="text-sm text-muted-foreground">Could not load inspection.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              variant="outline"
              className={cn("h-5 text-micro px-2 border", INSPECTION_STATUS_BADGE[inspection.status])}
            >
              {INSPECTION_STATUS_LABEL[inspection.status]}
            </Badge>
            {inspection.source && (
              <span className="text-xs text-muted-foreground">Source: {inspection.source}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {format(new Date(inspection.createdAt), "dd MMM yyyy")}
            </span>
          </div>

          {showFailForm ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Set disposition per line:</p>
              {inspection.lines.map((line) => (
                <LineDispositionRow
                  key={line.id}
                  line={line}
                  value={failDispositions[line.id] ?? "QUARANTINE"}
                  onChange={handleDispositionChange}
                />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Lines</p>
                <DataTable
                  data={inspection.lines}
                  columns={INSPECTION_LINE_COLUMNS}
                  getRowKey={(line) => line.id}
                />
              </div>

              {inspection.statusTimeline && inspection.statusTimeline.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Timeline</p>
                  <div className="space-y-1">
                    {inspection.statusTimeline.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <Badge
                          variant="outline"
                          className={cn("h-4 text-micro px-1.5 py-0 border shrink-0", INSPECTION_STATUS_BADGE[entry.status])}
                        >
                          {INSPECTION_STATUS_LABEL[entry.status]}
                        </Badge>
                        <span className="text-muted-foreground">{format(new Date(entry.at), "dd MMM yyyy HH:mm")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </AppSheet>
  );
}
