"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxWindowsTab } from "./tax-windows-tab";
import { DeclarationsTab } from "./declarations-tab";
import { StatutoryOverviewTab } from "./statutory-overview-tab";
import { TaxReportTab } from "./tax-report-tab";
import { FilingsTab } from "./filings-tab";

export function TaxesPageContent() {
  return (
    <PageWrapper
      title="Tax & Statutory"
      subtitle="Manage declaration windows and employee tax declarations"
    >
      <Tabs defaultValue="windows" className="flex flex-1 min-h-0 flex-col gap-2">
        <TabsList>
          <TabsTrigger value="windows">Declaration Windows</TabsTrigger>
          <TabsTrigger value="declarations">Declarations</TabsTrigger>
          <TabsTrigger value="statutory">Statutory</TabsTrigger>
          <TabsTrigger value="filings">Filings</TabsTrigger>
          <TabsTrigger value="report">Tax Report</TabsTrigger>
        </TabsList>
        <TabsContent value="windows" className="flex flex-1 min-h-0 flex-col mt-0">
          <TaxWindowsTab />
        </TabsContent>
        <TabsContent value="declarations" className="flex flex-1 min-h-0 flex-col mt-0">
          <DeclarationsTab />
        </TabsContent>
        <TabsContent value="statutory" className="mt-0">
          <StatutoryOverviewTab />
        </TabsContent>
        <TabsContent value="filings" className="flex flex-1 min-h-0 flex-col mt-0">
          <FilingsTab />
        </TabsContent>
        <TabsContent value="report" className="flex flex-1 min-h-0 flex-col mt-0">
          <TaxReportTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
