"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { NoPermissionState } from "@/components/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { Tabs, TabsContent, TabsList, TabsTrigger, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import {
  CUSTOMER_RETURNS_PERMISSION,
  VENDOR_RETURNS_PERMISSION,
  type ReturnStatus,
} from "@/hooks/api/inventory/returns";
import { VendorReturnSheet } from "@/features/inventory/components/operations/vendor-return-sheet";
import { CustomerReturnSheet } from "@/features/inventory/components/operations/customer-return-sheet";
import { VendorReturnsTable } from "@/features/inventory/components/operations/vendor-returns-table";
import { CustomerReturnsTable } from "@/features/inventory/components/operations/customer-returns-table";

const PAGE_LIMIT = 20;

/**
 * Status is a Select, not more Tabs triggers: the two Tabs this page has are
 * content categories, and a status filter built from them is AP-2. The first
 * option is an "all" sentinel that *removes* the query param rather than
 * setting it to "all" (§9).
 */
const RETURN_STATUSES: ReturnStatus[] = ["DRAFT", "APPROVED", "POSTED", "CANCELLED"];

const RETURN_STATUS_FILTER_LABEL: Readonly<Record<ReturnStatus, string>> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
};

function parseStatus(value: string | null): ReturnStatus | undefined {
  return RETURN_STATUSES.find((status) => status === value);
}

function ReturnsPageInner() {
  const canVendor = useCan(VENDOR_RETURNS_PERMISSION);
  const canCustomer = useCan(CUSTOMER_RETURNS_PERMISSION);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vendorSheetOpen, setVendorSheetOpen] = useState(false);
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);

  const tab = searchParams.get("tab") === "customer" ? "customer" : "vendor";
  const status = parseStatus(searchParams.get("status"));
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  function updateParams(updates: Record<string, string | null>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    // Any filter or tab change resets the page, or page 3 of one view becomes
    // an empty page 3 of another.
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleStatusChange(value: string): void {
    updateParams({ status: value === "all" ? null : value });
  }

  function handleTabChange(value: string): void {
    updateParams({ tab: value === "vendor" ? null : value });
  }

  function handlePageChange(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleOpenVendorSheet(): void {
    setVendorSheetOpen(true);
  }

  function handleOpenCustomerSheet(): void {
    setCustomerSheetOpen(true);
  }

  return (
    <PageWrapper
      title="Returns"
      subtitle="Goods coming back, in both directions — inspected, approved, then posted"
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <Select value={status ?? "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-44")}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="all">All statuses</SelectItem>
              {RETURN_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {RETURN_STATUS_FILTER_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <Tabs value={tab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="vendor">Vendor Returns</TabsTrigger>
            <TabsTrigger value="customer">Customer Returns</TabsTrigger>
          </TabsList>

          {/*
            Only the open tab is mounted, which is also the query gate: two
            tables both fetching on every visit would double the load for a page
            where one of them is always hidden.
          */}
          <TabsContent value="vendor" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            {!canVendor ? (
              <NoPermissionState permission={VENDOR_RETURNS_PERMISSION} />
            ) : (
              <>
                <div className="mb-3 flex justify-end">
                  <Button size="sm" onClick={handleOpenVendorSheet}>
                    New Vendor Return
                  </Button>
                </div>
                <VendorReturnsTable
                  status={status}
                  page={page}
                  pageSize={PAGE_LIMIT}
                  onPageChange={handlePageChange}
                  onCreate={handleOpenVendorSheet}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="customer" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            {!canCustomer ? (
              <NoPermissionState permission={CUSTOMER_RETURNS_PERMISSION} />
            ) : (
              <>
                <div className="mb-3 flex justify-end">
                  <Button size="sm" onClick={handleOpenCustomerSheet}>
                    New Customer Return
                  </Button>
                </div>
                <CustomerReturnsTable
                  status={status}
                  page={page}
                  pageSize={PAGE_LIMIT}
                  onPageChange={handlePageChange}
                  onCreate={handleOpenCustomerSheet}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <VendorReturnSheet open={vendorSheetOpen} onOpenChange={setVendorSheetOpen} />
      <CustomerReturnSheet open={customerSheetOpen} onOpenChange={setCustomerSheetOpen} />
    </PageWrapper>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={null}>
      <ReturnsPageInner />
    </Suspense>
  );
}
