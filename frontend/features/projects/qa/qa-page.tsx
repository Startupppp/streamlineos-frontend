"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { TestCasesTab } from "./test-cases-tab";
import { TestRunsTab } from "./test-runs-tab";

interface QaPageProps {
  projectId: number;
}

export function QaPage({ projectId }: QaPageProps) {
  const [tab, setTab] = useState<"cases" | "runs">("cases");

  return (
    <PageWrapper
      eyebrow="Quality"
      title="QA / Tests"
      subtitle="Test cases and runs"
    >
      <div className="px-4 pb-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "cases" | "runs")}>
          <TabsList className="mb-3">
            <TabsTrigger value="cases">Test Cases</TabsTrigger>
            <TabsTrigger value="runs">Test Runs</TabsTrigger>
          </TabsList>
          <TabsContent value="cases">
            <TestCasesTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="runs">
            <TestRunsTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
