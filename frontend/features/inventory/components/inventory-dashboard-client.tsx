"use client";

import Link from "next/link";
import {
  Package,
  Layers,
  AlertTriangle,
  ShoppingCart,
  ArrowRight,
  DollarSign,
  Calendar,
  ShieldAlert,
  Truck,
  BookOpen,
} from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { EmptyProductsIllustration } from "@/components/illustrations";
import {
  useInventoryDashboard,
  useReorderReport,
  type ReorderReportRow,
} from "@/hooks/api/inventory/reports";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";
import { RecentMovementsTable } from "./inventory-recent-movements";
import { DashboardInsightsPanel } from "./dashboard-insights-panel";
import { InventoryAiBriefCard } from "./inventory-ai-brief-card";

function AddProductLink() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Link
      href="/inventory/products/new"
      className="inline-flex items-center gap-1.5 h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={14} aria-hidden="true" />
      Add Product
    </Link>
  );
}

const URGENCY_CONFIG: Record<
  ReorderReportRow["urgency"],
  { label: string; className: string; dotClass: string }
> = {
  critical: { label: "Critical", className: "bg-status-danger-surface border-status-danger-rule", dotClass: "bg-status-danger-fill" },
  high: { label: "High", className: "bg-status-warning-surface border-status-warning-rule", dotClass: "bg-status-warning-fill" },
  medium: { label: "Medium", className: "bg-status-info-surface border-status-info-rule", dotClass: "bg-status-info-fill" },
};

