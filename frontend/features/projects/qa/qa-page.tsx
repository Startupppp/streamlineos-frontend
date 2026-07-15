"use client";

import { useCallback, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  PmPageShell,
  PmPanel,
  PmSection,
} from "@/features/projects/shared/pm-chrome";
import { TestCasesTab } from "./test-cases-tab";
import { TestRunsTab } from "./test-runs-tab";

interface QaPageProps {
  projectId: number;
}

export function QaPage({ projectId }: QaPageProps) {
  const [tab, setTab] = useState<"cases" | "runs">("cases");

  const handleTabChange = useCallback((value: string) => {
    if (value === "cases" || value === "runs") setTab(value);
  }, []);

  return (
    <PageWrapper
      title="QA / Tests"
      subtitle="Test cases, suites, and execution runs"
    >
      <PmPageShell>
        <Tabs value={tab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col gap-3">
          <PmSection index={0}>
            <TabsList>
              <TabsTrigger value="cases">Test Cases</TabsTrigger>
              <TabsTrigger value="runs">Test Runs</TabsTrigger>
            </TabsList>
          </PmSection>

          <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
            <TabsContent value="cases" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
              <PmPanel className="flex min-h-0 flex-1 flex-col p-3 sm:p-3.5">
                <TestCasesTab projectId={projectId} />
              </PmPanel>
            </TabsContent>
            <TabsContent value="runs" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
              <PmPanel className="flex min-h-0 flex-1 flex-col p-3 sm:p-3.5">
                <TestRunsTab projectId={projectId} />
              </PmPanel>
            </TabsContent>
          </PmSection>
        </Tabs>
      </PmPageShell>
    </PageWrapper>
  );
}
