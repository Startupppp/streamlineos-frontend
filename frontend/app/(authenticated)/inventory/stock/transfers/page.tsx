"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { EmptyTransferIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useTransfers, type TransferStatus } from "@/hooks/api/inventory/stock";
import { NewTransferSheet } from "@/features/inventory/components/stock/new-transfer-sheet";
import {
  TRANSFER_STATUS_BADGE,
  TRANSFER_STATUS_LABEL,
} from "@/features/inventory/lib";
import { cn } from "@/lib/utils";

const ALL_STATUSES: TransferStatus[] = ["PENDING", "RESERVED", "IN_TRANSIT", "COMPLETED", "CANCELLED"];

function isTransferStatus(s: string): s is TransferStatus {
  return (ALL_STATUSES as string[]).includes(s);
}

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";
const LIMIT = 20;

export default function TransfersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get("status") ?? "all";
  const searchQ = searchParams.get("q") ?? "";

  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  const statusFilter = statusParam !== "all" && isTransferStatus(statusParam) ? statusParam : undefined;

  const { data: transfersData, isLoading, isError, refetch } = useTransfers({
    status: statusFilter,
    page,
    limit: LIMIT,
  });

  const totalPages = transfersData?.totalPages ?? 1;
  const total = transfersData?.total ?? 0;

  const transfers = useMemo(() => {
    const rawTransfers = transfersData?.items ?? [];
    if (!searchQ) return rawTransfers;
    const q = searchQ.toLowerCase();
    return rawTransfers.filter(
      (t) =>
        t.referenceNumber.toLowerCase().includes(q) ||
        (t.fromLocationName?.toLowerCase().includes(q) ?? false) ||
        (t.toLocationName?.toLowerCase().includes(q) ?? false),
    );
  }, [transfersData?.items, searchQ]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) params.set("q", e.target.value);
    else params.delete("q");
    params.delete("page");
    setPage(1);
    router.replace(`?${params.toString()}`);
  }

  const handleStatusChange = useCallback((val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "all") params.delete("status");
    else params.set("status", val);
    params.delete("page");
    setPage(1);
    router.replace(`?${params.toString()}`);
  }, [router, searchParams]);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  function handleRetry() { void refetch(); }
  const handlePrevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setPage((p) => Math.min(totalPages, p + 1)), [totalPages]);

  const hasActiveFilters = searchQ || statusParam !== "all";
  const subtitle = !isLoading && total > 0 ? `${total} transfer${total !== 1 ? "s" : ""}` : undefined;

  return (
    <PageWrapper
      title="Stock Transfers"
      eyebrow="Inventory / Stock"
      subtitle={subtitle}
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              placeholder="Search transfers…"
              value={searchQ}
              onChange={handleSearchChange}
              className="h-8 w-full pl-8 text-xs"
            />
          </div>
          <Select value={statusParam} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{TRANSFER_STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      }
      actions={
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />New Transfer
        </Button>
      }
    >
      {isLoading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : isError ? (
        <ErrorState
          title="Failed to load transfers"
          description="An error occurred while fetching transfer records."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      ) : transfers.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <InventoryEmptyState
            illustration={hasActiveFilters ? <EmptySearchIllustration /> : <EmptyTransferIllustration />}
            title={hasActiveFilters ? "No results" : "No transfers found"}
            description={
              hasActiveFilters
                ? "No transfers match your filters."
                : "Create a transfer to move stock between locations."
            }
            action={
              hasActiveFilters
                ? { label: "Clear Filters", href: "?" }
                : { label: "New Transfer", onClick: handleOpenSheet }
            }
            className="flex-1 min-h-[40vh]"
          />
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeUp}>
            <div className="rounded-md border border-border overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/80 hover:bg-muted/80">
                    <TableHead className={TH}>Ref #</TableHead>
                    <TableHead className={TH}>From</TableHead>
                    <TableHead className={TH}>To</TableHead>
                    <TableHead className={cn(TH, "text-right")}>Lines</TableHead>
                    <TableHead className={TH}>Status</TableHead>
                    <TableHead className={TH}>Created</TableHead>
                    <TableHead className={cn(TH, "w-8")} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow
                      key={transfer.id}
                      className="h-8 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/inventory/stock/transfers/${transfer.id}`)}
                    >
                      <TableCell className="px-2 py-1">
                        <Link
                          href={`/inventory/stock/transfers/${transfer.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[11px] font-semibold text-blue-600 hover:underline"
                        >
                          {transfer.referenceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">{transfer.fromLocationName ?? "—"}</TableCell>
                      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">{transfer.toLocationName ?? "—"}</TableCell>
                      <TableCell className="px-2 py-1 text-right text-[11px] font-mono tabular-nums font-medium">{transfer.lineCount}</TableCell>
                      <TableCell className="px-2 py-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-4 text-[9px] px-1.5 py-0 font-medium",
                            TRANSFER_STATUS_BADGE[transfer.status],
                          )}
                        >
                          {TRANSFER_STATUS_LABEL[transfer.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(transfer.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-blue-600 hover:text-blue-700"
                          onClick={(e) => { e.stopPropagation(); router.push(`/inventory/stock/transfers/${transfer.id}`); }}
                          aria-label={`View transfer ${transfer.referenceNumber}`}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Showing {transfers.length > 0 ? (page - 1) * LIMIT + 1 : 0}–{Math.min(page * LIMIT, total)} of {total}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handlePrevPage} disabled={page <= 1}>Previous</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleNextPage} disabled={page >= totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      <NewTransferSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
