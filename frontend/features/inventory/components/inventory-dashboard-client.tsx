"use client";

import Link from "next/link";
import {
  Package,
  Layers,
  AlertTriangle,
  ShoppingCart,
  ArrowRight,
  Plus,
  DollarSign,
  Calendar,
  ShieldAlert,
  Truck,
  BookOpen,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { ErrorState } from "@/components/shared";
import { EmptyProductsIllustration } from "@/components/illustrations";
import {
  useInventoryDashboard,
  useReorderReport,
  type ReorderReportRow,
} from "@/hooks/api/inventory/reports";
import { RecentMovementsTable } from "./inventory-recent-movements";
import { DashboardInsightsPanel } from "./dashboard-insights-panel";

const URGENCY_CONFIG: Record<
  ReorderReportRow["urgency"],
  { label: string; className: string; dotClass: string }
> = {
  critical: { label: "Critical", className: "bg-red-50 border-red-200", dotClass: "bg-red-500" },
  high: { label: "High", className: "bg-amber-50 border-amber-200", dotClass: "bg-amber-500" },
  medium: { label: "Medium", className: "bg-blue-50 border-blue-200", dotClass: "bg-blue-400" },
};

function KpiSkeletons() {
  return (
    <StatCardGrid cols={4}>
      {Array.from({ length: 7 }).map((_, i) => (
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
  const { data: items = [], isLoading, error, refetch } = useReorderReport();

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
        const urgency = URGENCY_CONFIG[item.urgency];
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
    data: dashboard,
    isLoading: isKpiLoading,
    error: kpiError,
    refetch: dashRefetch,
  } = useInventoryDashboard();

  const totalSkus = dashboard?.totalSkus ?? 0;
  const totalOnHand = dashboard?.totalOnHand ?? 0;
  const lowStockCount = dashboard?.lowStockCount ?? 0;
  const openSalesOrders = dashboard?.openSoCount ?? 0;
  const stockValue = dashboard?.stockValue ?? 0;
  const expiringLotsCount = dashboard?.expiringLotsCount ?? 0;
  const qualityHoldQty = dashboard?.qualityHoldQty ?? 0;
  const failedChannelSyncsCount = dashboard?.failedChannelSyncsCount ?? 0;
  const openInspectionsCount = dashboard?.openInspectionsCount ?? 0;
  const activeReservationsCount = dashboard?.activeReservationsCount ?? 0;
  const openShipmentsCount = dashboard?.openShipmentsCount ?? 0;
  const recentInsights = dashboard?.recentInsights ?? [];

  const hasAlerts =
    expiringLotsCount > 0 ||
    qualityHoldQty > 0 ||
    failedChannelSyncsCount > 0 ||
    openInspectionsCount > 0;

  const hasAnyData = !isKpiLoading && (totalSkus > 0 || totalOnHand > 0);

  function handleKpiRetry(): void {
    void dashRefetch();
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

  if (!isKpiLoading && !kpiError && !hasAnyData) {
    return (
      <PageWrapper
        eyebrow="Operations · Inventory"
        title="Inventory Dashboard"
        subtitle="Track stock levels, movements, and reorder alerts."
        actions={addProductAction}
      >
        <EmptyState
          illustration={<EmptyProductsIllustration />}
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
        ) : kpiError ? (
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
            <StatCard
              label="Stock Value"
              value={`$${(stockValue / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              tone="violet"
            />
            <StatCard
              label="Active Reservations"
              value={activeReservationsCount}
              icon={BookOpen}
              tone="blue"
            />
            <StatCard
              label="Open Shipments"
              value={openShipmentsCount}
              icon={Truck}
              tone="amber"
            />
          </StatCardGrid>
        )}

        {hasAlerts && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-[11px] font-semibold text-amber-700 shrink-0">Attention needed:</span>
            {expiringLotsCount > 0 && (
              <Link href="/inventory/expiry">
                <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 text-[10px] h-5 cursor-pointer hover:bg-amber-100 transition-colors">
                  <Calendar className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                  {expiringLotsCount} expiring lot{expiringLotsCount !== 1 ? "s" : ""}
                </Badge>
              </Link>
            )}
            {qualityHoldQty > 0 && (
              <Link href="/inventory/stock">
                <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700 text-[10px] h-5 cursor-pointer hover:bg-amber-100 transition-colors">
                  <ShieldAlert className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                  {qualityHoldQty} on quality hold
                </Badge>
              </Link>
            )}
            {failedChannelSyncsCount > 0 && (
              <Link href="/inventory">
                <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700 text-[10px] h-5 cursor-pointer hover:bg-red-100 transition-colors">
                  <AlertTriangle className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                  {failedChannelSyncsCount} failed sync{failedChannelSyncsCount !== 1 ? "s" : ""}
                </Badge>
              </Link>
            )}
            {openInspectionsCount > 0 && (
              <Link href="/inventory/stock">
                <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700 text-[10px] h-5 cursor-pointer hover:bg-blue-100 transition-colors">
                  <BookOpen className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                  {openInspectionsCount} open inspection{openInspectionsCount !== 1 ? "s" : ""}
                </Badge>
              </Link>
            )}
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

        <DashboardInsightsPanel insights={recentInsights} />
      </div>
    </PageWrapper>
  );
}
