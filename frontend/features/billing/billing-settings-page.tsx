"use client";

import { useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, Receipt, Building2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import {
  ScrollArea,
  SCROLL_AREA_PAGE_BODY_CLASS,
} from "@/components/ui/scroll-area";
import { BillingPageSkeleton } from "@/features/billing/components/billing-page-skeleton";
import { PlanTab } from "@/features/billing/components/plan-tab";
import { PaymentsTab } from "@/features/billing/components/payments-tab";
import { BillingProfileTab } from "@/features/billing/components/billing-profile-tab";
import { resolveBillingTab } from "@/features/billing/billing-tabs";
import { cn } from "@/lib/utils";

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveBillingTab(searchParams.get("tab"));

  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "plan") params.delete("tab");
      else params.set("tab", tab);

      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <PageWrapper
      title="Billing & Plan"
      subtitle="Manage your subscription, payments, and billing details"
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden"
      >
        <TabsList className="mb-4 shrink-0">
          <TabsTrigger value="plan">
            <CreditCard
              className="h-3.5 w-3.5 max-sm:hidden"
              aria-hidden="true"
            />
            Plan
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Receipt className="h-3.5 w-3.5 max-sm:hidden" aria-hidden="true" />
            Invoices & Payments
          </TabsTrigger>
          <TabsTrigger value="profile">
            <Building2
              className="h-3.5 w-3.5 max-sm:hidden"
              aria-hidden="true"
            />
            Billing Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="plan"
          className={cn(
            TABS_CONTENT_PAGE_BODY_CLASS,
            "min-h-0 overflow-hidden",
          )}
        >
          <ScrollArea
            hideScrollbar
            className={cn(SCROLL_AREA_PAGE_BODY_CLASS, "h-full")}
          >
            <div className="pb-1">
              <PlanTab />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="payments"
          className={cn(
            TABS_CONTENT_PAGE_BODY_CLASS,
            "min-h-0 overflow-hidden",
          )}
        >
          <PaymentsTab />
        </TabsContent>

        <TabsContent
          value="profile"
          className={cn(
            TABS_CONTENT_PAGE_BODY_CLASS,
            "min-h-0 overflow-hidden",
          )}
        >
          <ScrollArea
            hideScrollbar
            className={cn(SCROLL_AREA_PAGE_BODY_CLASS, "h-full")}
          >
            <div className="pb-1">
              <BillingProfileTab />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

export function BillingSettingsPage() {
  return (
    <Suspense
      fallback={
        <PageWrapper
          title="Billing & Plan"
          subtitle="Manage your subscription, payments, and billing details"
          noInternalScroll
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          contentClassName="flex min-h-0 flex-1 flex-col"
        >
          <BillingPageSkeleton />
        </PageWrapper>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
