"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, GitBranch } from "lucide-react";
import { PositionsTable } from "./positions-table";
import { ReorgScenariosTab } from "./reorg-scenarios-tab";

export function PositionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "positions";

  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "positions") params.delete("tab");
      else params.set("tab", tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="positions" className="text-xs gap-1.5">
          <Briefcase className="h-3.5 w-3.5" />
          Positions
        </TabsTrigger>
        <TabsTrigger value="scenarios" className="text-xs gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          Reorg Scenarios
        </TabsTrigger>
      </TabsList>

      <TabsContent value="positions" className="mt-4">
        <PositionsTable />
      </TabsContent>
      <TabsContent value="scenarios" className="mt-4">
        <ReorgScenariosTab />
      </TabsContent>
    </Tabs>
  );
}
