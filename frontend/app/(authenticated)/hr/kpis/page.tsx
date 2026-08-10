"use client";

import { AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KpiLibraryTab } from "@/features/hr/kpis/kpi-library-tab";
import { CompetencyFrameworksTab } from "@/features/hr/kpis/competency-frameworks-tab";

export default function KpisPage() {
  return (
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
  );
}
