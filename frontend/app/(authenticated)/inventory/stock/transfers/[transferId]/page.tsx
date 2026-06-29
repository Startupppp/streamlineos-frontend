"use client";

import { useCallback, use } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Package, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import Link from "next/link";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useTransfer,
  useCompleteTransfer,
  type TransferDetail,
  type TransferStatus,
} from "@/hooks/api/inventory/stock";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<TransferStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200/70",
  IN_TRANSIT: "bg-blue-50 text-blue-700 border-blue-200/70",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  CANCELLED: "bg-red-50 text-red-700 border-red-200/70",
};

const STATUS_LABELS: Record<TransferStatus, string> = {
  PENDING: "Pending",
  IN_TRANSIT: "In Transit",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function LocationCell({
  location,
  label,
}: {
  location: TransferDetail["fromLocation"];
  label: string;
}) {
  if (!location) {
    return (
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      {location.warehouse && (
        <p className="text-sm font-semibold text-foreground">{location.warehouse.name}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {location.name}{" "}
        <span className="font-mono">({location.code})</span>
      </p>
    </div>
  );
}

function TransferDetailSkeleton() {
  return (
    <PageWrapper title="Transfer" eyebrow="Inventory / Transfers">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><Skeleton className="h-4 w-20" /></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

export default function TransferDetailPage({
  params,
}: {
  params: Promise<{ transferId: string }>;
}) {
  const { transferId: transferIdStr } = use(params);
  const transferId = Number(transferIdStr);

  const { data: transferData, isLoading, isError, refetch } = useTransfer(transferId);
  const completeMutation = useCompleteTransfer();

  const transfer = transferData ?? undefined;

  function handleRetry() { void refetch(); }

  const handleComplete = useCallback(() => {
    if (!transfer) return;
    const lines = transfer.lines.map((l) => ({
      transferLineId: l.id,
      quantityReceived: l.quantity,
    }));

    completeMutation.mutate(
      { transferId, lines },
      {
        onSuccess: () => toast.success("Transfer completed"),
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      },
    );
  }, [transfer, transferId, completeMutation]);

  if (isLoading) return <TransferDetailSkeleton />;

  if (isError) {
    return (
      <PageWrapper title="Transfer" eyebrow="Inventory / Transfers">
        <EmptyState
          illustration={<AlertCircle className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />}
          title="Failed to load transfer"
          description="An error occurred while fetching this transfer. Please try again."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </PageWrapper>
    );
  }

  if (!transfer) {
    return (
      <PageWrapper title="Transfer not found" eyebrow="Inventory / Transfers">
        <EmptyState
          title="Transfer not found"
          description="This transfer does not exist or you do not have access."
          action={{ label: "Back to Transfers", href: "/inventory/stock/transfers" }}
        />
      </PageWrapper>
    );
  }

  const canComplete = transfer.status === "PENDING" || transfer.status === "IN_TRANSIT";
  const lines = transfer.lines ?? [];

  return (
    <PageWrapper
      title={transfer.referenceNumber}
      eyebrow="Inventory / Transfers"
      subtitle={
        <Badge
          className={cn(
            "text-[11px] px-2 py-0.5",
            STATUS_COLORS[transfer.status] ?? "bg-muted text-muted-foreground",
          )}
        >
          {STATUS_LABELS[transfer.status] ?? transfer.status}
        </Badge>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/stock/transfers">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Link>
          </Button>
          {canComplete && (
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? "Completing…" : "Mark as Completed"}
            </Button>
          )}
        </div>
      }
    >
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <Card>
            <CardContent className="p-4">
              <div className="grid gap-6 sm:grid-cols-3">
                <LocationCell location={transfer.fromLocation} label="From" />
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-px w-8 bg-border" />
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    <div className="h-px w-8 bg-border" />
                  </div>
                </div>
                <LocationCell location={transfer.toLocation} label="To" />
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 grid gap-4 sm:grid-cols-3 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Created: </span>
                  {format(new Date(transfer.createdAt), "dd MMM yyyy, HH:mm")}
                </div>
                {transfer.completedAt && (
                  <div>
                    <span className="font-medium text-foreground">Completed: </span>
                    {format(new Date(transfer.completedAt), "dd MMM yyyy, HH:mm")}
                  </div>
                )}
                {transfer.createdByName && (
                  <div>
                    <span className="font-medium text-foreground">Created by: </span>
                    {transfer.createdByName}
                  </div>
                )}
                {transfer.notes && (
                  <div className="sm:col-span-3">
                    <span className="font-medium text-foreground">Notes: </span>
                    {transfer.notes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-semibold">Line Items</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ({lines.length})
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {lines.length === 0 ? (
                <EmptyState
                  compact
                  title="No line items"
                  description="This transfer has no product lines."
                />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-xs font-semibold">Product</TableHead>
                        <TableHead className="text-xs font-semibold">SKU</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Requested</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Received</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Variance</TableHead>
                        <TableHead className="text-xs font-semibold">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line) => {
                        const productName = line.productName;
                        const sku = line.sku;
                        const requested = line.quantity;
                        const received = line.quantityReceived;
                        const variance = received - requested;
                        const isShort = variance < 0;
                        const isOver = variance > 0;
                        return (
                          <TableRow key={line.id} className="text-sm">
                            <TableCell className="py-2.5 font-medium max-w-[180px] truncate">
                              {productName}
                            </TableCell>
                            <TableCell className="py-2.5 font-mono text-xs text-muted-foreground">
                              {sku}
                            </TableCell>
                            <TableCell className="py-2.5 text-right tabular-nums">
                              {requested.toLocaleString()}
                            </TableCell>
                            <TableCell className="py-2.5 text-right tabular-nums">
                              {received.toLocaleString()}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "py-2.5 text-right tabular-nums font-medium",
                                isShort && "text-red-600",
                                isOver && "text-amber-600",
                                !isShort && !isOver && "text-muted-foreground",
                              )}
                            >
                              {variance === 0
                                ? "—"
                                : `${isOver ? "+" : ""}${variance.toLocaleString()}`}
                            </TableCell>
                            <TableCell className="py-2.5 text-xs text-muted-foreground max-w-[160px] truncate">
                              {line.notes ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
