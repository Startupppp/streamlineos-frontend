"use client";

import { useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, Receipt, Building2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanTab } from "@/features/billing/components/plan-tab";
import { PaymentsTab } from "@/features/billing/components/payments-tab";
import { BillingProfileTab } from "@/features/billing/components/billing-profile-tab";

type BillingTab = "plan" | "payments" | "profile";

const VALID_TABS: BillingTab[] = ["plan", "payments", "profile"];

function resolveTab(raw: string | null): BillingTab {
  if (raw && (VALID_TABS as string[]).includes(raw)) return raw as BillingTab;
  return "plan";
}

const TAB_TRIGGER_CLASS =
  "h-7 rounded-md px-3 text-sm font-medium gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none text-muted-foreground hover:text-foreground transition-colors duration-200";

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveTab(searchParams.get("tab"));

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
        <TabsList className="h-9 w-full items-center gap-1 rounded-lg border border-border bg-card p-1 overflow-x-auto scrollbar-hide sm:w-fit justify-start shrink-0 mb-4">
          <TabsTrigger value="plan" className={TAB_TRIGGER_CLASS}>
            <CreditCard className="h-3.5 w-3.5" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="payments" className={TAB_TRIGGER_CLASS}>
            <Receipt className="h-3.5 w-3.5" />
            Invoices & Payments
          </TabsTrigger>
          <TabsTrigger value="profile" className={TAB_TRIGGER_CLASS}>
            <Building2 className="h-3.5 w-3.5" />
            Billing Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="flex-1 min-h-0 mt-0 overflow-y-auto">
          <PlanTab />
        </TabsContent>

        <TabsContent value="payments" className="flex-1 min-h-0 mt-0 overflow-y-auto">
          <PaymentsTab />
        </TabsContent>

        <TabsContent value="profile" className="flex-1 min-h-0 mt-0 overflow-y-auto">
          <BillingProfileTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <PageWrapper title="Billing & Plan" subtitle="Manage your subscription, payments, and billing details">
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </PageWrapper>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
