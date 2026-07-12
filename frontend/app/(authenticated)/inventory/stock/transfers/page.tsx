"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { EmptyTransferIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared/error-state";
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

const LIMIT = 20;

type TransferRow = {
  id: number;
  referenceNumber: string;
  fromLocationName: string | null | undefined;
  toLocationName: string | null | undefined;
  lineCount: number;
  status: TransferStatus;
  createdAt: string;
};

function buildTransferColumns(
  onView: (id: number, ref: string) => void,
): DataTableColumn<TransferRow>[] {
  return [
    {
      key: "referenceNumber",
      header: "Ref #",
      cell: (row) => (
        <Link
          href={`/inventory/stock/transfers/${row.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-[11px] font-semibold text-blue-600 hover:underline"
        >
          {row.referenceNumber}
        </Link>
      ),
    },
    {
      key: "fromLocationName",
      header: "From",
      cell: (row) => <span className="text-muted-foreground">{row.fromLocationName ?? "—"}</span>,
    },
    {
      key: "toLocationName",
      header: "To",
      cell: (row) => <span className="text-muted-foreground">{row.toLocationName ?? "—"}</span>,
    },
    {
      key: "lineCount",
      header: "Lines",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums font-medium",
      cell: (row) => <span>{row.lineCount}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-[9px] px-1.5 py-0 font-medium", TRANSFER_STATUS_BADGE[row.status])}
        >
          {TRANSFER_STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(row.createdAt), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-8",
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] text-blue-600 hover:text-blue-700"
          onClick={(e) => { e.stopPropagation(); onView(row.id, row.referenceNumber); }}
          aria-label={`View transfer ${row.referenceNumber}`}
        >
          View
        </Button>
      ),
    },
  ];
}

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

  function handleRowClick(row: TransferRow): void {
    router.push(`/inventory/stock/transfers/${row.id}`);
  }

  function handleView(id: number): void {
    router.push(`/inventory/stock/transfers/${id}`);
  }

  const columns = useMemo(() => buildTransferColumns(handleView), []);

  const hasActiveFilters = searchQ || statusParam !== "all";
  const subtitle = !isLoading && total > 0 ? `${total} transfer${total !== 1 ? "s" : ""}` : undefined;

  return (
    <PageWrapper
      title="Stock Transfers"
      eyebrow="Inventory / Stock"
      subtitle={subtitle}
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
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
      {isError ? (
        <ErrorState
          title="Failed to load transfers"
          description="An error occurred while fetching transfer records."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      ) : transfers.length === 0 && !isLoading ? (
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
            <DataTable
              data={transfers}
              columns={columns}
              getRowKey={(row) => row.id}
              onRowClick={handleRowClick}
              isLoading={isLoading}
              pagination={{
                mode: "server",
                page,
                pageSize: LIMIT,
                total,
                onPageChange: setPage,
              }}
              search={{
                value: searchQ,
                onChange: (val) => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (val) params.set("q", val);
                  else params.delete("q");
                  params.delete("page");
                  setPage(1);
                  router.replace(`?${params.toString()}`);
                },
                placeholder: "Search transfers…",
              }}
            />
          </motion.div>
        </motion.div>
      )}
      <NewTransferSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
