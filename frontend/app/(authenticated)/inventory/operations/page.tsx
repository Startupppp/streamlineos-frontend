"use client";

import Link from "next/link";
import { ArrowUpFromLine, ListChecks, PackagePlus, Package, Truck, RotateCcw } from "lucide-react";
import { PackageOpenIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { usePurchaseOrders } from "@/hooks/api/inventory";
import { useSalesOrders } from "@/hooks/api/inventory/sales-orders";
import {
  useVendorReturns,
  useCustomerReturns,
  CUSTOMER_RETURNS_PERMISSION,
  VENDOR_RETURNS_PERMISSION,
} from "@/hooks/api/inventory/returns";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

const PO_READ = "inventory:purchase-orders:read";
const SO_READ = "inventory:sales-orders:read";
const STOCK_READ = "inventory:stock:read";
const PACKAGES_MANAGE = "inventory:packages:manage";

interface HubCard {
  href: string;
  title: string;
  description: string;
  permission: string;
  Icon: React.ComponentType<{ className?: string }>;
}

/**
 * Every tile carries the exact key of the screen behind it.
 *
 * Frontend §17: a hub never renders a link that predictably ends at Access
 * Denied. These were unconditional, so a receiver with only
 * `purchase-orders:read` was offered six destinations and could open one.
 */
const STATIC_CARDS: HubCard[] = [
  {
    href: "/inventory/operations/issues",
    title: "Issues",
    description: "Outbound stock movements",
    permission: STOCK_READ,
    Icon: ArrowUpFromLine,
  },
  {
    href: "/inventory/operations/putaway",
    title: "Putaway",
    description: "Move deliveries from the dock to the shelves",
    permission: STOCK_READ,
    Icon: PackagePlus,
  },
  {
    href: "/inventory/operations/picking",
    title: "Picking",
    description: "Orders ready to pick",
    permission: SO_READ,
    Icon: ListChecks,
  },
  {
    href: "/inventory/operations/packing",
    title: "Packing",
    description: "Orders ready to pack",
    permission: PACKAGES_MANAGE,
    Icon: Package,
  },
  {
    href: "/inventory/operations/shipping",
    title: "Shipping",
    description: "Orders ready to ship",
    permission: SO_READ,
    Icon: Truck,
  },
  {
    href: "/inventory/operations/returns",
    title: "Returns",
    description: "Vendor and customer returns",
    permission: CUSTOMER_RETURNS_PERMISSION,
    Icon: RotateCcw,
  },
];

function ReceiptsCard() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Link href="/inventory/operations/receipts">
      <div
        {...hoverHandlers}
        className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow cursor-pointer h-full"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <PackageOpenIcon
            ref={iconRef}
            size={16}
            className="shrink-0 text-muted-foreground"
          />
          <span className="text-sm font-medium">Receipts</span>
        </div>
        <p className="text-xs text-muted-foreground">GRN history and PO receipts</p>
      </div>
    </Link>
  );
}

