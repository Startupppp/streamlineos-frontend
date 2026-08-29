"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { AnomalyQueuePanel } from "./anomaly-queue-panel";
import { DemandRiskPanel } from "./demand-risk-panel";
import { InventoryCopilotPanel } from "./inventory-copilot-panel";

/**
 * F3/F6 — one place the inventory AI surfaces actually live.
 *
 * Until this page existed the copilot was written and mounted nowhere: it
 * compiled, it had tests, and no route reached it. A surface nobody can open is
 * not shipped, so it is mounted here beside the two F3 surfaces it belongs with.
 *
 * The gate is the same key on every tab, and it is checked here as well as
 * inside each panel. That is not redundant — the panel-level checks are what
 * keep a panel safe when it is embedded on a dashboard, and this one is what
 * stops the whole page rendering an empty shell of tabs to somebody who holds
 * nothing.
 */
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
      </Tabs>
    </PageWrapper>
  );
}
