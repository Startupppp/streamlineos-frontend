"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, AlertCircle } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
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

const TXN_TYPE_LABELS: Record<TransactionType, string> = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  ADJUSTMENT_IN: "Adjustment In",
  ADJUSTMENT_OUT: "Adjustment Out",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  RETURN_IN: "Return In",
  RETURN_OUT: "Return Out",
  GRN: "Goods Receipt",
};

const TXN_TYPE_COLORS: Record<TransactionType, string> = {
  PURCHASE: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  SALE: "bg-red-50 text-red-700 border-red-200/70",
  ADJUSTMENT_IN: "bg-blue-50 text-blue-700 border-blue-200/70",
  ADJUSTMENT_OUT: "bg-orange-50 text-orange-700 border-orange-200/70",
  TRANSFER_IN: "bg-violet-50 text-violet-700 border-violet-200/70",
  TRANSFER_OUT: "bg-purple-50 text-purple-700 border-purple-200/70",
  RETURN_IN: "bg-teal-50 text-teal-700 border-teal-200/70",
  RETURN_OUT: "bg-rose-50 text-rose-700 border-rose-200/70",
  GRN: "bg-slate-50 text-slate-600 border-slate-200/70",
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
  return val === "all" || val in TXN_TYPE_LABELS;
}

const ALL_TXN_TYPES: TransactionType[] = [
  "PURCHASE",
  "SALE",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "RETURN_IN",
  "RETURN_OUT",
  "GRN",
];

function TxnTypeBadge({ type }: { type: TransactionType }) {
  return (
    <Badge
      className={cn(
        "text-[10px] px-1.5 py-0 h-4 whitespace-nowrap",
        TXN_TYPE_COLORS[type] ?? "bg-muted text-muted-foreground",
      )}
    >
      {TXN_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}

function MovementsTableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <TableHead key={i}><Skeleton className="h-3 w-16" /></TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 8 }).map((__, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
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

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

  const filters = useMemo(
    () => ({
      ...dateRange,
      ...(txnTypeFilter !== "all" ? { transactionType: txnTypeFilter } : {}),
    }),
    [dateRange, txnTypeFilter],
  );

  const { data: txnData, isLoading, isError, refetch } = useStockTransactions(filters);

  const transactions: StockTransaction[] = txnData?.items ?? [];

  function handleRetry() { void refetch(); }

  function handleResetFilters() {
    setDatePreset("30d");
    setTxnTypeFilter("all");
  }

  const handleDatePresetChange = useCallback((val: string) => {
    if (isDatePreset(val)) setDatePreset(val);
  }, []);

  const handleTypeChange = useCallback((val: string) => {
    if (isTransactionTypeOrAll(val)) setTxnTypeFilter(val);
  }, []);

  return (
    <PageWrapper
      title="Stock Movements"
      subtitle="Transaction ledger showing all inventory movements"
      badge={String(transactions.length)}
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
                  {TXN_TYPE_LABELS[t]}
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
            illustration={<AlertCircle className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />}
            title="Failed to load movements"
            description="An error occurred while fetching stock transactions. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
          />
        </motion.div>
      ) : transactions.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={<ArrowUpDown className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />}
            title="No transactions found"
            description="No stock movements match the selected filters."
            action={{ label: "Clear Filters", onClick: handleResetFilters }}
          />
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeUp}>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Product</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Qty Change</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Before</TableHead>
                    <TableHead className="text-xs font-semibold text-right">After</TableHead>
                    <TableHead className="text-xs font-semibold">Reference</TableHead>
                    <TableHead className="text-xs font-semibold">User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => {
                    const isPositive = txn.quantityChange > 0;
                    const ref = [txn.referenceType, txn.referenceId]
                      .filter(Boolean)
                      .join(" #");
                    return (
                      <TableRow key={txn.id} className="text-sm">
                        <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(txn.createdAt), "dd MMM yyyy, HH:mm")}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="font-medium text-foreground truncate max-w-[180px]">
                            {txn.productVariant?.product?.name ?? txn.productVariant?.name ?? "—"}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {txn.productVariant?.sku ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <TxnTypeBadge type={txn.transactionType} />
                        </TableCell>
                        <TableCell
                          className={cn(
                            "py-2.5 text-right tabular-nums font-semibold",
                            isPositive ? "text-emerald-600" : "text-red-600",
                          )}
                        >
                          {isPositive ? "+" : ""}
                          {txn.quantityChange.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums text-muted-foreground">
                          {Number(txn.quantityBefore).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums">
                          {Number(txn.quantityAfter).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-muted-foreground font-mono">
                          {ref || "—"}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-muted-foreground">
                          {txn.creator?.name ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
