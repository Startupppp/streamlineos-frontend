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
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { ErrorState } from "@/components/shared";
import { useInventoryDashboard, useStockSummary, useReorderReport } from "@/hooks/api/inventory/reports";
import { useProducts } from "@/hooks/api/inventory/products";
import { RecentMovementsTable } from "./inventory-recent-movements";

interface DashboardData {
  salesOrders: { totalOpen: number; totalShipped: number };
  inventory: {
    totalStockValue: string;
    lowStockItemCount: number;
    pendingPurchaseOrders: number;
  };
}

interface StockSummaryRow {
  productId: number;
  onHandQty: number;
}

interface ReorderReportRow {
  productId: number;
  productName: string;
  sku: string;
  availableQty: number;
  reorderPoint: number;
}

interface ReorderItem {
  productId: number;
  productName: string;
  variantSku: string;
  onHand: number;
  reorderPoint: number;
  deficit: number;
  urgency: "critical" | "high" | "medium";
}

function extractItems<T>(raw: T[] | { items?: T[] } | null | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : (raw.items ?? []);
}

function mapReorderRow(row: ReorderReportRow): ReorderItem {
  const deficit = Math.max(0, row.reorderPoint - row.availableQty);
  const urgency: ReorderItem["urgency"] =
    row.availableQty <= 0
      ? "critical"
      : row.reorderPoint > 0 && row.availableQty / row.reorderPoint <= 0.25
        ? "high"
        : "medium";
  return {
    productId: row.productId,
    productName: row.productName,
    variantSku: row.sku,
    onHand: row.availableQty,
    reorderPoint: row.reorderPoint,
    deficit,
    urgency,
  };
}

const URGENCY_CONFIG: Record<
  ReorderItem["urgency"],
  { label: string; className: string; dotClass: string }
> = {
  critical: { label: "Critical", className: "bg-red-50 border-red-200", dotClass: "bg-red-500" },
  high: { label: "High", className: "bg-amber-50 border-amber-200", dotClass: "bg-amber-500" },
  medium: { label: "Medium", className: "bg-blue-50 border-blue-200", dotClass: "bg-blue-400" },
};

function KpiSkeletons() {
  return (
    <StatCardGrid cols={4}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
          <Skeleton className="h-8 w-8 rounded-md shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      ))}
    </StatCardGrid>
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
          <div className="space-y-1 text-right">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LowStockAlertSection() {
  const { data: rawItems, isLoading, error, refetch } = useReorderReport();
  const items = extractItems(rawItems as ReorderReportRow[] | { items?: ReorderReportRow[] }).map(
    mapReorderRow,
  );

  function handleRetry(): void {
    void refetch();
  }

  if (isLoading) return <LowStockSkeleton />;

  if (error) {
    return (
      <ErrorState
        compact
        title="Failed to load alerts"
        description="Could not retrieve the reorder report."
        onRetry={handleRetry}
      />
    );
  }

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
              <p className="text-[11px] font-semibold text-foreground truncate">{item.productName}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{item.variantSku}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-muted-foreground">
                On hand:{" "}
                <span className="font-semibold tabular-nums text-foreground">{item.onHand}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Reorder at{" "}
                <span className="tabular-nums">{item.reorderPoint}</span> · Need{" "}
                <span className="tabular-nums">{item.deficit}</span> more
              </p>
            </div>
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 shrink-0">
              {urgency.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export function InventoryDashboardClient() {
  const {
    data: rawDashboard,
    isLoading: dashLoading,
    error: dashError,
    refetch: dashRefetch,
  } = useInventoryDashboard();
  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
    refetch: productsRefetch,
  } = useProducts({ limit: 1 });
  const {
    data: rawStockSummary,
    isLoading: stockSummaryLoading,
    error: stockSummaryError,
    refetch: stockSummaryRefetch,
  } = useStockSummary();

  const dashboard = rawDashboard as DashboardData | undefined;
  const stockSummaryRows = extractItems(
    rawStockSummary as StockSummaryRow[] | { items?: StockSummaryRow[] },
  );

  const isKpiLoading = dashLoading || productsLoading || stockSummaryLoading;
  const isKpiError = !!(dashError || productsError || stockSummaryError);

  const totalSkus = productsData?.total ?? 0;
  const totalOnHand = stockSummaryRows.reduce((acc, item) => acc + item.onHandQty, 0);
  const lowStockCount = dashboard?.inventory.lowStockItemCount ?? 0;
  const openSalesOrders = dashboard?.salesOrders.totalOpen ?? 0;

  const hasAnyData = !isKpiLoading && (totalSkus > 0 || totalOnHand > 0);

  function handleKpiRetry(): void {
    void dashRefetch();
    void productsRefetch();
    void stockSummaryRefetch();
  }

  const addProductAction = (
    <Link
      href="/inventory/products"
      className="inline-flex items-center gap-1.5 h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      Add Product
    </Link>
  );

  if (!isKpiLoading && !isKpiError && !hasAnyData) {
    return (
      <PageWrapper
        eyebrow="Operations · Inventory"
        title="Inventory Dashboard"
        subtitle="Track stock levels, movements, and reorder alerts."
        actions={addProductAction}
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
      actions={addProductAction}
    >
      <div className="space-y-6">
        {isKpiLoading ? (
          <KpiSkeletons />
        ) : isKpiError ? (
          <ErrorState
            title="Failed to load dashboard"
            description="Could not retrieve inventory metrics. Please try again."
            onRetry={handleKpiRetry}
          />
        ) : (
          <StatCardGrid cols={4}>
            <StatCard
              label="Total SKUs"
              value={totalSkus}
              icon={Package}
              tone="blue"
              href="/inventory/products"
            />
            <StatCard
              label="Total On Hand"
              value={totalOnHand.toLocaleString()}
              icon={Layers}
              tone="emerald"
              href="/inventory/stock"
            />
            <StatCard
              label="Low Stock Items"
              value={lowStockCount}
              icon={AlertTriangle}
              tone={lowStockCount > 0 ? "red" : "emerald"}
              href="/inventory/stock"
            />
            <StatCard
              label="Open Sales Orders"
              value={openSalesOrders}
              icon={ShoppingCart}
              tone="amber"
              href="/inventory/sales-orders"
            />
          </StatCardGrid>
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
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <RecentMovementsTable />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                Low Stock Alerts
              </CardTitle>
              <CardAction>
                <Link
                  href="/inventory/stock"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
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
