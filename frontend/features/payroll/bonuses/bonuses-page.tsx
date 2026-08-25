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
      subtitle="Manage variable pay and sales commissions"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Approved bonuses are included in the payroll run for the selected month.
        </div>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-1 min-h-0 flex-col">
          <TabsList>
            <TabsTrigger value="bonuses">
              Bonuses
            </TabsTrigger>
            <TabsTrigger value="incentives">
              Incentives
            </TabsTrigger>
          </TabsList>
          <TabsContent value="bonuses" className="flex flex-1 min-h-0 flex-col mt-0">
            <BonusesTab />
          </TabsContent>
          <TabsContent value="incentives" className="flex flex-1 min-h-0 flex-col mt-0">
            <IncentivesTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
