"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { AnomalyQueuePanel } from "./anomaly-queue-panel";
import { DemandRiskPanel } from "./demand-risk-panel";
import { InventoryCopilotPanel } from "./inventory-copilot-panel";
import { ReportBuilderPanel } from "./report-builder-panel";

export function InventoryAiClient() {
  const canRead = useCan("inventory:ai:read");

  if (!canRead) {
    return (
      <PageWrapper title="Inventory AI">
        <NoPermissionState
          permission="inventory:ai:read"
          className="flex-1"
          title="AI surfaces hidden"
          description="The AI-assisted inventory surfaces are gated on their own read permission, separately from the inventory module."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Inventory AI"
      subtitle="Every figure on these screens is computed by the inventory engine. The model narrates and selects; it never supplies a number and never writes stock."
    >
      <Tabs defaultValue="anomalies" className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList>
          <TabsTrigger value="anomalies">Anomaly queue</TabsTrigger>
          <TabsTrigger value="demand-risk">Demand risk</TabsTrigger>
          <TabsTrigger value="copilot">Ask</TabsTrigger>
          <TabsTrigger value="report-builder">Report builder</TabsTrigger>
        </TabsList>

        <TabsContent value="anomalies" className="min-h-0 flex-1">
          <AnomalyQueuePanel />
        </TabsContent>

        <TabsContent value="demand-risk" className="min-h-0 flex-1">
          <DemandRiskPanel />
        </TabsContent>

        <TabsContent value="copilot" className="flex min-h-0 flex-1 flex-col">
          <InventoryCopilotPanel />
        </TabsContent>

        <TabsContent value="report-builder" className="flex min-h-0 flex-1 flex-col">
          <ReportBuilderPanel />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
