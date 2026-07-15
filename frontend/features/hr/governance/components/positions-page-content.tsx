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
      <TabsList className="bg-transparent border-b border-border rounded-none p-0 gap-0 w-full justify-start overflow-x-auto flex-nowrap scrollbar-none">
        <TabsTrigger
          value="positions"
          className="text-xs gap-1.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition-colors duration-200 whitespace-nowrap"
        >
          <Briefcase className="h-3.5 w-3.5" />
          Positions
        </TabsTrigger>
        <TabsTrigger
          value="scenarios"
          className="text-xs gap-1.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition-colors duration-200 whitespace-nowrap"
        >
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
