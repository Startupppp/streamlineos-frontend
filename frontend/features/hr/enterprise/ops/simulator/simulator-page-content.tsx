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
        <Badge variant="outline" className="text-xs bg-status-warning-surface text-status-warning-ink border-status-warning-rule flex items-center gap-1">
          <FlaskConical className="h-3 w-3" />
          Simulation Mode
        </Badge>
      }
    >
      <div className="rounded-xl border border-status-warning-rule bg-status-warning-surface px-4 py-2.5 text-sm text-status-warning-ink mb-4 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span><strong>Simulation — no records changed.</strong> Results are modeled projections only and do not modify any production data.</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="policy">Policy</TabsTrigger>
          <TabsTrigger value="leave">Leave Balance</TabsTrigger>
          <TabsTrigger value="approval">Approval Routing</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Impact</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
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
