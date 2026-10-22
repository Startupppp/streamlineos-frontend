import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrKpis } from "@/lib/prefetch/hr-talent";
import { AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KpiLibraryTab } from "@/features/hr/kpis/kpi-library-tab";
import { CompetencyFrameworksTab } from "@/features/hr/kpis/competency-frameworks-tab";
import KpisLoading from "./loading";

async function KpisHydrated() {
  await requirePermission("hr:performance:view");
  const state = await prefetchHrKpis();
  return (
    <HydrationBoundary state={state}>
      <PageWrapper title="KPIs & Competencies" subtitle="Define performance indicators and competency frameworks">
        <Tabs defaultValue="kpis">
          <TabsList className="bg-card/80 border-border/80">
            <TabsTrigger value="kpis">KPI Library</TabsTrigger>
            <TabsTrigger value="frameworks">Competency Frameworks</TabsTrigger>
          </TabsList>
          <AnimatePresence mode="wait">
            <TabsContent value="kpis" className="mt-6">
              <KpiLibraryTab />
            </TabsContent>
            <TabsContent value="frameworks" className="mt-6">
              <CompetencyFrameworksTab />
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </PageWrapper>
    </HydrationBoundary>
  );
}

export default function KpisPage() {
  return (
    <Suspense fallback={<KpisLoading />}>
      <KpisHydrated />
    </Suspense>
  );
}