export default function OperationsHubPage() {
  const canReadPo = useCan(PO_READ);
  const canReadSo = useCan(SO_READ);
  const canReadStock = useCan(STOCK_READ);
  const canManagePackages = useCan(PACKAGES_MANAGE);
  const canSeeVendorReturns = useCan(VENDOR_RETURNS_PERMISSION);
  const canSeeCustomerReturns = useCan(CUSTOMER_RETURNS_PERMISSION);

  const poToReceive = usePurchaseOrders({ status: "SENT", pageSize: 1 });
  const soReserved = useSalesOrders({ status: "RESERVED", limit: 1 });
  const soPicked = useSalesOrders({ status: "PICKED", limit: 1 });
  const soPacked = useSalesOrders({ status: "PACKED", limit: 1 });
  const vendorDrafts = useVendorReturns({ status: "DRAFT", limit: 1 });
  const customerDrafts = useCustomerReturns({ status: "DRAFT", limit: 1 });

  const held: Record<string, boolean> = {
    [PO_READ]: canReadPo,
    [SO_READ]: canReadSo,
    [STOCK_READ]: canReadStock,
    [PACKAGES_MANAGE]: canManagePackages,
    [CUSTOMER_RETURNS_PERMISSION]: canSeeCustomerReturns,
  };
  const cards = STATIC_CARDS.filter((card) => held[card.permission]);

  const soToFulfilTotal = (soReserved.data?.total ?? 0) + (soPicked.data?.total ?? 0);
  const soToShipTotal = soPacked.data?.total ?? 0;
  const returnsTotal = (vendorDrafts.data?.total ?? 0) + (customerDrafts.data?.total ?? 0);
  const showReturnsTile = canSeeVendorReturns || canSeeCustomerReturns;

  const queries = [poToReceive, soReserved, soPicked, soPacked, vendorDrafts, customerDrafts];
  const failed = queries.find((query) => query.isError);
  const loading = queries.some((query) => query.isLoading);
  const statCount =
    Number(canReadPo) + Number(canReadSo) * 2 + Number(showReturnsTile);

  function handleRetry(): void {
    for (const query of queries) void query.refetch();
  }

  /*
   * G8 — the hub owes the same four answers as any other route.
   *
   * Denied comes first and is not the same as empty: someone whose only
   * inventory access is, say, valuation holds none of these keys, and the old
   * page showed them four zeroes and seven links that all end at Access Denied.
   * Every branch sits below the hooks, so hook order never depends on a
   * permission.
   */
  const canSeeAnything = canReadPo || canReadSo || canReadStock || showReturnsTile;

  return (
    <PageWrapper
      title="Operations"
      subtitle="Operational cockpit for daily inventory workflow"
      variant="default"
    >
      {!canSeeAnything ? (
        <NoPermissionState className="flex-1" permission={STOCK_READ} />
      ) : failed ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load the operations queues"
          description={getErrorMessage(failed.error)}
          onRetry={handleRetry}
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          {/*
            NEO-5. On a handheld this hub is the wrong screen: it is six tiles
            leading to six desktop tables. The RF queue is offered first, and only
            below `md`, because a supervisor on a laptop wants the cockpit and a
            picker on a scanner wants the next task. Offered rather than
            redirected - a tablet in a supervisor's hands is under `md` too, and
            taking the cockpit away from them would be deciding who they are from
            their screen width.
          */}
          {canReadStock && (
            <Link
              href="/inventory/rf"
              className="md:hidden flex items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <ListChecks className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">My tasks</span>
                <span className="block text-xs text-muted-foreground">
                  One task at a time, sized for a scanner
                </span>
              </span>
            </Link>
          )}
          {loading ? (
            <StatCardGridSkeleton cols={4} count={Math.max(1, statCount)} />
          ) : (
            <StatCardGrid cols={4}>
              {canReadPo ? (
                <StatCard
                  label="POs to Receive"
                  value={poToReceive.data?.total ?? 0}
                  tone="amber"
                  href="/inventory/operations/receipts"
                />
              ) : null}
              {canReadSo ? (
                <StatCard
                  label="SOs to Fulfil"
                  value={soToFulfilTotal}
                  tone="blue"
                  href="/inventory/operations/picking"
                />
              ) : null}
              {canReadSo ? (
                <StatCard
                  label="Orders to Ship"
                  value={soToShipTotal}
                  tone="emerald"
                  href="/inventory/operations/shipping"
                />
              ) : null}
              {showReturnsTile ? (
                <StatCard
                  label="Open Returns"
                  value={returnsTotal}
                  tone="red"
                  href="/inventory/operations/returns"
                />
              ) : null}
            </StatCardGrid>
          )}

          {cards.length === 0 && !canReadPo ? (
            <EmptyState
              className="flex-1 min-h-0"
              illustration={<EmptyWarehouseIllustration />}
              title="No operations surfaces are open to you"
              description="Your access covers inventory, but none of the daily operations queues. Ask an administrator for receiving, picking or returns access."
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {canReadPo ? <ReceiptsCard /> : null}
              {cards.map(({ href, title, description, Icon }) => (
                <Link key={href} href={href}>
                  <div className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">{title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
