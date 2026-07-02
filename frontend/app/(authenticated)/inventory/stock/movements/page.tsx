"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
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
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useStockTransactions,
  type StockTransaction,
  type TransactionType,
} from "@/hooks/api/inventory/stock";
import { cn } from "@/lib/utils";

const LIMIT = 25;

const TXN_TYPE_CONFIG: Record<TransactionType, { label: string; color: string }> = {
  PURCHASE: { label: "Purchase", color: "text-green-700 bg-green-50" },
  SALE: { label: "Sale", color: "text-red-700 bg-red-50" },
  GRN: { label: "GRN", color: "text-blue-700 bg-blue-50" },
  ADJUSTMENT_IN: { label: "Adj In", color: "text-emerald-700 bg-emerald-50" },
  ADJUSTMENT_OUT: { label: "Adj Out", color: "text-orange-700 bg-orange-50" },
  TRANSFER_IN: { label: "Transfer In", color: "text-violet-700 bg-violet-50" },
  TRANSFER_OUT: { label: "Transfer Out", color: "text-purple-700 bg-purple-50" },
  RETURN_IN: { label: "Return In", color: "text-teal-700 bg-teal-50" },
  RETURN_OUT: { label: "Return Out", color: "text-amber-700 bg-amber-50" },
};

type DatePreset = "7d" | "30d" | "90d" | "all";

function getDateRange(preset: DatePreset): { fromDate?: string; toDate?: string } {
  if (preset === "all") return {};
  const now = new Date();
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  return {
    fromDate: format(startOfDay(subDays(now, days)), "yyyy-MM-dd"),
    toDate: format(endOfDay(now), "yyyy-MM-dd"),
  };
}

function isDatePreset(val: string): val is DatePreset {
  return val === "7d" || val === "30d" || val === "90d" || val === "all";
}

function isTransactionTypeOrAll(val: string): val is TransactionType | "all" {
  return val === "all" || val in TXN_TYPE_CONFIG;
}

const ALL_TXN_TYPES = Object.keys(TXN_TYPE_CONFIG) as TransactionType[];

const TH = "text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5";

function TxnTypeBadge({ type }: { type: TransactionType }) {
  const cfg = TXN_TYPE_CONFIG[type];
  return (
    <Badge
      className={cn(
        "text-xs px-1.5 py-0.5 rounded-md font-medium border-0 whitespace-nowrap",
        cfg.color,
      )}
    >
      {cfg.label}
    </Badge>
  );
}

function MovementsTableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {Array.from({ length: 8 }).map((_, i) => (
              <TableHead key={i} className={TH}>
                <Skeleton className="h-3 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i} className="border-b border-border/50">
              {Array.from({ length: 8 }).map((__, j) => (
                <TableCell key={j} className="px-3 py-2.5">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function MovementsPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [txnTypeFilter, setTxnTypeFilter] = useState<TransactionType | "all">("all");
  const [page, setPage] = useState(1);

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

  const filters = useMemo(
    () => ({
      ...dateRange,
      ...(txnTypeFilter !== "all" ? { transactionType: txnTypeFilter } : {}),
      page,
      limit: LIMIT,
    }),
    [dateRange, txnTypeFilter, page],
  );

  const { data: txnData, isLoading, isError, refetch } = useStockTransactions(filters);

  const transactions: StockTransaction[] = txnData?.items ?? [];
  const total = txnData?.total ?? 0;
  const totalPages = txnData?.totalPages ?? 1;
  const currentPage = txnData?.page ?? page;

  const rangeStart = total === 0 ? 0 : (currentPage - 1) * LIMIT + 1;
  const rangeEnd = Math.min(currentPage * LIMIT, total);

  function handleRetry() {
    void refetch();
  }

  function handleResetFilters() {
    setDatePreset("30d");
    setTxnTypeFilter("all");
    setPage(1);
  }

  const handleDatePresetChange = useCallback((val: string) => {
    if (isDatePreset(val)) {
      setDatePreset(val);
      setPage(1);
    }
  }, []);

  const handleTypeChange = useCallback((val: string) => {
    if (isTransactionTypeOrAll(val)) {
      setTxnTypeFilter(val);
      setPage(1);
    }
  }, []);

  function handlePrevPage() {
    setPage((p) => Math.max(1, p - 1));
  }

  function handleNextPage() {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  return (
    <PageWrapper
      title="Stock Movements"
      subtitle="Transaction ledger showing all inventory movements"
      badge={total > 0 ? String(total) : undefined}
      filters={
        <>
          <Select value={datePreset} onValueChange={handleDatePresetChange}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={txnTypeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ALL_TXN_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TXN_TYPE_CONFIG[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
    >
      {isLoading ? (
        <MovementsTableSkeleton />
      ) : isError ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={
              <AlertCircle className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
            }
            title="Failed to load movements"
            description="An error occurred while fetching stock transactions. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
          />
        </motion.div>
      ) : transactions.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={
              <ArrowUpDown className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
            }
            title="No movements found"
            description="No stock movements match the selected filters."
            action={{ label: "Clear Filters", onClick: handleResetFilters }}
          />
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          <motion.div variants={fadeUp}>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className={TH}>Type</TableHead>
                    <TableHead className={TH}>Product</TableHead>
                    <TableHead className={TH}>Location</TableHead>
                    <TableHead className={cn(TH, "text-right")}>Qty Change</TableHead>
                    <TableHead className={cn(TH, "text-right")}>Balance After</TableHead>
                    <TableHead className={TH}>Reference</TableHead>
                    <TableHead className={TH}>Date</TableHead>
                    <TableHead className={TH}>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => {
                    const isPositive = txn.quantityChange > 0;
                    const ref = [txn.referenceType, txn.referenceId]
                      .filter(Boolean)
                      .join(" #");
                    return (
                      <TableRow
                        key={txn.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="px-3 py-2.5">
                          <TxnTypeBadge type={txn.transactionType} />
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <div className="font-medium text-sm text-foreground truncate max-w-[180px]">
                            {txn.productVariant?.product?.name ??
                              txn.productVariant?.name ??
                              "—"}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {txn.productVariant?.sku ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-xs text-muted-foreground">
                          {txn.location?.name ?? "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "px-3 py-2.5 text-right tabular-nums font-semibold text-sm",
                            isPositive ? "text-emerald-600" : "text-red-600",
                          )}
                        >
                          {isPositive ? "+" : ""}
                          {txn.quantityChange.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right tabular-nums text-sm font-medium">
                          {Number(txn.quantityAfter).toLocaleString()}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-xs text-muted-foreground font-mono">
                          {ref || "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(txn.createdAt), "dd MMM yyyy, HH:mm")}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-xs text-muted-foreground">
                          {txn.creator?.name ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="flex items-center justify-between px-1"
          >
            <span className="text-xs text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {total} movements
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Prev
              </Button>
              <span className="text-xs text-muted-foreground px-1">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
