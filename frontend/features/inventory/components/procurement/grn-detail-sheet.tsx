"use client";

import { cn } from "@/lib/utils";
import { AppSheet } from "@/components/shared/app-sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState, ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { useGoodsReceipt, type GrnLine } from "@/hooks/api/inventory/operations";
import {
  GRN_DISCREPANCY_LABEL,
  GRN_QUALITY_BADGE,
  GRN_QUALITY_LABEL,
  GRN_STATUS_BADGE,
  GRN_STATUS_LABEL,
} from "@/features/inventory/lib";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { GrnLifecycleActions } from "./grn-lifecycle-actions";
import { GrnPrintNoteButton } from "./grn-print-note-button";
import { LABELS_PRINT_KEY } from "@/hooks/api/inventory/labels";

const READ_PERMISSION = "inventory:purchase-orders:read";
const RECEIVE_PERMISSION = "inventory:purchase-orders:receive";

export interface GrnDetailSheetProps {
  grnId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const grnLineColumns: DataTableColumn<GrnLine>[] = [
  {
    key: "line",
    header: "PO line",
    cell: (line) => <span className="font-mono text-dense">#{line.poLineId}</span>,
  },
  {
    key: "expected",
    header: "Expected",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (line) =>
      line.quantityExpected === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        Number(line.quantityExpected).toFixed(2)
      ),
  },
  {
    key: "qty",
    header: "Received",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (line) => (
      <>
        <div>{Number(line.quantityReceived).toFixed(2)}</div>
        {/* The entered figure only earns a line when it differs from the base. */}
        {line.quantityEntered !== null && line.uomId !== null ? (
          <div className="text-micro text-muted-foreground">
            {Number(line.quantityEntered).toFixed(2)} × {Number(line.uomFactor ?? 1).toFixed(2)}
          </div>
        ) : null}
      </>
    ),
  },
  {
    key: "quality",
    header: "Quality",
    cell: (line) => (
      <>
        <Badge
          variant="outline"
          className={cn("h-4 text-micro px-1.5 py-0", GRN_QUALITY_BADGE[line.qualityStatus])}
        >
          {GRN_QUALITY_LABEL[line.qualityStatus]}
        </Badge>
        {line.discrepancyReason ? (
          <div className="text-micro text-muted-foreground mt-0.5">
            {GRN_DISCREPANCY_LABEL[line.discrepancyReason]}
          </div>
        ) : null}
        {line.rejectionReason ? (
          <TruncatedText
            text={line.rejectionReason}
            lines={2}
            className="text-micro text-muted-foreground mt-0.5"
          />
        ) : null}
      </>
    ),
  },
  {
    key: "lotSerial",
    header: "Lot / Serial",
    className: "font-mono",
    cell: (line) => {
      if (line.lotNumber) {
        return (
          <div>
            <span className="text-muted-foreground text-micro">LOT:</span> {line.lotNumber}
            {line.expiryDate ? (
              <div className="text-micro text-muted-foreground">
                Exp: {formatShortDate(line.expiryDate)}
              </div>
            ) : null}
          </div>
        );
      }
      if (line.serials.length > 0) {
        return (
          <div>
            <span className="text-muted-foreground text-micro">S/N:</span>{" "}
            {line.serials.slice(0, 3).map((s) => s.serialNumber).join(", ")}
            {line.serials.length > 3 ? (
              <span className="text-muted-foreground"> +{line.serials.length - 3} more</span>
            ) : null}
          </div>
        );
      }
      return <span className="text-muted-foreground">—</span>;
    },
  },
];

/**
 * B1 — one delivery, at whatever stage of its life it is in.
 *
 * This used to be a read-only view of something that had already posted,
 * because that was the only kind of receipt that could exist. It is now the
 * workbench: the counted quantities beside what the order owed, the discrepancy
 * the receiver noted, and the controls that move the document forward.
 */
export function GrnDetailSheet({ grnId, open, onOpenChange }: GrnDetailSheetProps) {
  const canView = useCan(READ_PERMISSION);
  const canReceive = useCan(RECEIVE_PERMISSION);
  // Printing is its own authority. A clerk who may not post a receipt may still
  // need the sheet, and somebody who posts all day may not be allowed to put the
  // vendor's prices on paper that leaves the building.
  const canPrint = useCan(LABELS_PRINT_KEY);
  const grnQuery = useGoodsReceipt(open ? grnId : 0);

  function handleRefetchGrn(): void {
    void grnQuery.refetch();
  }

  function handleReversed(): void {
    onOpenChange(false);
  }

  const grn = grnQuery.data;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={grn ? `GRN ${grn.grnNumber}` : "Goods Receipt Note"}
      description={grn ? `Received on ${formatShortDate(grn.receivedDate)}` : undefined}
      footer={
        grn ? (
          <div className="flex w-full flex-col gap-2">
            <GrnLifecycleActions
              grnId={grn.id}
              grnNumber={grn.grnNumber}
              status={grn.status}
              canReceive={canReceive}
              onReversed={handleReversed}
            />
            {canPrint ? (
              <GrnPrintNoteButton grnId={grn.id} grnNumber={grn.grnNumber} />
            ) : null}
          </div>
        ) : undefined
      }
    >
      {!canView ? <NoPermissionState permission={READ_PERMISSION} compact /> : null}
      {canView && grnQuery.isLoading ? <LoadingState variant="form" /> : null}
      {canView && grnQuery.error ? (
        <ErrorState description={getErrorMessage(grnQuery.error)} onRetry={handleRefetchGrn} />
      ) : null}
      {canView && grn ? (
        <div className="space-y-4">
          <Card className="p-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge
                  variant="outline"
                  className={cn("h-5 px-2 py-0.5 text-micro", GRN_STATUS_BADGE[grn.status])}
                >
                  {GRN_STATUS_LABEL[grn.status]}
                </Badge>
              </dd>
              <dt className="text-muted-foreground">Purchase order</dt>
              <dd className="font-mono">{grn.purchaseOrder?.poNumber ?? "—"}</dd>
              <dt className="text-muted-foreground">Vendor</dt>
              <dd>{grn.purchaseOrder?.vendor?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Received date</dt>
              <dd className="font-mono tabular-nums">{formatShortDate(grn.receivedDate)}</dd>
              {grn.postedAt ? (
                <>
                  <dt className="text-muted-foreground">Posted</dt>
                  <dd className="font-mono tabular-nums">
                    {formatShortDate(grn.postedAt)}
                    {grn.poster?.name ? (
                      <span className="ml-1 font-sans text-muted-foreground">by {grn.poster.name}</span>
                    ) : null}
                  </dd>
                </>
              ) : null}
              {grn.notes ? (
                <>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd>{grn.notes}</dd>
                </>
              ) : null}
            </dl>
          </Card>

          <DataTable
            data={grn.lines}
            columns={grnLineColumns}
            getRowKey={(line) => line.id}
            minWidth="560px"
          />
        </div>
      ) : null}
    </AppSheet>
  );
}
