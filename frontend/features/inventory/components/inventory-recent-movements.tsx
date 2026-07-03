"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useStockTransactions } from "@/hooks/api/inventory/stock";

interface TransactionVariant {
  id: number;
  name: string;
  sku: string;
  product?: { id: number; name: string };
}

interface TransactionLocation {
  id: number;
  name: string;
  code: string;
}

interface TransactionCreator {
  id: string;
  name: string;
}

interface StockTransaction {
  id: number;
  transactionType: string;
  quantityChange: number | string;
  createdAt: string;
  notes: string | null;
  productVariant: TransactionVariant;
  location: TransactionLocation;
  creator: TransactionCreator | null;
}

interface TransactionsData {
  items: StockTransaction[];
  total: number;
  page: number;
  totalPages: number;
}

const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  PURCHASE_IN: { label: "Purchase In", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SALE_OUT: { label: "Sale Out", className: "bg-red-50 text-red-700 border-red-200" },
  ADJUSTMENT_IN: { label: "Adj In", className: "bg-blue-50 text-blue-700 border-blue-200" },
  ADJUSTMENT_OUT: { label: "Adj Out", className: "bg-amber-50 text-amber-700 border-amber-200" },
  TRANSFER_IN: { label: "Transfer In", className: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  TRANSFER_OUT: { label: "Transfer Out", className: "bg-violet-50 text-violet-700 border-violet-200" },
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function MovementsTableSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-8 flex items-center gap-2 px-2">
          <Skeleton className="h-3 w-24 shrink-0" />
          <Skeleton className="h-3 w-32 flex-1" />
          <Skeleton className="h-4 w-20 rounded shrink-0" />
          <Skeleton className="h-3 w-10 shrink-0" />
          <Skeleton className="h-3 w-24 shrink-0" />
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function RecentMovementsTable() {
  const { data: rawData, isLoading, error, refetch } = useStockTransactions({ limit: 10 });
  const transactionsData = rawData as TransactionsData | undefined;
  const movements = transactionsData?.items ?? [];

  function handleRetry(): void {
    void refetch();
  }

  if (isLoading) return <MovementsTableSkeleton />;

  if (error) {
    return (
      <ErrorState
        compact
        title="Failed to load movements"
        description="Could not retrieve recent stock transactions."
        onRetry={handleRetry}
      />
    );
  }

  if (movements.length === 0) {
    return (
      <EmptyState
        compact
        title="No movements yet"
        description="Stock transactions will appear here as items move in and out."
      />
    );
  }

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
        <TableRow className="border-b-2 border-border">
          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Date</TableHead>
          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Product</TableHead>
          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Type</TableHead>
          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Qty</TableHead>
          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Location</TableHead>
          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">User</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((row) => {
          const config = MOVEMENT_TYPE_CONFIG[row.transactionType] ?? {
            label: row.transactionType,
            className: "bg-slate-100 text-slate-700 border-slate-200",
          };
          const qtyChange = Number(row.quantityChange);
          const absQty = Math.abs(qtyChange);
          const isPositive = qtyChange >= 0;

          return (
            <TableRow key={row.id} className="h-8 hover:bg-muted/30 transition-colors">
              <TableCell className="px-2 py-1 text-[11px] text-muted-foreground whitespace-nowrap">
                {formatDateTime(row.createdAt)}
              </TableCell>
              <TableCell className="px-2 py-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground truncate max-w-[160px]">
                  {row.productVariant.product?.name ?? row.productVariant.name}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">
                  {row.productVariant.sku}
                </p>
              </TableCell>
              <TableCell className="px-2 py-1">
                <Badge
                  variant="outline"
                  className={`h-4 text-[9px] px-1.5 py-0 font-medium ${config.className}`}
                >
                  {config.label}
                </Badge>
              </TableCell>
              <TableCell className="px-2 py-1 text-right">
                <span
                  className={`text-[11px] font-mono tabular-nums font-semibold ${
                    isPositive ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {isPositive ? `+${absQty}` : `-${absQty}`}
                </span>
              </TableCell>
              <TableCell className="px-2 py-1">
                <p className="text-[11px] text-foreground truncate max-w-[120px]">
                  {row.location.name}
                </p>
              </TableCell>
              <TableCell className="px-2 py-1">
                <span className="text-[11px] text-muted-foreground truncate max-w-[100px] block">
                  {row.creator?.name ?? "System"}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
