"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxWindowsTab } from "./tax-windows-tab";
import { DeclarationsTab } from "./declarations-tab";
import { StatutoryOverviewTab } from "./statutory-overview-tab";
import { TaxReportTab } from "./tax-report-tab";

export function TaxesPageContent() {
  return (
    <PageWrapper
      title="Tax & Statutory"
      eyebrow="Payroll"
      subtitle="Manage declaration windows and employee tax declarations"
    >
      <Tabs defaultValue="windows" className="flex flex-col gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="windows">Declaration Windows</TabsTrigger>
          <TabsTrigger value="declarations">Declarations</TabsTrigger>
          <TabsTrigger value="statutory">Statutory</TabsTrigger>
          <TabsTrigger value="report">Tax Report</TabsTrigger>
        </TabsList>
        <TabsContent value="windows">
          <TaxWindowsTab />
        </TabsContent>
        <TabsContent value="declarations">
          <DeclarationsTab />
        </TabsContent>
        <TabsContent value="statutory">
          <StatutoryOverviewTab />
        </TabsContent>
        <TabsContent value="report">
          <TaxReportTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
