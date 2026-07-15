"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";
import { PolicySimulator } from "./policy-simulator";
import { LeaveSimulator } from "./leave-simulator";
import { ApprovalSimulator } from "./approval-simulator";
import { PayrollSimulator } from "./payroll-simulator";
import { CompareSimulator } from "./compare-simulator";
import { SimulationHistory } from "./simulation-history";

export function SimulatorPageContent() {
  const [activeTab, setActiveTab] = useState("policy");

  return (
    <PageWrapper
      title="HR Simulator"
      subtitle="Model scenarios without affecting production records"
      badge={
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30 flex items-center gap-1">
          <FlaskConical className="h-3 w-3" />
          Simulation Mode
        </Badge>
      }
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300 mb-4 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span><strong>Simulation — no records changed.</strong> Results are modeled projections only and do not modify any production data.</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 bg-transparent border-b border-border rounded-none p-0 gap-0 w-full justify-start overflow-x-auto flex-nowrap scrollbar-none shrink-0">
          <TabsTrigger value="policy" className="text-xs px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground hover:text-foreground whitespace-nowrap">Policy</TabsTrigger>
          <TabsTrigger value="leave" className="text-xs px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground hover:text-foreground whitespace-nowrap">Leave Balance</TabsTrigger>
          <TabsTrigger value="approval" className="text-xs px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground hover:text-foreground whitespace-nowrap">Approval Routing</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground hover:text-foreground whitespace-nowrap">Payroll Impact</TabsTrigger>
          <TabsTrigger value="compare" className="text-xs px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground hover:text-foreground whitespace-nowrap">Compare</TabsTrigger>
          <TabsTrigger value="history" className="text-xs px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground hover:text-foreground whitespace-nowrap">History</TabsTrigger>
        </TabsList>

        <TabsContent value="policy"><PolicySimulator /></TabsContent>
        <TabsContent value="leave"><LeaveSimulator /></TabsContent>
        <TabsContent value="approval"><ApprovalSimulator /></TabsContent>
        <TabsContent value="payroll"><PayrollSimulator /></TabsContent>
        <TabsContent value="compare"><CompareSimulator /></TabsContent>
        <TabsContent value="history"><SimulationHistory /></TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
