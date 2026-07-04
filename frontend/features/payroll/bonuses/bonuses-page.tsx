"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BonusesTab } from "./bonuses-tab";
import { IncentivesTab } from "./incentives-tab";

export function BonusesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("tab") ?? "bonuses";

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <PageWrapper
      title="Bonuses & Incentives"
      eyebrow="Payroll"
      subtitle="Manage variable pay and sales commissions"
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-700">
          Approved bonuses are included in the payroll run for the selected month.
        </div>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="h-8">
            <TabsTrigger value="bonuses" className="text-xs h-7">
              Bonuses
            </TabsTrigger>
            <TabsTrigger value="incentives" className="text-xs h-7">
              Incentives
            </TabsTrigger>
          </TabsList>
          <TabsContent value="bonuses">
            <BonusesTab />
          </TabsContent>
          <TabsContent value="incentives">
            <IncentivesTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
