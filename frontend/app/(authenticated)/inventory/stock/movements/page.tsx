"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const MOVEMENTS_COLUMNS: DataTableColumn<StockTransaction>[] = [
  {
    key: "transactionType",
    header: "Type",
    cell: (row) => {
      const cfg = TXN_TYPE_CONFIG[row.transactionType];
      return (
        <Badge variant="outline" className={cn("h-4 text-[9px] px-1.5 py-0 font-medium whitespace-nowrap", cfg.badgeClass)}>
          {cfg.label}
        </Badge>
      );
    },
  },
  {
    key: "product",
    header: "Product",
    cell: (row) => (
      <div>
        <div className="font-medium text-[11px] text-foreground truncate max-w-[160px]">
          {row.productVariant?.product?.name ?? row.productVariant?.name ?? "—"}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">
          {row.productVariant?.sku ?? "—"}
        </div>
      </div>
    ),
  },
  {
    key: "location",
    header: "Location",
    className: "text-muted-foreground",
    cell: (row) => <span>{row.location?.name ?? "—"}</span>,
  },
  {
    key: "quantityChange",
    header: "Qty Change",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-semibold",
    cell: (row) => {
      const isPositive = row.quantityChange > 0;
      return (
        <span className={isPositive ? "text-emerald-600" : "text-red-600"}>
          {isPositive ? "+" : ""}{row.quantityChange.toLocaleString()}
        </span>
      );
    },
  },
  {
    key: "quantityAfter",
    header: "Balance After",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-medium",
    cell: (row) => <span>{Number(row.quantityAfter).toLocaleString()}</span>,
  },
  {
    key: "reference",
    header: "Reference",
    className: "text-muted-foreground font-mono",
    cell: (row) => {
      const ref = [row.referenceType, row.referenceId].filter(Boolean).join(" #");
      return <span>{ref || "—"}</span>;
    },
  },
  {
    key: "date",
    header: "Date",
    className: "text-muted-foreground whitespace-nowrap",
    cell: (row) => <span>{format(new Date(row.createdAt), "dd MMM yyyy, HH:mm")}</span>,
  },
  {
    key: "by",
    header: "By",
    className: "text-muted-foreground",
    cell: (row) => <span>{row.creator?.name ?? "—"}</span>,
  },
];

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

  const total = txnData?.total ?? 0;
  const totalPages = txnData?.totalPages ?? 1;
  const currentPage = txnData?.page ?? page;

  const transactions = useMemo(() => {
    const rawTransactions: StockTransaction[] = txnData?.items ?? [];
    if (!searchQ) return rawTransactions;
    const q = searchQ.toLowerCase();
    return rawTransactions.filter(
      (txn) =>
        (txn.productVariant?.product?.name?.toLowerCase().includes(q) ?? false) ||
        (txn.productVariant?.sku?.toLowerCase().includes(q) ?? false) ||
        (txn.productVariant?.name?.toLowerCase().includes(q) ?? false) ||
        (txn.location?.name?.toLowerCase().includes(q) ?? false),
    );
  }, [txnData?.items, searchQ]);

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

  function handleSearchChange(val: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set("q", val);
    else params.delete("q");
    router.replace(`?${params.toString()}`);
    setPage(1);
  }

  const subtitle = total > 0 ? `${total} movement${total !== 1 ? "s" : ""}` : undefined;

  return (
    <PageWrapper
      title="Stock Movements"
      eyebrow="Inventory / Stock"
      subtitle={subtitle}
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
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
      {isError ? (
        <ErrorState
          title="Failed to load movements"
          description="An error occurred while fetching stock transactions."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      ) : transactions.length === 0 && !isLoading ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <InventoryEmptyState
            illustration={<EmptyActivityIllustration />}
            title="No movements found"
            description="No stock movements match the selected filters."
            action={{ label: "Clear Filters", onClick: handleResetFilters }}
            className="flex-1 min-h-[40vh]"
          />
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
          <motion.div variants={fadeUp}>
            <DataTable
              data={transactions}
              columns={MOVEMENTS_COLUMNS}
              getRowKey={(row) => row.id}
              isLoading={isLoading}
              pagination={{
                mode: "server",
                page: currentPage,
                pageSize: LIMIT,
                total,
                onPageChange: setPage,
              }}
              search={{
                value: searchQ,
                onChange: handleSearchChange,
                placeholder: "Search product or location…",
              }}
              minWidth="720px"
            />
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
