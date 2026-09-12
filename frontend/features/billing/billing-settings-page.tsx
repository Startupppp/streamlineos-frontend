"use client";

import { useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, Receipt, Building2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { BillingPageSkeleton } from "@/features/billing/components/billing-page-skeleton";
import { PlanTab } from "@/features/billing/components/plan-tab";
import { PaymentsTab } from "@/features/billing/components/payments-tab";
import { BillingProfileTab } from "@/features/billing/components/billing-profile-tab";
import { resolveBillingTab } from "@/features/billing/billing-tabs";

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveBillingTab(searchParams.get("tab"));

  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "plan") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <PageWrapper
      title="Billing & Plan"
      subtitle="Manage your subscription, payments, and billing details"
    >
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex flex-col flex-1 min-h-0 gap-0"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="plan">
            <CreditCard className="h-3.5 w-3.5" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Receipt className="h-3.5 w-3.5" />
            Invoices & Payments
          </TabsTrigger>
          <TabsTrigger value="profile">
            <Building2 className="h-3.5 w-3.5" />
            Billing Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <PlanTab />
        </TabsContent>

        <TabsContent value="payments" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <PaymentsTab />
        </TabsContent>

        <TabsContent value="profile" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <BillingProfileTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

export function BillingSettingsPage() {
  return (
    <Suspense
      fallback={
        <PageWrapper title="Billing & Plan" subtitle="Manage your subscription, payments, and billing details">
          <BillingPageSkeleton />
        </PageWrapper>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
