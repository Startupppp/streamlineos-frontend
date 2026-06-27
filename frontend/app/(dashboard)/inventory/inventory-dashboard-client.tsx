"use client";

import Link from "next/link";
import {
  Package,
  Layers,
  AlertTriangle,
  ShoppingCart,
  ArrowRight,
  Plus,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { DS } from "@/lib/design-system";
import {
  useInventoryDashboard,
  useReorderReport,
  type InventoryDashboardMovement,
  type MovementType,
  type ReorderReportRow,
  type ReorderUrgency,
} from "@/lib/api/hooks/inventory/reports";

const MOVEMENT_TYPE_CONFIG: Record<MovementType, { label: string; className: string }> = {
  PURCHASE: {
    label: "Purchase",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  SALE: {
    label: "Sale",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  GRN: {
    label: "Goods Receipt",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  ADJUSTMENT_IN: {
    label: "Adj In",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  ADJUSTMENT_OUT: {
    label: "Adj Out",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  TRANSFER_IN: {
    label: "Transfer In",
    className: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },
  TRANSFER_OUT: {
    label: "Transfer Out",
    className: "bg-violet-100 text-violet-700 border-violet-200",
  },
  RETURN_IN: {
    label: "Return In",
    className: "bg-teal-100 text-teal-700 border-teal-200",
  },
  RETURN_OUT: {
    label: "Return Out",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
};

const URGENCY_CONFIG: Record<
  ReorderUrgency,
  { label: string; className: string; dotClass: string }
> = {
  critical: {
    label: "Critical",
    className: "bg-red-50 border-red-200",
    dotClass: "bg-red-500",
  },
  high: {
    label: "High",
    className: "bg-amber-50 border-amber-200",
    dotClass: "bg-amber-500",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-50 border-blue-200",
    dotClass: "bg-blue-400",
  },
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

function KpiSkeletons() {
  return (
    <div className={DS.gridResponsive4}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MovementsTableSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 px-1">
          <Skeleton className="h-3.5 w-24 shrink-0" />
          <Skeleton className="h-3.5 w-32 flex-1" />
          <Skeleton className="h-5 w-20 rounded-full shrink-0" />
          <Skeleton className="h-3.5 w-12 shrink-0" />
          <Skeleton className="h-3.5 w-24 shrink-0" />
          <Skeleton className="h-3.5 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function LowStockSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Skeleton className="h-2 w-2 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentMovementsTable({
  movements,
  isLoading,
}: {
  movements: InventoryDashboardMovement[];
  isLoading: boolean;
}) {
  if (isLoading) return <MovementsTableSkeleton />;

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
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Date</TableHead>
          <TableHead className="text-xs">Product</TableHead>
          <TableHead className="text-xs">Type</TableHead>
          <TableHead className="text-xs text-right">Qty Change</TableHead>
          <TableHead className="text-xs">Location</TableHead>
          <TableHead className="text-xs">User</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((row) => {
          const config = MOVEMENT_TYPE_CONFIG[row.transactionType] ?? {
            label: row.transactionType,
            className: "bg-secondary text-secondary-foreground border-border",
          };
          const absQty = Math.abs(row.quantityChange);
          const isPositive = row.quantityChange >= 0;

          return (
            <TableRow key={row.id}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDateTime(row.createdAt)}
              </TableCell>
              <TableCell className="min-w-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate max-w-[160px]">
                    {row.productName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{row.sku}</p>
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.className}`}
                >
                  {config.label}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    isPositive ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {isPositive ? "+" : "-"}
                  {absQty}
                </span>
              </TableCell>
              <TableCell>
                <div className="min-w-0">
                  <p className="text-xs text-foreground truncate max-w-[120px]">
                    {row.locationName ?? "—"}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground truncate max-w-[100px] block">
                  {row.performedBy ?? "System"}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function LowStockAlertSection() {
  const { data, isLoading } = useReorderReport();
  const items: ReorderReportRow[] = data ?? [];

  if (isLoading) return <LowStockSkeleton />;

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        title="All stock levels healthy"
        description="No items are currently at or below their reorder point."
      />
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const urgency = URGENCY_CONFIG[item.urgency] ?? URGENCY_CONFIG.medium;
        return (
          <div
            key={`${item.productId}-${item.variantSku}`}
            className={`flex items-center gap-3 rounded-lg border p-3 ${urgency.className}`}
          >
            <div className={`h-2 w-2 rounded-full shrink-0 ${urgency.dotClass}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{item.productName}</p>
              <p className="text-[11px] text-muted-foreground">{item.variantSku}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">
                On hand: <span className="font-semibold text-foreground">{item.onHand}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Reorder at {item.reorderPoint} · Need {item.deficit} more
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {urgency.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export function InventoryDashboardClient() {
  const { data: dashboard, isLoading: dashLoading } = useInventoryDashboard();

  const totalSkus = dashboard?.totalSkus ?? 0;
  const totalOnHand = dashboard?.totalOnHand ?? 0;
  const lowStockCount = dashboard?.lowStockCount ?? 0;
  const openSalesOrders = dashboard?.openSoCount ?? 0;
  const recentMovements = dashboard?.recentMovements ?? [];

  const hasAnyData = !dashLoading && (totalSkus > 0 || totalOnHand > 0);

  if (!dashLoading && !hasAnyData) {
    return (
      <PageWrapper
        eyebrow="Operations · Inventory"
        title="Inventory Dashboard"
        subtitle="Track stock levels, movements, and reorder alerts."
        actions={
          <Link
            href="/inventory/products"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        }
      >
        <EmptyState
          title="No inventory data yet"
          description="Add your first product to start tracking stock levels and movements."
          action={{ label: "Add Product", href: "/inventory/products" }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      eyebrow="Operations · Inventory"
      title="Inventory Dashboard"
      subtitle="Track stock levels, movements, and reorder alerts."
      actions={
        <Link
          href="/inventory/products"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      }
    >
      <div className="space-y-6">
        {dashLoading ? (
          <KpiSkeletons />
        ) : (
          <div className={DS.gridResponsive4}>
            <StatCard
              label="Total SKUs"
              value={totalSkus}
              icon={Package}
              color="blue"
              index={0}
              href="/inventory/products"
            />
            <StatCard
              label="Total On Hand"
              value={totalOnHand.toLocaleString()}
              icon={Layers}
              color="green"
              index={1}
              href="/inventory/stock"
            />
            <StatCard
              label="Low Stock Items"
              value={lowStockCount}
              icon={AlertTriangle}
              color={lowStockCount > 0 ? "red" : "green"}
              index={2}
              href="/inventory/stock"
            />
            <StatCard
              label="Open Sales Orders"
              value={openSalesOrders}
              icon={ShoppingCart}
              color="amber"
              index={3}
              href="/inventory/sales-orders"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">
                Recent Movements
              </CardTitle>
              <CardAction>
                <Link
                  href="/inventory/stock"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-2 px-2 pb-2">
              <RecentMovementsTable movements={recentMovements} isLoading={dashLoading} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Low Stock Alerts
              </CardTitle>
              <CardAction>
                <Link
                  href="/inventory/stock"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-3">
              <LowStockAlertSection />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
