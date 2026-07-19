"use client";

import Link from "next/link";
import { ArrowUpFromLine, ListChecks, Package, Truck, RotateCcw } from "lucide-react";
import { PackageOpenIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { usePurchaseOrders } from "@/hooks/api/inventory";
import { useSalesOrders } from "@/hooks/api/inventory/sales-orders";
import {
  useVendorReturns,
  useCustomerReturns,
} from "@/hooks/api/inventory/operations";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

interface StaticHubCard {
  href: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const STATIC_CARDS: StaticHubCard[] = [
  {
    href: "/inventory/operations/issues",
    title: "Issues",
    description: "Outbound stock movements",
    Icon: ArrowUpFromLine,
  },
  {
    href: "/inventory/operations/picking",
    title: "Picking",
    description: "Orders ready to pick",
    Icon: ListChecks,
  },
  {
    href: "/inventory/operations/packing",
    title: "Packing",
    description: "Orders ready to pack",
    Icon: Package,
  },
  {
    href: "/inventory/operations/shipping",
    title: "Shipping",
    description: "Orders ready to ship",
    Icon: Truck,
  },
  {
    href: "/inventory/operations/returns",
    title: "Returns",
    description: "Vendor and customer returns",
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
  const poToReceive = usePurchaseOrders({ status: "SENT", pageSize: 1 });
  const soReserved = useSalesOrders({ status: "RESERVED", limit: 1 });
  const soPicked = useSalesOrders({ status: "PICKED", limit: 1 });
  const soPacked = useSalesOrders({ status: "PACKED", limit: 1 });
  const vendorDrafts = useVendorReturns({ status: "DRAFT", pageSize: 1 });
  const customerDrafts = useCustomerReturns({ status: "DRAFT", pageSize: 1 });

  const soToFulfilTotal =
    (soReserved.data?.total ?? 0) + (soPicked.data?.total ?? 0);

  const soToShipTotal = soPacked.data?.total ?? 0;

  const returnsTotal =
    (vendorDrafts.data?.total ?? 0) + (customerDrafts.data?.total ?? 0);

  return (
    <PageWrapper
      title="Operations"
      subtitle="Operational cockpit for daily inventory workflow"
      variant="default"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGrid cols={4}>
          <StatCard
            label="POs to Receive"
            value={poToReceive.data?.total ?? 0}
            tone="amber"
            href="/inventory/operations/receipts"
            isLoading={poToReceive.isLoading}
          />
          <StatCard
            label="SOs to Fulfil"
            value={soToFulfilTotal}
            tone="blue"
            href="/inventory/operations/picking"
            isLoading={soReserved.isLoading || soPicked.isLoading}
          />
          <StatCard
            label="Orders to Ship"
            value={soToShipTotal}
            tone="emerald"
            href="/inventory/operations/shipping"
            isLoading={soPacked.isLoading}
          />
          <StatCard
            label="Open Returns"
            value={returnsTotal}
            tone="red"
            href="/inventory/operations/returns"
            isLoading={vendorDrafts.isLoading || customerDrafts.isLoading}
          />
        </StatCardGrid>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <ReceiptsCard />
          {STATIC_CARDS.map(({ href, title, description, Icon }) => (
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
      </div>
    </PageWrapper>
  );
}
