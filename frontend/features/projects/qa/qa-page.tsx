"use client";

import { useCallback, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";
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
      eyebrow="Quality"
      title="QA / Tests"
      subtitle="Test cases, suites, and execution runs"
    >
      <PmPageShell>
        <Tabs value={tab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col gap-3">
          <PmSection index={0}>
            <div className={cn(PM_TOOLBAR, "w-fit p-1")}>
              <TabsList className="h-8 bg-transparent p-0">
                <TabsTrigger value="cases" className="h-7 px-3 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-foreground">
                  Test Cases
                </TabsTrigger>
                <TabsTrigger value="runs" className="h-7 px-3 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-foreground">
                  Test Runs
                </TabsTrigger>
              </TabsList>
            </div>
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
