"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
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

const TXN_TYPE_CONFIG: Record<TransactionType, { label: string; badgeClass: string }> = {
  PURCHASE: { label: "Purchase", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SALE: { label: "Sale", badgeClass: "bg-red-50 text-red-700 border-red-200" },
  GRN: { label: "GRN", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  ADJUSTMENT_IN: { label: "Adj In", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ADJUSTMENT_OUT: { label: "Adj Out", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  TRANSFER_IN: { label: "Transfer In", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  TRANSFER_OUT: { label: "Transfer Out", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  RETURN_IN: { label: "Return In", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  RETURN_OUT: { label: "Return Out", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
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

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";

function TxnTypeBadge({ type }: { type: TransactionType }) {
  const cfg = TXN_TYPE_CONFIG[type];
  return (
    <Badge variant="outline" className={cn("h-4 text-[9px] px-1.5 py-0 font-medium whitespace-nowrap", cfg.badgeClass)}>
      {cfg.label}
    </Badge>
  );
}

export default function MovementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateParam = searchParams.get("date") ?? "30d";
  const typeParam = searchParams.get("type") ?? "all";
  const searchQ = searchParams.get("q") ?? "";

  const datePreset: DatePreset = isDatePreset(dateParam) ? dateParam : "30d";
  const txnTypeFilter: TransactionType | "all" = isTransactionTypeOrAll(typeParam) ? typeParam : "all";

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

  const rawTransactions: StockTransaction[] = txnData?.items ?? [];
  const total = txnData?.total ?? 0;
  const totalPages = txnData?.totalPages ?? 1;
  const currentPage = txnData?.page ?? page;

  const transactions = useMemo(() => {
    if (!searchQ) return rawTransactions;
    const q = searchQ.toLowerCase();
    return rawTransactions.filter(
      (txn) =>
        (txn.productVariant?.product?.name?.toLowerCase().includes(q) ?? false) ||
        (txn.productVariant?.sku?.toLowerCase().includes(q) ?? false) ||
        (txn.productVariant?.name?.toLowerCase().includes(q) ?? false) ||
        (txn.location?.name?.toLowerCase().includes(q) ?? false),
    );
  }, [rawTransactions, searchQ]);

  const rangeStart = total === 0 ? 0 : (currentPage - 1) * LIMIT + 1;
  const rangeEnd = Math.min(currentPage * LIMIT, total);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) params.set("q", e.target.value);
    else params.delete("q");
    router.replace(`?${params.toString()}`);
    setPage(1);
  }

  const handleDatePresetChange = useCallback((val: string) => {
    if (isDatePreset(val)) {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "30d") params.delete("date");
      else params.set("date", val);
      router.replace(`?${params.toString()}`);
      setPage(1);
    }
  }, [router, searchParams]);

  const handleTypeChange = useCallback((val: string) => {
    if (isTransactionTypeOrAll(val)) {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("type");
      else params.set("type", val);
      router.replace(`?${params.toString()}`);
      setPage(1);
    }
  }, [router, searchParams]);

  function handleRetry() { void refetch(); }

  function handleResetFilters() {
    router.replace("?");
    setPage(1);
  }

  function handlePrevPage() { setPage((p) => Math.max(1, p - 1)); }
  function handleNextPage() { setPage((p) => Math.min(totalPages, p + 1)); }

  const hasActiveFilters = searchQ || typeParam !== "all" || datePreset !== "30d";
  const subtitle = total > 0 ? `${total} movement${total !== 1 ? "s" : ""}` : undefined;

  return (
    <PageWrapper
      title="Stock Movements"
      eyebrow="Inventory / Stock"
      subtitle={subtitle}
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              placeholder="Search product or location…"
              value={searchQ}
              onChange={handleSearchChange}
              className="h-8 w-full pl-8 text-xs"
            />
          </div>
          <div className="hidden sm:flex min-w-0 flex-row flex-nowrap items-center gap-2">
            <Select value={txnTypeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
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
            <Select value={datePreset} onValueChange={handleDatePresetChange}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <SkeletonTable rows={8} columns={8} />
      ) : isError ? (
        <ErrorState
          title="Failed to load movements"
          description="An error occurred while fetching stock transactions."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      ) : transactions.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={
              <EmptyActivityIllustration />
            }
            title="No movements found"
            description="No stock movements match the selected filters."
            action={{ label: "Clear Filters", onClick: handleResetFilters }}
            className="flex-1 min-h-[40vh]"
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
            <div className="rounded-md border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/80 hover:bg-muted/80">
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
                          className="h-8 border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="px-2 py-1">
                            <TxnTypeBadge type={txn.transactionType} />
                          </TableCell>
                          <TableCell className="px-2 py-1">
                            <div className="font-medium text-[11px] text-foreground truncate max-w-[160px]">
                              {txn.productVariant?.product?.name ??
                                txn.productVariant?.name ??
                                "—"}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {txn.productVariant?.sku ?? "—"}
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">
                            {txn.location?.name ?? "—"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "px-2 py-1 text-right font-mono tabular-nums font-semibold text-[11px]",
                              isPositive ? "text-emerald-600" : "text-red-600",
                            )}
                          >
                            {isPositive ? "+" : ""}
                            {txn.quantityChange.toLocaleString()}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px] font-medium">
                            {Number(txn.quantityAfter).toLocaleString()}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-[11px] text-muted-foreground font-mono">
                            {ref || "—"}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-[11px] text-muted-foreground whitespace-nowrap">
                            {format(new Date(txn.createdAt), "dd MMM yyyy, HH:mm")}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">
                            {txn.creator?.name ?? "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t">
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
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
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
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