function KpiSkeletons() {
  return <StatCardGridSkeleton cols={4} />;
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

function LowStockAlertSection({ canReadReports }: { canReadReports: boolean }) {
  const { data: reorderData, isLoading, error, refetch } = useReorderReport();
  const items = reorderData?.items ?? [];

  function handleRetry(): void {
    void refetch();
  }

  if (!canReadReports)
    return (
      <NoPermissionState
        compact
        permission="inventory:reports:read"
        title="Alerts hidden"
        description="Reorder alerts are part of inventory reporting."
      />
    );

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
      <InventoryEmptyState
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
              <TruncatedText text={item.productName} className="text-dense font-semibold text-foreground" />
              <p className="text-dense text-muted-foreground font-mono">{item.variantSku}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-dense text-muted-foreground">
                On hand:{" "}
                <span className="font-semibold tabular-nums text-foreground">{item.onHand}</span>
              </p>
              <p className="text-dense text-muted-foreground">
                Reorder at{" "}
                <span className="tabular-nums">{item.reorderPoint}</span> · Need{" "}
                <span className="tabular-nums">{item.deficit}</span> more
              </p>
            </div>
            <Badge variant="outline" className="text-micro h-4 px-1.5 py-0 shrink-0">
              {urgency.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

function ExpiryAlertsCard({ count }: { count: number }) {
  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-status-warning-ink" aria-hidden="true" />
          Expiry Alerts
        </CardTitle>
        <CardAction>
          <Link
            href="/inventory/reports/expiry"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            View report <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-3">
        {count === 0 ? (
          <InventoryEmptyState
            compact
            title="No expiring lots"
            description="No lots expiring within the next 30 days."
          />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg border border-status-warning-rule bg-status-warning-surface p-3">
              <div className="h-2 w-2 rounded-full bg-status-warning-fill shrink-0" />
              <div className="flex-1">
                <p className="text-dense font-semibold text-foreground">
                  {count} lot{count !== 1 ? "s" : ""} expiring soon
                </p>
                <p className="text-dense text-muted-foreground">within the next 30 days</p>
              </div>
              <Link href="/inventory/expiry">
                <Badge
                  variant="outline"
                  className="text-micro h-5 cursor-pointer bg-status-warning-surface border-status-warning-rule text-status-warning-ink hover:bg-status-warning-surface transition-colors"
                >
                  View lots
                </Badge>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InventoryDashboardClient() {
  const canReadReports = useCan("inventory:reports:read");
  const canReadStock = useCan("inventory:stock:read");
  const canCreateProduct = useCan("inventory:products:create");
  const canImport = useCan("inventory:import");
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

  const hasAlerts =
    expiringLotsCount > 0 ||
    qualityHoldQty > 0 ||
    failedChannelSyncsCount > 0 ||
    openInspectionsCount > 0;

  const hasAnyData = !isKpiLoading && (totalSkus > 0 || totalOnHand > 0);

  function handleKpiRetry(): void {
    void dashRefetch();
  }

  /**
   * A6. "Denied" and "empty" are different facts.
   *
   * Every KPI on this page comes from `GET /inventory/reports/dashboard`, gated on
   * `inventory:reports:read`. Without that key the query never fires, so the numbers
   * are all zero — and the onboarding state below used to read that as "this company
   * has no inventory yet" and invite a stock reader to add their first product. It is
   * shown only to somebody who could have seen the data and genuinely has none.
   */
  if (!canReadReports && !canReadStock)
    return (
      <PageWrapper
        title="Inventory Dashboard"
        subtitle="Track stock levels, movements, and reorder alerts."
      >
        <NoPermissionState
          permission="inventory:reports:read"
          title="Dashboard unavailable"
          description="The inventory dashboard needs either inventory reporting or stock-level access."
          className="flex-1"
        />
      </PageWrapper>
    );

  if (canReadReports && !isKpiLoading && !kpiError && !hasAnyData) {
    return (
      <PageWrapper
        title="Inventory Dashboard"
        subtitle="Track stock levels, movements, and reorder alerts."
      >
        <InventoryEmptyState
          illustration={<EmptyProductsIllustration />}
          title="Set up your inventory"
          description="Add products, configure warehouses, and start tracking stock levels, movements, and reorder alerts — all in one place."
          action={
            canCreateProduct
              ? { label: "Add Your First Product", href: "/inventory/products/new" }
              : undefined
          }
          secondaryAction={
            canImport ? { label: "Import Products", href: "/inventory/import" } : undefined
          }
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Inventory Dashboard"
      subtitle="Track stock levels, movements, and reorder alerts."
      actions={canCreateProduct ? <AddProductLink /> : undefined}
    >
      <div className="space-y-4">
        {!canReadReports ? (
          <NoPermissionState
            compact
            permission="inventory:reports:read"
            title="Metrics hidden"
            description="Inventory totals, values and counts come from inventory reporting."
          />
        ) : isKpiLoading ? (
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
              tone="blue"
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
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2">
            <span className="text-dense font-semibold text-status-warning-ink shrink-0">Attention needed:</span>
            {expiringLotsCount > 0 && (
              <Link href="/inventory/expiry">
                <Badge variant="outline" className="bg-status-warning-surface border-status-warning-rule text-status-warning-ink text-micro h-5 cursor-pointer hover:bg-status-warning-surface transition-colors">
                  <Calendar className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                  {expiringLotsCount} expiring lot{expiringLotsCount !== 1 ? "s" : ""}
                </Badge>
              </Link>
            )}
            {qualityHoldQty > 0 && (
              <Link href="/inventory/stock">
                <Badge variant="outline" className="bg-status-warning-surface border-status-warning-rule text-status-warning-ink text-micro h-5 cursor-pointer hover:bg-status-warning-surface transition-colors">
                  <ShieldAlert className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                  {qualityHoldQty} on quality hold
                </Badge>
              </Link>
            )}
            {failedChannelSyncsCount > 0 && (
              <Link href="/inventory">
                <Badge variant="outline" className="bg-status-danger-surface border-status-danger-rule text-status-danger-ink text-micro h-5 cursor-pointer hover:bg-status-danger-surface transition-colors">
                  <AlertTriangle className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                  {failedChannelSyncsCount} failed sync{failedChannelSyncsCount !== 1 ? "s" : ""}
                </Badge>
              </Link>
            )}
            {openInspectionsCount > 0 && (
              <Link href="/inventory/stock">
                <Badge variant="outline" className="bg-status-info-surface border-status-info-rule text-status-info-ink text-micro h-5 cursor-pointer hover:bg-status-info-surface transition-colors">
                  <BookOpen className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                  {openInspectionsCount} open inspection{openInspectionsCount !== 1 ? "s" : ""}
                </Badge>
              </Link>
            )}
          </div>
        )}

        <InventoryAiBriefCard />

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
              {canReadStock ? (
                <RecentMovementsTable />
              ) : (
                <NoPermissionState
                  compact
                  permission="inventory:stock:read"
                  title="Movements hidden"
                  description="Stock movements need stock-level access."
                />
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-status-warning-ink" aria-hidden="true" />
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
              <LowStockAlertSection canReadReports={canReadReports} />
            </CardContent>
          </Card>
        </div>

        {canReadReports && !isKpiLoading && !kpiError && (
          <ExpiryAlertsCard count={expiringLotsCount} />
        )}

        <DashboardInsightsPanel />
      </div>
    </PageWrapper>
  );
}
