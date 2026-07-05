"use client";

import { memo, useCallback, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { EmptyState } from "@/components/ui/empty-state";
import { MoreHorizontal } from "lucide-react";
import { useReservations, useReleaseReservation } from "@/hooks/api/inventory/stock";
import { useCan } from "@/hooks/api/access";
import {
  RESERVATION_STATUS_BADGE,
  RESERVATION_STATUS_LABEL,
  type ReservationStatus,
} from "@/features/inventory/lib";
import type { StockReservationStatus } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";

interface ReservationRowProps {
  reservation: {
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
  canRelease: boolean;
  onRelease: (id: number) => void;
}

const ReservationRow = memo(function ReservationRow({ reservation, canRelease, onRelease }: ReservationRowProps) {
  const status = reservation.status as ReservationStatus;
  const soLink = reservation.sourceType === "sales_order"
    ? `/inventory/sales-orders/${reservation.sourceId}`
    : null;

  function handleRelease(): void {
    onRelease(reservation.id);
  }

  return (
    <TableRow className="h-8 border-b border-border/50 hover:bg-muted/30 transition-colors">
      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground font-mono">
        {soLink ? (
          <Link href={soLink} className="text-accent hover:underline">
            {reservation.sourceType}/{reservation.sourceId}
          </Link>
        ) : (
          `${reservation.sourceType}/${reservation.sourceId}`
        )}
      </TableCell>
      <TableCell className="px-2 py-1 text-[11px]">
        <div className="font-medium truncate max-w-[140px]">
          {reservation.productVariant?.name ?? "—"}
        </div>
        <div className="font-mono text-muted-foreground">{reservation.productVariant?.sku ?? "—"}</div>
      </TableCell>
      <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px]">
        {Number(reservation.reservedQty).toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </TableCell>
      <TableCell className="px-2 py-1">
        <Badge
          variant="outline"
          className={cn("h-4 text-[9px] px-1.5 py-0 border", RESERVATION_STATUS_BADGE[status])}
        >
          {RESERVATION_STATUS_LABEL[status]}
        </Badge>
      </TableCell>
      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">
        {reservation.expiresAt ? new Date(reservation.expiresAt).toLocaleDateString() : "—"}
      </TableCell>
      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden lg:table-cell">
        {new Date(reservation.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="px-2 py-1">
        {canRelease && reservation.status === "ACTIVE" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Actions">
                <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleRelease}>Release</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
});

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
  const totalPages = data?.totalPages ?? 1;

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

  function handlePrevPage(): void {
    setPage((p) => Math.max(1, p - 1));
  }

  function handleNextPage(): void {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 text-xs w-[160px]">
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

      {isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No active reservations"
          description="Reservations will appear here when stock is reserved for sales orders or other sources."
          className="flex-1 min-h-[30vh]"
        />
      ) : (
        <>
          <div className="rounded-md border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/80 hover:bg-muted/80">
                    <TableHead className={TH}>Source</TableHead>
                    <TableHead className={TH}>Product / Variant</TableHead>
                    <TableHead className={cn(TH, "text-right")}>Qty</TableHead>
                    <TableHead className={TH}>Status</TableHead>
                    <TableHead className={cn(TH, "hidden md:table-cell")}>Expires</TableHead>
                    <TableHead className={cn(TH, "hidden lg:table-cell")}>Created</TableHead>
                    <TableHead className={cn(TH, "w-8")} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <ReservationRow
                      key={r.id}
                      reservation={r}
                      canRelease={canRelease}
                      onRelease={handleRelease}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between px-1 py-2">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={handlePrevPage}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={handleNextPage}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

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
