"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
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
import { useStockTransactions } from "@/lib/api/hooks/inventory/stock";
import { cn } from "@/lib/utils";

type TxnType =
  | "PURCHASE_RECEIPT"
  | "SALE_ISSUE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "RETURN_IN"
  | "RETURN_OUT"
  | "OPENING";

interface Transaction {
  id: number;
  createdAt: string;
  productName: string;
  sku: string;
  transactionType: TxnType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  createdByName?: string | null;
}

const TXN_TYPE_LABELS: Record<TxnType, string> = {
  PURCHASE_RECEIPT: "Purchase Receipt",
  SALE_ISSUE: "Sale Issue",
  ADJUSTMENT_IN: "Adjustment In",
  ADJUSTMENT_OUT: "Adjustment Out",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  RETURN_IN: "Return In",
  RETURN_OUT: "Return Out",
  OPENING: "Opening",
};

const TXN_TYPE_COLORS: Record<TxnType, string> = {
  PURCHASE_RECEIPT: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  SALE_ISSUE: "bg-red-50 text-red-700 border-red-200/70",
  ADJUSTMENT_IN: "bg-blue-50 text-blue-700 border-blue-200/70",
  ADJUSTMENT_OUT: "bg-orange-50 text-orange-700 border-orange-200/70",
  TRANSFER_IN: "bg-violet-50 text-violet-700 border-violet-200/70",
  TRANSFER_OUT: "bg-purple-50 text-purple-700 border-purple-200/70",
  RETURN_IN: "bg-teal-50 text-teal-700 border-teal-200/70",
  RETURN_OUT: "bg-rose-50 text-rose-700 border-rose-200/70",
  OPENING: "bg-slate-50 text-slate-600 border-slate-200/70",
};

type DatePreset = "7d" | "30d" | "90d" | "all";

function getDateRange(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  if (preset === "all") return {};
  const now = new Date();
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  return {
    dateFrom: format(startOfDay(subDays(now, days)), "yyyy-MM-dd"),
    dateTo: format(endOfDay(now), "yyyy-MM-dd"),
  };
}

const ALL_TXN_TYPES = Object.keys(TXN_TYPE_LABELS) as TxnType[];

function TxnTypeBadge({ type }: { type: TxnType }) {
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
  const [txnTypeFilter, setTxnTypeFilter] = useState<TxnType | "all">("all");

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

  const filters = useMemo(
    () => ({
      ...dateRange,
      ...(txnTypeFilter !== "all" ? { type: txnTypeFilter } : {}),
    }),
    [dateRange, txnTypeFilter],
  );

  const { data: txnData, isLoading } = useStockTransactions(filters);

  const transactions = useMemo(() => {
    const data = txnData as { items?: Transaction[]; data?: Transaction[] } | Transaction[] | null;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
    return [];
  }, [txnData]);

  const handleDatePresetChange = useCallback((val: string) => {
    setDatePreset(val as DatePreset);
  }, []);

  const handleTypeChange = useCallback((val: string) => {
    setTxnTypeFilter(val as TxnType | "all");
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
      ) : transactions.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            title="No transactions found"
            description="No stock movements match the selected filters."
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
                            {txn.productName}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {txn.sku}
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
                          {txn.createdByName ?? "—"}
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
