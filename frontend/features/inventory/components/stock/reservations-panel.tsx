"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { Unlock } from "lucide-react";
import { useReservations, useReleaseReservation } from "@/hooks/api/inventory/stock";
import { useCan } from "@/hooks/api/access";
import {
  RESERVATION_STATUS_BADGE,
  RESERVATION_STATUS_LABEL,
  type ReservationStatus,
} from "@/features/inventory/lib";
import type { StockReservationStatus } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";

type ReservationItem = {
  id: number;
  sourceType: string;
  sourceId: string;
  reservedQty: string;
  status: StockReservationStatus;
  expiresAt: string | null;
  createdAt: string;
  productVariant: { id: number; sku: string; name: string | null } | null;
  warehouse: { id: number; name: string } | null;
};

const PAGE_LIMIT = 50;

export function ReservationsPanel() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [releaseId, setReleaseId] = useState<number | null>(null);

  const canRelease = useCan("inventory:stock:reserve");
  const releaseMutation = useReleaseReservation();

  const filters = {
    ...(statusFilter !== "all" ? { status: statusFilter as StockReservationStatus } : {}),
    page,
    limit: PAGE_LIMIT,
  };

  const { data, isLoading } = useReservations(filters);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleRelease = useCallback((id: number) => {
    setReleaseId(id);
  }, []);

  function handleStatusChange(val: string): void {
    setStatusFilter(val);
    setPage(1);
  }

  function handleConfirmRelease(): void {
    if (releaseId === null) return;
    releaseMutation.mutate(releaseId, {
      onSuccess: () => {
        toast.success("Reservation released");
        setReleaseId(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setReleaseId(null);
      },
    });
  }

  function handleCancelRelease(): void {
    setReleaseId(null);
  }

  const columns = useMemo<DataTableColumn<ReservationItem>[]>(() => [
    {
      key: "source",
      header: "Source",
      className: "text-muted-foreground font-mono",
      cell: (row) => {
        const soLink = row.sourceType === "sales_order"
          ? `/inventory/sales-orders/${row.sourceId}`
          : null;
        return soLink ? (
          <Link href={soLink} className="text-accent hover:underline">
            {row.sourceType}/{row.sourceId}
          </Link>
        ) : (
          `${row.sourceType}/${row.sourceId}`
        );
      },
    },
    {
      key: "product",
      header: "Product / Variant",
      cell: (row) => (
        <>
          <TruncatedText text={row.productVariant?.name ?? "—"} className="font-medium" />
          <div className="font-mono text-muted-foreground">{row.productVariant?.sku ?? "—"}</div>
        </>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => Number(row.reservedQty).toLocaleString(undefined, { maximumFractionDigits: 4 }),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const status = row.status as ReservationStatus;
        return (
          <Badge
            variant="outline"
            className={cn("h-4 text-[9px] px-1.5 py-0 border", RESERVATION_STATUS_BADGE[status])}
          >
            {RESERVATION_STATUS_LABEL[status]}
          </Badge>
        );
      },
    },
    {
      key: "expires",
      header: "Expires",
      className: "text-muted-foreground hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (row) => row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "—",
    },
    {
      key: "created",
      header: "Created",
      className: "text-muted-foreground hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-8",
      cell: (row) => {
        if (!canRelease || row.status !== "ACTIVE") return null;
        function handleReleaseClick(): void {
          handleRelease(row.id);
        }
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Release reservation"
            onClick={handleReleaseClick}
          >
            <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        );
      },
    },
  ], [canRelease, handleRelease]);

  return (
    <>
      <div className={`${FILTER_TOOLBAR_ROW} mb-3`}>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "text-xs w-[160px]")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="CONSUMED">Consumed</SelectItem>
            <SelectItem value="RELEASED">Released</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
        {total > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {total} reservation{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <DataTable
        data={items}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={
          <InventoryEmptyState
            title="No active reservations"
            description="Reservations will appear here when stock is reserved for sales orders or other sources."
            className="flex-1 min-h-[30vh]"
          />
        }
        pagination={{
          mode: "server",
          page,
          pageSize: PAGE_LIMIT,
          total,
          onPageChange: setPage,
        }}
      />

      <AlertDialog open={releaseId !== null} onOpenChange={(o) => { if (!o) setReleaseId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              This will release the reservation and restore the stock as available. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRelease}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRelease} disabled={releaseMutation.isPending}>
              {releaseMutation.isPending ? "Releasing…" : "Release"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
