"use client";

import Link from "next/link";
import {
  PackageCheck,
  ArrowUpFromLine,
  ListChecks,
  Package,
  Truck,
  RotateCcw,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { usePurchaseOrders } from "@/hooks/api/inventory";
import { useSalesOrders } from "@/hooks/api/inventory/sales-orders";
import {
  useGoodsReceipts,
  useVendorReturns,
  useCustomerReturns,
} from "@/hooks/api/inventory/operations";

const QUICK_LINKS = [
  {
    href: "/inventory/operations/receipts",
    title: "Receipts",
    description: "GRN history and PO receipts",
    Icon: PackageCheck,
  },
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
] as const;

export default function OperationsHubPage() {
  const poToReceive = usePurchaseOrders({ status: "SENT", pageSize: 1 });
  const soReserved = useSalesOrders({ status: "RESERVED", limit: 1 });
  const soPicked = useSalesOrders({ status: "PICKED", limit: 1 });
  const soPacked = useSalesOrders({ status: "PACKED", limit: 1 });
  const vendorDrafts = useVendorReturns({ status: "DRAFT", pageSize: 1 });
  const customerDrafts = useCustomerReturns({ status: "DRAFT", pageSize: 1 });
  const openGrns = useGoodsReceipts({ pageSize: 1 });

  const soFulfillmentTotal =
    (soReserved.data?.total ?? 0) +
    (soPicked.data?.total ?? 0) +
    (soPacked.data?.total ?? 0);

  const returnsTotal =
    (vendorDrafts.data?.total ?? 0) + (customerDrafts.data?.total ?? 0);

  const isLoadingPo = poToReceive.isLoading;
  const isLoadingSo = soReserved.isLoading || soPicked.isLoading || soPacked.isLoading;
  const isLoadingReturns = vendorDrafts.isLoading || customerDrafts.isLoading;
  const isLoadingGrns = openGrns.isLoading;

  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Operations"
      subtitle="Operational cockpit for daily inventory workflow"
      variant="default"
    >
      <div className="space-y-4">
        <StatCardGrid cols={4}>
          <StatCard
            label="POs to Receive"
            value={poToReceive.data?.total ?? 0}
            tone="amber"
            href="/inventory/operations/receipts"
            isLoading={isLoadingPo}
          />
          <StatCard
            label="SOs to Fulfil"
            value={soFulfillmentTotal}
            tone="blue"
            href="/inventory/operations/picking"
            isLoading={isLoadingSo}
          />
          <StatCard
            label="Open Returns"
            value={returnsTotal}
            tone="red"
            href="/inventory/operations/returns"
            isLoading={isLoadingReturns}
          />
          <StatCard
            label="Recent GRNs"
            value={openGrns.data?.total ?? 0}
            tone="emerald"
            href="/inventory/operations/receipts"
            isLoading={isLoadingGrns}
          />
        </StatCardGrid>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_LINKS.map(({ href, title, description, Icon }) => (
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
